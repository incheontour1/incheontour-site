/* ============================================================
   /api/store — shared data for 알림마당 (Vercel Function, Node.js)
   Storage: Upstash Redis (Vercel Marketplace) via REST — no npm packages.
     env: KV_REST_API_URL + KV_REST_API_TOKEN  (or UPSTASH_REDIS_REST_URL/_TOKEN, or <PREFIX>_KV_REST_API_URL/_TOKEN)
   Admin writes: env ADMIN_PASSWORD (header x-admin-key). Writes are refused until it is set.

   GET  /api/store?k=posts     public  → { configured, data:{notice,press}|null }
   PUT  /api/store?k=posts     admin   ← { notice:[…], press:[…] }
   POST /api/store?k=inquiry   public  ← { name,email,phone,type,subject,msg,lang,agree, website(honeypot) }
   GET  /api/store?k=inquiry   admin   → { data:[…] }
   PUT  /api/store?k=inquiry   admin   ← [ …full list… ] (status change / delete)
   POST /api/store?k=auth      admin   → 200 ok | 401
   GET  /api/store?k=og&url=   admin   → { ok, url, title, desc, image, site, date }  (news link preview)
   ============================================================ */
const crypto = require('crypto');

function envPair() {
  const e = process.env;
  if (e.KV_REST_API_URL && e.KV_REST_API_TOKEN) return [e.KV_REST_API_URL, e.KV_REST_API_TOKEN];
  if (e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN) return [e.UPSTASH_REDIS_REST_URL, e.UPSTASH_REDIS_REST_TOKEN];
  // any custom prefix from the Vercel integration: <PREFIX>_KV_REST_API_URL, <PREFIX>_REST_API_URL, <PREFIX>_UPSTASH_REDIS_REST_URL …
  const k = Object.keys(e).find(x => /REST_API_URL$/.test(x) || /UPSTASH_REDIS_REST_URL$/.test(x));
  if (k) { const t = k.replace(/URL$/, 'TOKEN'); if (e[t] && /^https:\/\//.test(e[k])) return [e[k], e[t]]; }
  return null;
}
async function redis(cmd) {
  const p = envPair(); if (!p) throw Object.assign(new Error('storage not configured'), { code: 503 });
  const r = await fetch(p[0], { method: 'POST', headers: { Authorization: `Bearer ${p[1]}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw Object.assign(new Error(j.error || 'storage error'), { code: 502 });
  return j.result;
}
const KEY = { posts: 'itc:posts:v1', inq: 'itc:inquiries:v1' };
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
function isAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD; const given = req.headers['x-admin-key'];
  if (!pw || !given) return false;
  return crypto.timingSafeEqual(sha(pw), sha(given));
}
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((ok, bad) => { let d = ''; req.on('data', c => { d += c; if (d.length > 600000) { bad(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { bad(Object.assign(new Error('bad json'), { code: 400 })); } }); });
}
const httpUrl = v => { const x = clean(v, 800); return /^https?:\/\//i.test(x) ? x : ''; };
function validPosts(b) {
  if (!b || !Array.isArray(b.notice) || !Array.isArray(b.press)) return null;
  const fix = p => ({ id: clean(p.id, 40), date: clean(p.date, 10), pinned: !!p.pinned, views: +p.views || 0, src: clean(p.src, 120), url: httpUrl(p.url), img: httpUrl(p.img),
    title: Object.fromEntries(Object.entries(p.title || {}).map(([k, v]) => [clean(k, 5), clean(v, 300)])),
    body: Object.fromEntries(Object.entries(p.body || {}).map(([k, v]) => [clean(k, 5), clean(v, 20000)])) });
  if (b.notice.length > 300 || b.press.length > 300) return null;
  return { notice: b.notice.map(fix), press: b.press.map(fix), updated: new Date().toISOString() };
}


/* ---------- link preview (press): fetch Open Graph metadata of a news URL — admin only ---------- */
const dns = require('dns').promises;
const net = require('net');
function privateIp(ip) {
  if (net.isIPv6(ip)) { const v = ip.toLowerCase(); if (v.startsWith('::ffff:')) return privateIp(v.slice(7)); return v === '::1' || v === '::' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v); }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function safeUrl(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (u.port && !['80', '443', ''].includes(u.port)) return null;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null;
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some(x => privateIp(x.address))) return null;
  return u;
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—' };
const decodeEnt = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
function metaMap(html) {
  const out = {};
  const head = html.slice(0, 400000);
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]; const attr = n => { const r = new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return r ? (r[2] ?? r[3] ?? r[4] ?? '') : null; };
    const key = (attr('property') || attr('name') || attr('itemprop') || '').toLowerCase(); const val = attr('content');
    if (key && val != null && !(key in out)) out[key] = decodeEnt(val).trim();
  }
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head); if (t) out._title = decodeEnt(t[1]).replace(/\s+/g, ' ').trim();
  const c = /<link\b[^>]*rel=["']?canonical["']?[^>]*>/i.exec(head); if (c) { const h = /href\s*=\s*["']([^"']+)/i.exec(c[0]); if (h) out._canonical = decodeEnt(h[1]); }
  return out;
}
async function fetchPage(u) {
  let cur = u;
  for (let hop = 0; hop < 4; hop++) {
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000);
    let r;
    try { r = await fetch(cur, { redirect: 'manual', signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IncheonTourBot/1.0; +https://www.incheontour.or.kr)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ko,en;q=0.8' } }); }
    finally { clearTimeout(tm); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { const nx = await safeUrl(new URL(r.headers.get('location'), cur).href); if (!nx) throw Object.assign(new Error('blocked redirect'), { code: 400 }); cur = nx; continue; }
    if (!r.ok) throw Object.assign(new Error('fetch ' + r.status), { code: 502 });
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    while (n < 1500000) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
    try { reader.cancel(); } catch (e) {}
    const buf = Buffer.concat(chunks.map(c => Buffer.from(c)));
    let cs = (/charset=([\w-]+)/i.exec(r.headers.get('content-type') || '') || [])[1];
    if (!cs) { const sniff = buf.slice(0, 4096).toString('latin1'); cs = (/<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff) || [])[1]; }
    cs = (cs || 'utf-8').toLowerCase(); if (['ks_c_5601-1987', 'ksc5601', 'cp949', 'x-windows-949'].includes(cs)) cs = 'euc-kr';
    let html; try { html = new TextDecoder(cs).decode(buf); } catch (e) { html = new TextDecoder('utf-8').decode(buf); }
    return { html, finalUrl: cur.href };
  }
  throw Object.assign(new Error('too many redirects'), { code: 502 });
}
async function linkPreview(raw) {
  const u = await safeUrl(raw); if (!u) throw Object.assign(new Error('invalid url'), { code: 400 });
  const { html, finalUrl } = await fetchPage(u);
  const m = metaMap(html); const g = (...k) => { for (const x of k) if (m[x]) return m[x]; return ''; };
  const abs = v => { try { const x = new URL(v, finalUrl); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  let date = g('article:published_time', 'og:article:published_time', 'datepublished', 'pubdate', 'publish-date', 'date', 'dc.date', 'article:modified_time');
  const dm = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(date); date = dm ? `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}` : '';
  const host = new URL(finalUrl).hostname.replace(/^www\./, '');
  return {
    ok: true,
    url: abs(g('og:url') || m._canonical || finalUrl) || finalUrl,
    title: clean(g('og:title', 'twitter:title') || m._title, 300),
    desc: clean(g('og:description', 'twitter:description', 'description'), 600),
    image: abs(g('og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src')),
    site: clean(g('og:site_name', 'application-name') || host, 120),
    date,
  };
}

module.exports = async (req, res) => {
  const k = String((req.query && req.query.k) || new URL(req.url, 'http://x').searchParams.get('k') || '');
  const send = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  try {
    const configured = !!envPair();
    if (k === 'auth' && req.method === 'POST') {
      if (!process.env.ADMIN_PASSWORD) return send(503, { ok: false, configured, reason: 'ADMIN_PASSWORD not set' });
      return isAdmin(req) ? send(200, { ok: true, configured }) : send(401, { ok: false });
    }
    if (k === 'og' && req.method === 'GET') {
      if (!isAdmin(req)) return send(401, { ok: false });
      const raw = (req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url');
      try { return send(200, await linkPreview(raw)); }
      catch (e) { return send(200, { ok: false, reason: e.code === 400 ? 'invalid url' : 'unreachable' }); }
    }
    if (k === 'posts' && req.method === 'GET') {
      if (!configured) return send(200, { configured: false, data: null });
      const raw = await redis(['GET', KEY.posts]);
      return send(200, { configured: true, data: raw ? JSON.parse(raw) : null });
    }
    if (k === 'posts' && req.method === 'PUT') {
      if (!isAdmin(req)) return send(401, { ok: false });
      const v = validPosts(await readBody(req)); if (!v) return send(400, { ok: false, reason: 'invalid' });
      await redis(['SET', KEY.posts, JSON.stringify(v)]);
      return send(200, { ok: true, updated: v.updated });
    }
    if (k === 'inquiry' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.website) return send(200, { ok: true }); // honeypot: silently drop bots
      const q = { id: 'q' + Date.now() + Math.random().toString(36).slice(2, 6), date: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10),
        name: clean(b.name, 100), email: clean(b.email, 200), phone: clean(b.phone, 40), type: clean(b.type, 60), subject: clean(b.subject, 200), msg: clean(b.msg, 5000), lang: clean(b.lang, 5), status: 'new' };
      if (!b.agree || !q.name || !q.subject || !q.msg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) return send(400, { ok: false, reason: 'invalid' });
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'na';
      const rk = 'itc:rl:' + crypto.createHash('sha1').update(ip).digest('hex').slice(0, 16);
      const n = await redis(['INCR', rk]); if (n === 1) await redis(['EXPIRE', rk, 600]);
      if (n > 5) return send(429, { ok: false, reason: 'too many' });
      await redis(['LPUSH', KEY.inq, JSON.stringify(q)]); await redis(['LTRIM', KEY.inq, 0, 1999]);
      return send(200, { ok: true, id: q.id });
    }
    if (k === 'inquiry' && req.method === 'GET') {
      if (!isAdmin(req)) return send(401, { ok: false });
      const arr = await redis(['LRANGE', KEY.inq, 0, 1999]);
      return send(200, { ok: true, data: (arr || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean) });
    }
    if (k === 'inquiry' && req.method === 'PUT') {
      if (!isAdmin(req)) return send(401, { ok: false });
      const list = await readBody(req); if (!Array.isArray(list) || list.length > 2000) return send(400, { ok: false });
      await redis(['DEL', KEY.inq]);
      if (list.length) await redis(['RPUSH', KEY.inq, ...list.map(x => JSON.stringify({ ...x, status: x.status === 'done' ? 'done' : 'new' }))]);
      return send(200, { ok: true });
    }
    return send(405, { ok: false });
  } catch (e) {
    return send(e.code || 500, { ok: false, reason: e.code === 503 ? 'storage not configured' : 'error' });
  }
};
