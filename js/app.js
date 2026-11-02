/* ============================================================
   app.js — shared chrome, i18n, search, animations, data store
   ============================================================ */
(function(){
  const LANGS=[["ko","KO","한국어"],["en","EN","English"],["ja","JA","日本語"],["zh","ZH","简体中文"],["vi","VI","Tiếng Việt"],["ru","RU","Русский"],["es","ES","Español"]];
  const htmlLang={ko:"ko",en:"en",ja:"ja",zh:"zh-CN",vi:"vi",ru:"ru",es:"es"};
  let lang=localStorage.getItem("itc_lang");
  if(!lang){lang="ko";}
  if(!I18N[lang]) lang="ko";

  const get=(obj,path)=>path.split(".").reduce((o,k)=>(o&&o[k]!==undefined)?o[k]:undefined,obj);
  window.t=(key)=>{const v=get(I18N[lang],key);return v!==undefined?v:(get(I18N.ko,key)??key);};
  window.L=(obj)=>{if(obj==null)return"";if(typeof obj!=="object")return obj;return obj[lang]??obj.en??obj.ko??Object.values(obj)[0]??"";};
  window.getLang=()=>lang;
  window.setLang=(l)=>{if(!I18N[l])return;lang=l;localStorage.setItem("itc_lang",l);document.documentElement.lang=htmlLang[l];applyI18n();document.dispatchEvent(new CustomEvent("langchange",{detail:l}));};

  const ICON={
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="20" height="20"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    youtube:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4V14h2.8v8h3.3z"/></svg>',
    // quick menu icons
    compass:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke="none"/></svg>',
    map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
    book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
    handshake:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1.5 1.5 0 0 0 3-3"/><path d="m14 14 2.5 2.5a1.5 1.5 0 0 0 3-3L15 9l-2 1.5a2 2 0 0 1-2.6-.2L9.5 9.5"/><path d="M8 6 4 10l5 5"/><path d="m22 10-4-4-3 1.5"/><path d="M2 10l5-4 3 1"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18M7 16v2M17 16v2"/><circle cx="8" cy="13" r="1" fill="currentColor"/><circle cx="16" cy="13" r="1" fill="currentColor"/></svg>',
    train:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="13.5" r="1" fill="currentColor"/><circle cx="15" cy="13.5" r="1" fill="currentColor"/></svg>',
    walk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1.6"/><path d="m8 21 3-7-2-3-1 4H5"/><path d="m11 14 3 2 1 5"/><path d="m9 11 3-2 3 3 3 1"/></svg>'
  };
  window.ICON=ICON;

  const NAV=[
    {id:"about",href:"about.html",sub:["greet","vision","history","ethics","org","ci","way"]},
    {id:"travel",href:"travel.html"},
    {id:"info",href:"info.html"},
    {id:"map",href:"map.html"},
    {id:"collab",href:"collab.html",sub:["c1","c2","c3","c4","c5","c6","c7","c8"]},
    {id:"news",href:"news.html",sub:["notice","press","inquiry"]},
    {id:"members",href:"members.html",soon:true}
  ];
  const page=(location.pathname.split("/").pop()||"index.html").replace(".html","")||"index";

  function subHref(nav,s){ if(nav.id==="news") return `news.html?tab=${s}`; return `${nav.href}#${s}`; }

  function renderHeader(){
    const el=document.getElementById("site-header"); if(!el) return;
    el.innerHTML=`
    <div class="topbar"><div class="container">
      <div class="family">
        <a href="https://www.incheon.go.kr" target="_blank" rel="noopener">인천광역시</a>
        <a href="https://itour.incheon.go.kr" target="_blank" rel="noopener">인천투어</a>
        <a href="https://korean.visitkorea.or.kr" target="_blank" rel="noopener">한국관광공사</a>
        <a href="https://www.mcst.go.kr" target="_blank" rel="noopener">문화체육관광부</a>
      </div>
      <div class="lang-switch" role="group" aria-label="language">${LANGS.map(l=>`<button data-lang="${l[0]}" class="${l[0]===lang?"active":""}" title="${l[2]}">${l[1]}</button>`).join("")}</div>
    </div></div>
    <header class="header" id="hdr"><div class="container">
      <a class="brand" href="index.html" aria-label="${t("org")}"><img src="assets/img/logo-horizontal.png" alt="${t("orgFull")}"></a>
      <nav><ul class="nav">${NAV.map(n=>`<li class="${page===n.id?"active":""}"><a href="${n.href}" data-i18n="nav.${n.id}">${t("nav."+n.id)}${n.soon?`<span class="badge" data-i18n="soon">${t("soon")}</span>`:""}</a>${n.sub?`<div class="sub">${n.sub.map(s=>`<a href="${subHref(n,s)}" data-i18n="sub.${s}">${t("sub."+s)}</a>`).join("")}</div>`:""}</li>`).join("")}</ul></nav>
      <div class="header-tools">
        <button class="icon-btn" id="btn-search" aria-label="${t("search.btn")}">${ICON.search}</button>
        <a class="icon-btn desktop-only" href="admin.html" title="${t("nav.admin")}" aria-label="${t("nav.admin")}" style="font-size:.7rem;font-weight:800;letter-spacing:.05em">ADM</a>
        <button class="icon-btn burger" id="btn-menu" aria-label="${t("common.menu")}">${ICON.menu}</button>
      </div>
    </div></header>
    <div class="drawer" id="drawer"><div class="dim"></div><div class="panel">
      <div class="d-head"><img src="assets/img/logo-horizontal.png" alt=""><button class="icon-btn" id="btn-menu-close" aria-label="${t("common.close")}">${ICON.close}</button></div>
      <div class="d-lang">${LANGS.map(l=>`<button data-lang="${l[0]}" class="${l[0]===lang?"active":""}">${l[2]}</button>`).join("")}</div>
      <ul class="d-nav">${NAV.map(n=>`<li><a href="${n.href}" data-i18n="nav.${n.id}" ${n.sub?`data-toggle`:""}>${t("nav."+n.id)}${n.sub?`<span>+</span>`:""}</a>${n.sub?`<div class="sub">${n.sub.map(s=>`<a href="${subHref(n,s)}" data-i18n="sub.${s}">${t("sub."+s)}</a>`).join("")}</div>`:""}</li>`).join("")}
      <li><a href="admin.html" data-i18n="nav.admin">${t("nav.admin")}</a></li></ul>
      <div class="d-sns">${snsHtml()}</div>
    </div></div>
    <div class="search-ov" id="search-ov"><div class="search-box">
      <form id="search-form">${ICON.search}<input id="search-input" type="search" autocomplete="off" placeholder="${t("search.ph")}" data-i18n-ph="search.ph"><button type="button" class="close icon-btn" id="search-close" aria-label="${t("common.close")}">${ICON.close}</button></form>
      <div class="search-res" id="search-res"><div class="hint" data-i18n="search.hint">${t("search.hint")}</div></div>
    </div></div>
    <button class="totop" id="totop" aria-label="${t("common.top")}">${ICON.up}</button>
    <div class="toast" id="toast"></div>`;

    el.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
    const drawer=el.querySelector("#drawer");
    el.querySelector("#btn-menu").onclick=()=>drawer.classList.add("open");
    el.querySelector("#btn-menu-close").onclick=()=>drawer.classList.remove("open");
    drawer.querySelector(".dim").onclick=()=>drawer.classList.remove("open");
    drawer.querySelectorAll("[data-toggle]").forEach(a=>a.addEventListener("click",e=>{if(window.innerWidth<860){e.preventDefault();a.parentElement.classList.toggle("open");}}));
    // search
    const ov=el.querySelector("#search-ov"),inp=el.querySelector("#search-input"),res=el.querySelector("#search-res");
    const open=()=>{ov.classList.add("open");setTimeout(()=>inp.focus(),50);};
    const close=()=>ov.classList.remove("open");
    el.querySelector("#btn-search").onclick=open; el.querySelector("#search-close").onclick=close;
    ov.addEventListener("click",e=>{if(e.target===ov)close();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")close();if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();open();}});
    el.querySelector("#search-form").addEventListener("submit",e=>{e.preventDefault();runSearch(inp.value,res);});
    inp.addEventListener("input",()=>runSearch(inp.value,res));
    window.openSearch=(q)=>{open();if(q){inp.value=q;runSearch(q,res);}};
    // scroll
    const hdr=el.querySelector("#hdr"),totop=el.querySelector("#totop");
    const onScroll=()=>{hdr.classList.toggle("scrolled",scrollY>10);totop.classList.toggle("show",scrollY>500);};
    addEventListener("scroll",onScroll,{passive:true});onScroll();
    totop.onclick=()=>scrollTo({top:0,behavior:"smooth"});
  }

  function snsHtml(){
    const S=window.SITE;
    const a=(href,icon,name)=>href?`<a href="${href}" target="_blank" rel="noopener" aria-label="${name}">${ICON[icon]}</a>`:`<a class="sns-soon" title="${name} — ${t("soon")}" aria-label="${name}">${ICON[icon]}</a>`;
    return a(S.youtube,"youtube","YouTube")+a(S.instagram,"instagram","Instagram")+a(S.facebook,"facebook","Facebook");
  }
  window.snsHtml=snsHtml;

  function renderFooter(){
    const el=document.getElementById("site-footer"); if(!el) return;
    el.innerHTML=`<footer class="footer"><div class="container">
      <div class="top">
        <div class="brand"><img src="assets/img/logo-white.png" alt="${t("orgFull")}">
          <ul><li data-i18n="footer.addr">${t("footer.addr")}</li><li data-i18n="footer.tel">${t("footer.tel")}</li><li><a href="mailto:${SITE.email}">${SITE.email}</a></li><li data-i18n="footer.cpo">${t("footer.cpo")}</li></ul>
          <div class="sns" style="margin-top:16px">${snsHtml()}</div></div>
        <div><h4 data-i18n="footer.links">${t("footer.links")}</h4><ul>${NAV.map(n=>`<li><a href="${n.href}" data-i18n="nav.${n.id}">${t("nav."+n.id)}</a></li>`).join("")}</ul></div>
        <div><h4 data-i18n="footer.family">${t("footer.family")}</h4><ul>
          <li><a href="https://www.incheon.go.kr" target="_blank" rel="noopener">인천광역시 Incheon Metropolitan City</a></li>
          <li><a href="https://itour.incheon.go.kr" target="_blank" rel="noopener">인천관광공사 · 인천투어</a></li>
          <li><a href="https://korean.visitkorea.or.kr" target="_blank" rel="noopener">한국관광공사 VisitKorea</a></li>
          <li><a href="https://www.mcst.go.kr" target="_blank" rel="noopener">문화체육관광부 MCST</a></li>
          <li><a href="https://www.airport.kr" target="_blank" rel="noopener">인천국제공항 Incheon Airport</a></li>
          <li><a href="https://www.sto.or.kr" target="_blank" rel="noopener">서울관광재단 STO</a></li></ul></div>
        <div><h4 data-i18n="footer.contact">${t("footer.contact")}</h4><ul><li>Tel. ${SITE.tel}</li><li>${SITE.email}</li><li>www.incheontour.or.kr</li><li><a href="https://www.youtube.com/@zoomincheon" target="_blank" rel="noopener">YouTube @zoomincheon</a></li></ul></div>
      </div>
      <div class="bottom"><div class="legal"><a href="#" onclick="return showPolicy()" data-i18n="footer.privacy">${t("footer.privacy")}</a><a href="#" onclick="return showPolicy()" data-i18n="footer.terms">${t("footer.terms")}</a></div><div data-i18n="footer.copy">${t("footer.copy")}</div></div>
    </div></footer>`;
  }
  window.showPolicy=function(){
    const m=document.createElement("div");m.className="modal open";
    m.innerHTML=`<div class="box"><button class="x">${ICON.close}</button><div class="body prose"><h2>개인정보처리방침 · 이용약관</h2>
    <p>(사)인천광역시관광협의회(이하 "협의회")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호합니다.</p>
    <h3>1. 수집 항목·목적</h3><p>문의사항 접수 시 이름(소속), 이메일, 연락처, 문의 내용을 수집하며, 문의 응대 및 협업 검토 목적으로만 이용합니다.</p>
    <h3>2. 보유 기간</h3><p>접수일로부터 1년 보관 후 지체 없이 파기합니다. 법령에 따른 보존 의무가 있는 경우 해당 기간 보관합니다.</p>
    <h3>3. 제3자 제공·위탁</h3><p>이용자의 동의 없이 제3자에게 제공하지 않습니다. 홈페이지는 Vercel(호스팅)을 통해 운영되며 접속 로그가 서비스 운영 목적으로 처리될 수 있습니다.</p>
    <h3>4. 정보관리책임자</h3><p>김재오 (회장) · ${SITE.email} · ${SITE.tel}</p>
    <h3>5. 저작권</h3><p>본 사이트의 사진·발간물 중 인천관광공사·인천광역시 발간 자료는 해당 기관에 저작권이 있으며, 비영리 홍보 목적으로 게시합니다. 무단 상업적 이용을 금합니다.</p>
    <p style="color:#6b7684;font-size:.85rem">시행일: 2026-11-01</p></div></div>`;
    document.body.appendChild(m);m.querySelector(".x").onclick=()=>m.remove();m.addEventListener("click",e=>{if(e.target===m)m.remove();});
    return false;
  };

  // ---------- i18n apply ----------
  window.applyI18n=function(){
    document.querySelectorAll("[data-i18n]").forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
    document.querySelectorAll("[data-i18n-ph]").forEach(el=>{el.placeholder=t(el.dataset.i18nPh);});
    document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
    document.querySelectorAll("[data-l]").forEach(el=>{try{el.innerHTML=L(JSON.parse(el.dataset.l));}catch(e){}});
  };

  // ---------- Posts store (admin-editable, localStorage) ----------
  const STORE_KEY="itc_posts_v1";
  function loadStore(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||"null");}catch(e){return null;}}
  window.getPosts=function(type){
    const s=loadStore();
    const list=(s&&s[type])?s[type]:JSON.parse(JSON.stringify(DEFAULT_POSTS[type]||[]));
    return list.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.date||"").localeCompare(a.date||""));
  };
  window.savePosts=function(type,list){const s=loadStore()||{};s[type]=list;localStorage.setItem(STORE_KEY,JSON.stringify(s));};
  window.addPost=function(type,post){const s=loadStore()||{};const list=(s[type])?s[type]:JSON.parse(JSON.stringify(DEFAULT_POSTS[type]||[]));list.unshift(post);s[type]=list;localStorage.setItem(STORE_KEY,JSON.stringify(s));};
  window.postTitle=(p)=>typeof p.title==="object"?L(p.title):p.title;
  window.postBody=(p)=>typeof p.body==="object"?L(p.body):p.body;

  // ---------- Search ----------
  function buildIndex(){
    const idx=[];
    PLACES.forEach(p=>idx.push({type:"place",tag:t("nav.travel"),title:L(p.n),sub:L(REGIONS.find(r=>r.id===p.region)?.n)+" · "+p.themes.map(th=>t("travel.themes."+th)).join(", "),text:Object.values(p.n).join(" ")+" "+Object.values(p.d).join(" ")+" "+(p.addr||""),img:"assets/img/"+p.img,href:"travel.html?place="+p.id}));
    REGIONS.forEach(r=>idx.push({type:"region",tag:t("travel.region"),title:L(r.n),sub:L(r.s),text:Object.values(r.n).join(" ")+" "+Object.values(r.s).join(" "),img:"assets/img/"+r.img,href:"travel.html?region="+r.id}));
    BOOKS.forEach(b=>idx.push({type:"book",tag:t("nav.info"),title:L(b.n),sub:L(b.d),text:Object.values(b.n).join(" ")+" "+Object.values(b.d).join(" "),img:"assets/img/"+b.cover,href:"info.html#books"}));
    COLLAB.forEach(c=>idx.push({type:"collab",tag:t("nav.collab"),title:L(c.n),sub:L(c.d).slice(0,80),text:Object.values(c.n).join(" ")+" "+Object.values(c.d).join(" "),img:"assets/img/"+c.img,href:"collab.html#"+c.id}));
    TICS.forEach(x=>idx.push({type:"tic",tag:t("map.tics"),title:L(x.n),sub:x.tel+" · "+x.h,text:Object.values(x.n).join(" ")+" "+x.tel,img:"assets/img/wolmi_street.jpg",href:"info.html#tic"}));
    ["notice","press"].forEach(tp=>getPosts(tp).forEach(p=>idx.push({type:tp,tag:t("sub."+tp),title:postTitle(p),sub:p.date,text:Object.values(p.title).join(" ")+" "+Object.values(p.body||{}).join(" "),img:"assets/img/incheon9.jpg",href:`news.html?tab=${tp}&id=${p.id}`})));
    [["greet","about.html#greet"],["vision","about.html#vision"],["history","about.html#history"],["ethics","about.html#ethics"],["org","about.html#org"],["ci","about.html#ci"],["way","about.html#way"]].forEach(([k,h])=>idx.push({type:"about",tag:t("nav.about"),title:t("sub."+k),sub:t("orgFull"),text:[t("sub."+k),I18N.ko.sub[k],I18N.en.sub[k],I18N.ja.sub[k],I18N.zh.sub[k]].join(" "),img:"assets/img/logo-symbol.png",href:h}));
    return idx;
  }
  function runSearch(q,res){
    q=(q||"").trim();
    if(!q){res.innerHTML=`<div class="hint">${t("search.hint")}</div>`;return;}
    const terms=q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits=buildIndex().map(it=>{const hay=(it.title+" "+it.sub+" "+it.text).toLowerCase();let score=0;terms.forEach(tm=>{if(it.title.toLowerCase().includes(tm))score+=5;if(hay.includes(tm))score+=1;});return {it,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,30);
    if(!hits.length){res.innerHTML=`<div class="hint">${t("search.none")}</div>`;return;}
    const hl=s=>{let o=s;terms.forEach(tm=>{o=o.replace(new RegExp(tm.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`<mark>${m}</mark>`);});return o;};
    res.innerHTML=`<div class="hint">${hits.length} ${t("search.count")}</div>`+hits.map(({it})=>`<a href="${it.href}"><img src="${it.img}" alt="" loading="lazy"><div><div class="t">${hl(it.title)}<span class="tag">${it.tag}</span></div><div class="s">${hl(it.sub)}</div></div></a>`).join("");
  }

  // ---------- Reveal / counters ----------
  function initReveal(){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}}),{threshold:.12});
    document.querySelectorAll(".rv").forEach(el=>io.observe(el));
    const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,end=parseFloat(el.dataset.count),dec=(el.dataset.dec||0)|0,dur=1600,st=performance.now();const tick=n=>{const p=Math.min(1,(n-st)/dur),v=end*(1-Math.pow(1-p,3));el.textContent=v.toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec});if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);co.unobserve(el);}),{threshold:.5});
    document.querySelectorAll("[data-count]").forEach(el=>co.observe(el));
  }
  window.initReveal=initReveal;

  // ---------- Toast / modal helpers ----------
  window.toast=function(msg){const el=document.getElementById("toast");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),2600);};
  window.openPlace=function(id){
    const p=PLACES.find(x=>x.id===id);if(!p)return;
    const r=REGIONS.find(x=>x.id===p.region);
    const near=TICS.map(x=>({x,d:Math.hypot(x.lat-p.lat,x.lng-p.lng)})).sort((a,b)=>a.d-b.d)[0].x;
    let m=document.getElementById("place-modal");
    if(!m){m=document.createElement("div");m.id="place-modal";m.className="modal";document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open");});}
    m.innerHTML=`<div class="box"><button class="x" aria-label="${t("common.close")}">${ICON.close}</button>
      <div class="ph"><img src="assets/img/${p.img}" alt="${L(p.n)}"></div>
      <div class="body"><h2>${L(p.n)}</h2><div class="tags"><span>${L(r.n)}</span>${p.themes.map(th=>`<span>${t("travel.themes."+th)}</span>`).join("")}</div>
      <p style="line-height:1.8">${L(p.d)}</p>
      ${p.tip?`<p style="margin-top:12px;padding:12px 14px;background:#eef3fb;border-radius:12px;font-size:.92rem"><b style="color:var(--c-primary)">${t("travel.tip")}</b> · ${L(p.tip)}</p>`:""}
      <div class="info">${p.addr?`<div><b>${t("travel.address")}</b>${p.addr}</div>`:""}${p.tel?`<div><b>${t("travel.tel")}</b>${p.tel}</div>`:""}<div><b>${t("travel.nearby")}</b>${L(near.n)} (${near.tel})</div><div><b>${t("travel.route")}</b><a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener" style="color:var(--c-primary);font-weight:700">Google Maps ↗</a> · <a href="map.html?place=${p.id}" style="color:var(--c-primary);font-weight:700">${t("nav.map")}</a></div></div>
      </div></div>`;
    m.querySelector(".x").onclick=()=>m.classList.remove("open");
    m.classList.add("open");
  };

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded",()=>{
    document.documentElement.lang=htmlLang[lang];
    renderHeader();renderFooter();
    if(typeof window.onPageInit==="function")window.onPageInit();
    applyI18n();initReveal();
  });
  document.addEventListener("langchange",()=>{renderHeader();renderFooter();if(typeof window.onPageRender==="function")window.onPageRender();applyI18n();initReveal();});
})();
