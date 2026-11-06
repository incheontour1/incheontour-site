// tools/build.mjs — SEO · GEO · AEO + performance build for www.incheontour.or.kr
// What it does (idempotent; safe to run again after any content change):
//   1. Static <img> → responsive WebP <img srcset> (uses js/img-manifest.js from optimize_images.py)
//   2. <head>: answer-first meta description, self-hosted font, LCP preload, JSON-LD @graph, versioned CSS/JS
//   3. Prerender: the Korean content that JS draws (header, cards, FAQ…) is written into the HTML
//      between <!--pr--> … <!--/pr--> so crawlers that do not run JavaScript can read it
//   4. 47 place pages (place-<id>.html) from tools/place.template.html
//   5. sitemap.xml · robots.txt · llms.txt · llms-full.txt
// Usage (repo root):  python3 tools/optimize_images.py && node tools/build.mjs
import fs from 'fs'; import path from 'path'; import http from 'http'; import crypto from 'crypto'; import vm from 'vm'; import os from 'os';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = 'https://www.incheontour.or.kr';
const TODAY = new Date().toISOString().slice(0, 10);
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ---------- data ----------
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/i18n.js', 'js/data.js', 'js/img-manifest.js']) vm.runInContext(rd(f), ctx);
const { I18N, PLACES, REGIONS, TICS, BOOKS, COLLAB, FAQ, IMGM, SITE: S } = ctx;
const KO = I18N.ko;
const tk = k => k.split('.').reduce((o, x) => (o && o[x] !== undefined ? o[x] : undefined), KO);
const ko = o => (o && typeof o === 'object' ? (o.ko ?? o.en) : o) ?? '';
const en = o => (o && typeof o === 'object' ? (o.en ?? o.ko) : o) ?? '';
const regionOf = id => REGIONS.find(r => r.id === id);
const imgUrl = (file, w = 1200) => {
  const st = file.replace(/\.(jpe?g|png)$/i, ''), m = IMGM[st];
  if (!m) return `${SITE}/assets/img/${file}`;
  return `${SITE}/assets/img/opt/${st}-${m[2].find(v => v >= w) || m[2].at(-1)}.webp`;
};

// ---------- page metadata (answer-first descriptions) ----------
const PAGES = {
  index:   { url: '/', name: '홈', lcp: 'hero_islands-hd.jpg', desc: '사단법인 인천광역시관광협의회 공식 홈페이지. 인천 2군 9구 명소 47곳, 관광안내소 11곳, 가이드북·지도 10종, 인천 9경과 여행 FAQ를 7개 언어로 안내합니다.' },
  about:   { url: '/about', name: '협의회소개', lcp: 'songdo_hero-hd.jpg', desc: '인천광역시관광협의회는 관광진흥법 제48조의9에 근거해 2019년 설립된 지역관광협의회입니다. 회장 인사말, 비전, 연혁, 윤리경영, 조직도, CI, 오시는 길을 안내합니다.' },
  travel:  { url: '/travel', name: '인천여행', lcp: 'sagot_beach-hd.jpg', desc: '인천 2군 9구 명소 47곳을 지역·테마별로 소개합니다. 개항장·월미도·송도·영종·강화·옹진 섬까지 주소, 연락처, 가까운 관광안내소와 길찾기를 제공합니다.' },
  info:    { url: '/info', name: '여행정보', lcp: 'ganghwa_hero-hd.jpg', desc: '인천관광가이드북 2026 등 발간물 10종 무료 다운로드, 가이드북 웹 열람, 인천시티투어, 관광안내소 11곳의 연락처·운영시간, 1330 관광통역 안내를 제공합니다.' },
  map:     { url: '/map', name: '인천관광지도', lcp: 'incheon9.jpg', desc: '인천 명소 47곳과 관광안내소 11곳을 인터랙티브 지도로 찾고, 공식 인천관광안내지도를 확대해 볼 수 있습니다.' },
  collab:  { url: '/collab', name: '콜라보', lcp: 'songdo_convensia-hd.jpg', desc: '인천광역시관광협의회와 협업할 수 있는 8대 분야(관광상품 기획, 관광정보 서비스, 페스티벌, MICE, 전문가 교육, 해외 교류, 산업관광, 테마관광 인바운드)와 제안 방법을 안내합니다.' },
  news:    { url: '/news', name: '알림마당', lcp: 'tribowl_night-hd.jpg', desc: '인천광역시관광협의회 공지사항과 언론보도, 회원가입·협업 문의를 접수하는 알림마당입니다.' },
  members: { url: '/members', name: '회원사', lcp: 'songdo_centralpark-hd.jpg', desc: '인천광역시관광협의회 회원 종류(정회원(전문위원)·일반회원·특별회원·명예회원)와 회원사를 안내합니다.' },
};

// ---------- JSON-LD ----------
const ORG = {
  '@type': 'Organization', '@id': `${SITE}/#org`, name: '인천광역시관광협의회',
  alternateName: ['사단법인 인천광역시관광협의회', 'Incheon Tourism Council', 'I.T.C', 'INCHEON TOURISM COUNCIL'],
  url: `${SITE}/`, logo: `${SITE}/assets/img/logo-symbol.png`, image: imgUrl('hero_islands-hd.jpg'),
  description: '관광진흥법 제48조의9와 「인천광역시 관광진흥 조례」에 근거해 2019년 설립된 인천의 지역관광협의회. 관광객 유치·홍보, 관광사업 진흥, 회원 공제·복리 증진을 수행한다.',
  foundingDate: '2019-04-12', email: S.email, telephone: S.tel,
  address: { '@type': 'PostalAddress', streetAddress: '구월남로 118 YMCA회관 501호', addressLocality: '남동구', addressRegion: '인천광역시', postalCode: '21556', addressCountry: 'KR' },
  geo: { '@type': 'GeoCoordinates', latitude: S.lat, longitude: S.lng },
  areaServed: { '@type': 'City', name: '인천광역시', sameAs: 'https://www.wikidata.org/wiki/Q20934' },
  knowsAbout: ['인천관광', '관광안내소 운영', '관광상품 기획', 'MICE', '산업관광', '테마관광 인바운드', '관광전문가 교육'],
  member: [{ '@type': 'OrganizationRole', roleName: '회장', member: { '@type': 'Person', name: '김재오' } }],
  contactPoint: { '@type': 'ContactPoint', telephone: S.tel, email: S.email, contactType: 'customer support', availableLanguage: ['ko', 'en'], hoursAvailable: 'Mo-Fr 09:00-18:00' },
  sameAs: [S.youtube, S.instagram, S.facebook].filter(Boolean),
};
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: '인천광역시관광협의회', inLanguage: ['ko', 'en', 'ja', 'zh-CN', 'vi', 'ru', 'es'], publisher: { '@id': `${SITE}/#org` } };
const crumbs = list => ({ '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
const webpage = (key, type = 'WebPage') => ({ '@type': type, '@id': SITE + PAGES[key].url + '#webpage', url: SITE + PAGES[key].url, name: `${PAGES[key].name} | 인천광역시관광협의회`, description: PAGES[key].desc, inLanguage: 'ko', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#org` }, dateModified: TODAY, primaryImageOfPage: imgUrl(PAGES[key].lcp) });
const attraction = p => {
  const r = regionOf(p.region);
  return { '@type': 'TouristAttraction', '@id': `${SITE}/place-${p.id}#place`, name: ko(p.n), alternateName: [en(p.n), p.n.ja, p.n.zh].filter(Boolean), description: strip(ko(p.d)),
    url: `${SITE}/place-${p.id}`, image: imgUrl(p.img), telephone: p.tel || undefined,
    address: { '@type': 'PostalAddress', streetAddress: p.addr || undefined, addressLocality: ko(r.n), addressRegion: '인천광역시', addressCountry: 'KR' },
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
    containedInPlace: { '@type': 'City', name: '인천광역시' }, keywords: p.themes.map(th => tk('travel.themes.' + th)).join(', '),
    touristType: p.themes.includes('family') ? '가족여행' : undefined };
};
const tic = x => ({ '@type': 'TouristInformationCenter', name: ko(x.n), alternateName: en(x.n), telephone: x.tel || undefined, description: `운영시간 ${x.h}`, geo: { '@type': 'GeoCoordinates', latitude: x.lat, longitude: x.lng }, address: { '@type': 'PostalAddress', addressRegion: '인천광역시', addressCountry: 'KR' } });
const faqLD = () => ({ '@type': 'FAQPage', '@id': `${SITE}/#faq`, mainEntity: FAQ.map(f => ({ '@type': 'Question', name: ko(f.q), acceptedAnswer: { '@type': 'Answer', text: ko(f.a) } })) });
function graphFor(key) {
  const g = [ORG, WEBSITE];
  const home = ['홈', '/'];
  if (key === 'index') g.push(webpage('index'), faqLD(), { '@type': 'ItemList', name: '인천 9경 및 지역별 명소', numberOfItems: PLACES.length, itemListElement: PLACES.slice(0, 12).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/place-${p.id}`, name: ko(p.n) })) });
  if (key === 'about') g.push(webpage('about', 'AboutPage'), crumbs([home, ['협의회소개', '/about']]));
  if (key === 'travel') g.push(webpage('travel', 'CollectionPage'), crumbs([home, ['인천여행', '/travel']]), { '@type': 'ItemList', name: '인천 명소 47곳', numberOfItems: PLACES.length, itemListElement: PLACES.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/place-${p.id}`, name: ko(p.n) })) });
  if (key === 'info') g.push(webpage('info', 'CollectionPage'), crumbs([home, ['여행정보', '/info']]),
    { '@type': 'ItemList', name: '인천 관광안내소 11곳', numberOfItems: TICS.length, itemListElement: TICS.map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: tic(x) })) },
    { '@type': 'ItemList', name: '인천 관광 발간물 10종 (PDF)', numberOfItems: BOOKS.length, itemListElement: BOOKS.map((b, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'DigitalDocument', name: ko(b.n), description: strip(ko(b.d)), url: `${SITE}/assets/docs/${b.file}`, encodingFormat: 'application/pdf', image: imgUrl(b.cover, 400) } })) });
  if (key === 'collab') g.push(webpage('collab'), crumbs([home, ['콜라보', '/collab']]), { '@type': 'ItemList', name: '협의회 8대 협업 분야', itemListElement: COLLAB.map((c, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Service', name: ko(c.n), description: strip(ko(c.d)), provider: { '@id': `${SITE}/#org` }, areaServed: '인천광역시' } })) });
  if (key === 'news') g.push(webpage('news'), crumbs([home, ['알림마당', '/news']]));
  if (key === 'members') g.push(webpage('members'), crumbs([home, ['회원사', '/members']]));
  if (key === 'map') g.push(webpage('map'), crumbs([home, ['인천관광지도', '/map']]));
  return { '@context': 'https://schema.org', '@graph': g };
}
const ldScript = obj => `<script type="application/ld+json">${JSON.stringify(obj, (k, v) => (v === undefined ? undefined : v))}</script>`;

// ---------- helpers ----------
const hash = f => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const VER = {};
for (const f of ['css/style.css', 'js/i18n.js', 'js/data.js', 'js/app.js', 'js/img-manifest.js', 'js/admin.js', 'js/admin-config.js']) if (fs.existsSync(path.join(ROOT, f))) VER[f] = hash(f);
function versionAssets(html) {
  html = html.replace(/(href|src)="(css\/style\.css|js\/[\w-]+\.js)(\?v=[\w]+)?"/g, (m, a, f) => (VER[f] ? `${a}="${f}?v=${VER[f]}"` : m));
  if (!/js\/img-manifest\.js/.test(html)) html = html.replace(/<script src="js\/app\.js(\?v=\w+)?"><\/script>/, m => `<script src="js/img-manifest.js?v=${VER['js/img-manifest.js']}"></script>` + m);
  return html;
}
function srcsetAttrs(file, sizes) {
  const st = file.replace(/\.(jpe?g|png)$/i, ''), m = IMGM[st]; if (!m) return null;
  const [w, h, ws] = m;
  return { src: `assets/img/opt/${st}-${ws.find(v => v >= 800) || ws.at(-1)}.webp`, srcset: ws.map(x => `assets/img/opt/${st}-${x}.webp ${x}w`).join(', '), sizes, w, h };
}
function rewriteStaticImgs(html) {
  return html.replace(/<img ([^>]*?)src="assets\/img\/([\w.-]+\.(?:jpg|png))"([^>]*)>/g, (m, pre, file, post) => {
    if (/logo|favicon|map_page/.test(file)) return m;
    const all = pre + ' ' + post, cls = (all.match(/class="([^"]*)"/) || [])[1] || '';
    const ctxBefore = html.slice(Math.max(0, html.indexOf(m) - 60), html.indexOf(m));
    const hero = /page-hero"[^>]*>$/.test(ctxBefore) || /class="slide/.test(ctxBefore) || /\blcp\b/.test(cls);
    const sizes = hero ? '100vw' : /citytour/.test(file) ? '(max-width:860px) 100vw, 560px' : /chairman/.test(file) ? '(max-width:860px) 420px, 480px' : '(max-width:860px) 100vw, 50vw';
    const a = srcsetAttrs(file, sizes); if (!a) return m;
    let keep = all.replace(/\s*(width|height|loading|decoding|fetchpriority|sizes|srcset)="[^"]*"/g, '').replace(/\s+/g, ' ').trim();
    if (/\bdefer\b/.test(cls)) return `<img ${keep} data-src="${a.src}" data-srcset="${a.srcset}" width="${a.w}" height="${a.h}" decoding="async">`;
    const pri = (hero && !/\bdefer\b/.test(cls)) ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `<img ${keep} src="${a.src}" srcset="${a.srcset}" sizes="${a.sizes}" width="${a.w}" height="${a.h}" ${pri} decoding="async">`;
  });
}
function headBlock(key, extra = {}) {
  const lcp = extra.lcp || PAGES[key]?.lcp, a = lcp && srcsetAttrs(lcp, extra.lcpSizes || '100vw');
  const L = ['<!--seo:start-->',
    '<script>document.documentElement.classList.add("js")</script>',
    '<meta name="geo.region" content="KR-28"><meta name="geo.placename" content="인천광역시, 대한민국">' + (extra.geo ? `<meta name="geo.position" content="${extra.geo}"><meta name="ICBM" content="${extra.geo.replace(';', ', ')}">` : ''),
    '<link rel="alternate" type="application/rss+xml" title="인천광역시관광협의회 알림마당" href="/rss.xml"><link rel="alternate" type="text/markdown" title="llms.txt" href="/llms.txt">',
    '<link rel="stylesheet" href="assets/fonts/pretendard/pretendardvariable-dynamic-subset.css">',
    a ? `<link rel="preload" as="image" href="${a.src}" imagesrcset="${a.srcset}" imagesizes="${a.sizes}" fetchpriority="high">` : '',
    ldScript(extra.ld || graphFor(key)),
    '<!--seo:end-->'];
  return L.filter(Boolean).join('\n');
}
function applyHead(html, key, meta, extra) {
  html = html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->\n?/, '');
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
  if (meta) {
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(meta.desc)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(meta.desc)}">`)
      .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(meta.desc)}">`);
    if (meta.img) html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${meta.img}">`).replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${meta.img}">`);
  }
  return html.replace(/(<link rel="icon")/, headBlock(key, extra) + '\n$1');
}
const stripPrerender = html => html.replace(/<!--pr-->[\s\S]*?<!--\/pr-->/g, '');
function fillI18n(html) {
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n="([\w.]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, inner, close) => {
    if (/<(div|section|ul|li|p|a)\b/.test(inner)) return m; // never touch nested markup
    const v = tk(key); return typeof v === 'string' ? open + v + close : m;
  });
  html = html.replace(/(<[^>]*\sdata-i18n-ph="([\w.]+)"[^>]*?)(\s?placeholder="[^"]*")?(\s*\/?>)/g, (m, a, key, ph, end) => { const v = tk(key); return typeof v === 'string' ? `${a} placeholder="${esc(v)}"${end}` : m; });
  return html.replace(/(<span data-count="([\d.]+)" data-dec="(\d)">)[^<]*(<\/span>)/g, (m, o, n, d, c) => o + Number(n).toLocaleString('ko-KR', { minimumFractionDigits: +d, maximumFractionDigits: +d }) + c);
}

// ---------- 1–2: transform source pages ----------
const PAGE_FILES = Object.keys(PAGES);
const out = {};
for (const key of PAGE_FILES) {
  let h = stripPrerender(rd(key + '.html'));
  h = applyHead(h, key, { desc: PAGES[key].desc });
  h = rewriteStaticImgs(versionAssets(h));
  out[key + '.html'] = fillI18n(h);
}
// admin page: versioned assets + self-hosted font only (noindex, not prerendered)
{ let h = versionAssets(rd('admin.html'));
  if (!/pretendardvariable-dynamic-subset/.test(h)) h = h.replace(/(<link rel="stylesheet" href="css\/style\.css)/, '<link rel="stylesheet" href="assets/fonts/pretendard/pretendardvariable-dynamic-subset.css">\n$1');
  wr('admin.html', h); }
// place pages
const tpl = rd('tools/place.template.html');
for (const p of PLACES) {
  const r = regionOf(p.region), title = `${ko(p.n)} | 인천여행 | 인천광역시관광협의회`;
  const desc = strip(`${ko(p.n)}(${ko(r.n)}) — ${ko(p.d)}`).slice(0, 155);
  const url = `${SITE}/place-${p.id}`, img = imgUrl(p.img);
  let h = tpl.replace(/__TITLE__/g, esc(title)).replace(/__DESC__/g, esc(desc)).replace(/__URL__/g, url).replace(/__TITLE__/g, esc(title))
    .replace(/__IMAGE__/g, img).replace(/__DESCRIPTION__/g, esc(desc));
  const ld = { '@context': 'https://schema.org', '@graph': [ORG, WEBSITE, attraction(p),
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description: desc, inLanguage: 'ko', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${url}#place` }, primaryImageOfPage: img, dateModified: TODAY },
    crumbs([['홈', '/'], ['인천여행', '/travel'], [ko(r.n), `/travel?region=${r.id}`], [ko(p.n), `/place-${p.id}`]])] };
  h = applyHead(h, 'travel', null, { ld, lcp: p.img, lcpSizes: '(max-width:1180px) 100vw, 1140px', geo: `${p.lat};${p.lng}` });
  out[`place-${p.id}.html`] = fillI18n(rewriteStaticImgs(versionAssets(h)));
}

// ---------- 3: prerender with a real browser ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'itc-build-'));
for (const d of ['assets', 'css', 'js', 'favicon.ico']) fs.symlinkSync(path.join(ROOT, d), path.join(tmp, d));
for (const [f, h] of Object.entries(out)) fs.writeFileSync(path.join(tmp, f), h);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(tmp, u === '/' ? 'index.html' : u);
  if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const SKIP_IDS = new Set(['leafmap', 'papermap', 'map-side', 'flip-img', 'notice-list', 'rows', 'pager', 'cnt', 'post']); // posts come from the live server store → never bake stale copies
const browser = await chromium.launch();
let n = 0;
for (const [f, h] of Object.entries(out)) {
  if (f === 'admin.html') continue;
  const ctxB = await browser.newContext({ locale: 'ko-KR', viewport: { width: 1280, height: 900 } });
  await ctxB.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
  const pg = await ctxB.newPage();
  await pg.goto(`http://127.0.0.1:${port}/${f.replace(/\.html$/, '').replace(/^index$/, '')}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(600);
  const filled = await pg.evaluate(({ tplHtml, skip }) => {
    const doc = new DOMParser().parseFromString(tplHtml, 'text/html');
    const ids = [...doc.body.querySelectorAll('[id]')].filter(e => !e.innerHTML.trim() && !skip.includes(e.id)).map(e => e.id);
    document.querySelectorAll('.rv.in').forEach(e => e.classList.remove('in'));
    const o = {};
    for (const id of ids) { const el = document.getElementById(id); if (el && el.innerHTML.trim() && !/leaflet/.test(el.className + el.innerHTML.slice(0, 400))) o[id] = el.innerHTML.trim(); }
    return o;
  }, { tplHtml: h, skip: [...SKIP_IDS] });
  let html = h;
  for (const [id, inner] of Object.entries(filled)) {
    html = html.replace(new RegExp(`(<(\\w+)\\b[^>]*\\bid="${id}"[^>]*>)\\s*(</\\2>)`), (m, a, tag, c) => `${a}<!--pr-->${inner.replace(/\$/g, '$$$$')}<!--/pr-->${c}`);
  }
  wr(f, html); n++;
  await ctxB.close();
}
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`prerendered ${n} pages`);

// ---------- 4: sitemap / robots / llms ----------
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
const pri = { index: '1.0', travel: '0.9', about: '0.9', info: '0.9', map: '0.8', collab: '0.7', news: '0.7', members: '0.5' };
for (const key of PAGE_FILES) sm.push(`<url><loc>${SITE}${PAGES[key].url}</loc><lastmod>${TODAY}</lastmod><changefreq>${key === 'news' ? 'weekly' : 'monthly'}</changefreq><priority>${pri[key]}</priority><image:image><image:loc>${imgUrl(PAGES[key].lcp)}</image:loc></image:image></url>`);
for (const p of PLACES) sm.push(`<url><loc>${SITE}/place-${p.id}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority><image:image><image:loc>${imgUrl(p.img)}</image:loc><image:title>${esc(ko(p.n))}</image:title></image:image></url>`);
sm.push('</urlset>'); wr('sitemap.xml', sm.join('\n') + '\n');

const daum = (rd('robots.txt').match(/#DaumWebMasterTool:[^\n]+/) || [''])[0];
wr('robots.txt', `# www.incheontour.or.kr — search engines and AI answer engines are welcome
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /tools/

# Korean search engines
User-agent: Yeti
Allow: /
User-agent: Daum
Allow: /

# AI answer engines (citation / search)
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: GPTBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: ${SITE}/sitemap.xml
${daum ? '\n' + daum + '\n' : ''}`);

const byRegion = REGIONS.map(r => ({ r, ps: PLACES.filter(p => p.region === r.id) })).filter(x => x.ps.length);
const llms = `# 인천광역시관광협의회 (Incheon Tourism Council)

> 사단법인 인천광역시관광협의회(I.T.C)는 관광진흥법 제48조의9와 「인천광역시 관광진흥 조례」에 근거해 2019년 4월 설립된 인천의 지역관광협의회입니다. 이 사이트는 인천 2군 9구의 명소 47곳, 관광안내소 11곳, 공식 관광 발간물 10종(PDF)과 여행 FAQ를 한국어 등 7개 언어로 제공합니다.

## 핵심 사실
- 공식 명칭: 사단법인 인천광역시관광협의회 / Incheon Tourism Council (I.T.C)
- 설립: 2019-04-12 · 근거: 관광진흥법 제48조의9, 인천광역시 관광진흥 조례 · 목적: 정관 제2조
- 회장: 김재오 · 주소: 인천광역시 남동구 구월남로 118 YMCA회관 501호 · 전화: ${S.tel} · 이메일: ${S.email}
- 실적: 2020~2023 인천시 관광안내소 10개소 수탁 운영, 여행업 리스타트 관광상품 지원사업(39개 업체·1,706명), 인천시 글로벌 K-POP(INK) 콘서트 홍보·모객 지원(2023·2025)
- 여행 중 문의: 한국관광안내 1330 (해외 +82-2-1330)

## 주요 페이지
- [홈](${SITE}/): 인천 9경, 거점·테마별 여행, 통계, 발간물, FAQ
- [협의회소개](${SITE}/about): 인사말·비전·연혁·윤리경영·조직도·CI·오시는 길
- [인천여행](${SITE}/travel): 명소 47곳 (지역·테마 필터)
- [여행정보](${SITE}/info): 발간물 10종 PDF, 가이드북 웹 열람, 시티투어, 관광안내소 11곳, 교통
- [인천관광지도](${SITE}/map): 명소·안내소 인터랙티브 지도
- [콜라보](${SITE}/collab): 8대 협업 분야와 제안 방법
- [알림마당](${SITE}/news): 공지·언론보도·문의
- [전체 본문 (llms-full.txt)](${SITE}/llms-full.txt)

## 자주 묻는 질문
${FAQ.map(f => `### ${ko(f.q)}\n${ko(f.a)}`).join('\n\n')}

## 지역별 명소
${byRegion.map(({ r, ps }) => `### ${ko(r.n)} (${en(r.n)})\n${ps.map(p => `- [${ko(p.n)}](${SITE}/place-${p.id}): ${strip(ko(p.d)).slice(0, 90)}`).join('\n')}`).join('\n\n')}

## 관광안내소 11곳
${TICS.map(x => `- ${ko(x.n)} — ${x.tel || '전화 확인 필요'} · ${x.h}`).join('\n')}

## 공식 발간물 (PDF)
${BOOKS.map(b => `- [${ko(b.n)}](${SITE}/assets/docs/${b.file}): ${strip(ko(b.d))}`).join('\n')}
`;
wr('llms.txt', llms);
const full = llms + `\n## 명소 상세 (47곳)\n\n${PLACES.map(p => { const r = regionOf(p.region); return `### ${ko(p.n)} (${en(p.n)})\n- 지역: ${ko(r.n)} · 테마: ${p.themes.map(th => tk('travel.themes.' + th)).join(', ')}\n- 주소: ${p.addr || '-'} · 전화: ${p.tel || '-'} · 좌표: ${p.lat}, ${p.lng}\n- URL: ${SITE}/place-${p.id}\n\n${strip(ko(p.d))}${p.tip ? `\n\n여행 팁: ${strip(ko(p.tip))}` : ''}\n\n${strip(en(p.d))}`; }).join('\n\n')}\n\n## 협업 분야 (정관 제5조)\n${COLLAB.map(c => `- ${ko(c.n)}: ${strip(ko(c.d))}`).join('\n')}\n`;
wr('llms-full.txt', full);
console.log(`sitemap ${PAGE_FILES.length + PLACES.length} urls · llms.txt ${llms.length} chars · llms-full.txt ${full.length} chars`);
