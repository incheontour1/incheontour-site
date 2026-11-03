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
   ============================================================ */
const crypto = require('crypto');

function envPair() {
  const e = process.env;
  if (e.KV_REST_API_URL && e.KV_REST_API_TOKEN) return [e.KV_REST_API_URL, e.KV_REST_API_TOKEN];
  if (e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN) return [e.UPSTASH_REDIS_REST_URL, e.UPSTASH_REDIS_REST_TOKEN];
  const k = Object.keys(e).find(x => /_KV_REST_API_URL$/.test(x) || /_UPSTASH_REDIS_REST_URL$/.test(x));
  if (k) { const t = k.replace(/URL$/, 'TOKEN'); if (e[t]) return [e[k], e[t]]; }
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
function validPosts(b) {
  if (!b || !Array.isArray(b.notice) || !Array.isArray(b.press)) return null;
  const fix = p => ({ id: clean(p.id, 40), date: clean(p.date, 10), pinned: !!p.pinned, views: +p.views || 0, src: clean(p.src, 120), url: clean(p.url, 500),
    title: Object.fromEntries(Object.entries(p.title || {}).map(([k, v]) => [clean(k, 5), clean(v, 300)])),
    body: Object.fromEntries(Object.entries(p.body || {}).map(([k, v]) => [clean(k, 5), clean(v, 20000)])) });
  if (b.notice.length > 300 || b.press.length > 300) return null;
  return { notice: b.notice.map(fix), press: b.press.map(fix), updated: new Date().toISOString() };
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
