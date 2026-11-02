/* ============================================================
   admin.js — 알림마당 관리자 모드 (공지사항 · 언론보도 · 문의사항)
   • 인증: SHA-256 해시 비교 (ADMIN_CONFIG, js/admin-config.js)
   • 저장: 브라우저 localStorage (itc_posts_v1) — 서버 없는 정적 사이트용
   • 운영 시 실제 DB(Supabase/Vercel Postgres 등)로 교체: README 참조
   ============================================================ */
(function(){
  const LANGS=["ko","en","ja","zh"];
  const $=s=>document.querySelector(s);
  async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
  const SESSION="itc_admin_session";
  let section="dash",editing=null;

  function isAuthed(){try{const s=JSON.parse(sessionStorage.getItem(SESSION)||"null");return s&&s.exp>Date.now();}catch(e){return false;}}
  function login(){
    $("#admin-root").innerHTML=`<div class="admin-login"><img src="assets/img/logo-horizontal.png" alt=""><h2 style="font-size:1.2rem;text-align:center;margin-bottom:18px">관리자 로그인</h2>
      <form class="form" style="box-shadow:none;padding:0" id="lf"><div><label>아이디</label><input name="id" autocomplete="username" required></div><div><label>비밀번호</label><input name="pw" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" type="submit">로그인</button><p style="font-size:.78rem;color:var(--c-muted)">초기 계정은 README 참조 후 반드시 변경하세요. 로그인 세션은 2시간 유지됩니다.</p></form></div>`;
    $("#lf").onsubmit=async e=>{e.preventDefault();const f=e.target;const h=await sha(f.pw.value);
      if(f.id.value===ADMIN_CONFIG.id&&h===ADMIN_CONFIG.hash){sessionStorage.setItem(SESSION,JSON.stringify({exp:Date.now()+2*3600e3}));shell();}else toast("아이디 또는 비밀번호가 올바르지 않습니다.");};
  }
  function logout(){sessionStorage.removeItem(SESSION);login();}

  function shell(){
    $("#admin-root").innerHTML=`<div class="admin"><aside class="side">
      ${[["dash","대시보드"],["notice","공지사항"],["press","언론보도"],["inquiry","문의사항"],["settings","설정 · 백업"]].map(([k,n])=>`<button data-s="${k}" class="${section===k?"active":""}">${n}</button>`).join("")}
      <hr style="border:0;border-top:1px solid var(--c-line);margin:10px 0"><button id="lo">로그아웃</button><a href="index.html" style="display:block;padding:12px 14px;font-size:.85rem;color:var(--c-muted)">← 사이트로</a></aside><main class="main" id="am"></main></div>`;
    document.querySelectorAll(".side [data-s]").forEach(b=>b.onclick=()=>{section=b.dataset.s;editing=null;shell();});
    $("#lo").onclick=logout;
    ({dash,notice:()=>board("notice"),press:()=>board("press"),inquiry,settings})[section]();
  }

  function dash(){
    const n=getPosts("notice"),p=getPosts("press"),i=getPosts("inquiry");
    $("#am").innerHTML=`<h2>대시보드</h2><div class="kpi"><div><b>${n.length}</b>공지사항</div><div><b>${p.length}</b>언론보도</div><div><b>${i.length}</b>문의 전체</div><div><b>${i.filter(x=>x.status==="new").length}</b>미처리 문의</div></div>
      <div class="note">이 관리자 모드는 <b>브라우저 localStorage</b>에 데이터를 저장합니다(정적 호스팅용). 다른 PC·브라우저와 공유하려면 <b>설정 › 백업(JSON 내보내기)</b> 후 <code>js/data.js</code>의 DEFAULT_POSTS에 반영하거나, README의 안내에 따라 Supabase/Vercel Postgres를 연결하세요.</div>
      <h3 style="font-size:1rem;margin:14px 0 8px">최근 문의</h3><table><thead><tr><th>일자</th><th>유형</th><th>제목</th><th>상태</th></tr></thead><tbody>${i.slice(0,5).map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${x.subject}</td><td><span class="status ${x.status}">${x.status==="new"?"미처리":"완료"}</span></td></tr>`).join("")||`<tr><td colspan="4" style="color:var(--c-muted)">문의가 없습니다.</td></tr>`}</tbody></table>`;
  }

  function board(type){
    const list=getPosts(type);
    $("#am").innerHTML=`<h2>${type==="notice"?"공지사항":"언론보도"} <button class="btn btn-primary btn-sm" id="new">+ 새 글</button></h2>
      <table><thead><tr><th style="width:110px">등록일</th><th>제목 (KO)</th>${type==="press"?"<th>매체</th>":"<th style='width:70px'>고정</th>"}<th style="width:150px">관리</th></tr></thead><tbody>
      ${list.map(p=>`<tr><td>${p.date}</td><td>${p.title.ko||p.title.en||""}</td><td>${type==="press"?(p.src||""):(p.pinned?"📌":"")}</td><td class="act"><button data-e="${p.id}">수정</button><button data-up="${p.id}">위로</button><button class="del" data-d="${p.id}">삭제</button></td></tr>`).join("")||`<tr><td colspan="4" style="color:var(--c-muted)">등록된 글이 없습니다.</td></tr>`}</tbody></table><div id="editor"></div>`;
    $("#new").onclick=()=>editor(type,null);
    document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>editor(type,list.find(x=>x.id===b.dataset.e)));
    document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const l=getPosts(type);const i=l.findIndex(x=>x.id===b.dataset.up);if(i>0){const [it]=l.splice(i,1);l.splice(i-1,0,it);it.date=l[i]?.date>it.date?l[i].date:it.date;savePosts(type,l);board(type);}});
    document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{if(!confirm("삭제하시겠습니까? 되돌릴 수 없습니다."))return;savePosts(type,getPosts(type).filter(x=>x.id!==b.dataset.d));toast("삭제되었습니다.");board(type);});
    if(editing)editor(type,editing);
  }
  function editor(type,p){
    editing=p;const isNew=!p;p=p||{id:(type[0])+Date.now(),date:new Date().toISOString().slice(0,10),pinned:false,views:0,src:"",url:"",title:{},body:{}};
    $("#editor").innerHTML=`<div class="editor"><h3 style="font-size:1rem">${isNew?"새 글 작성":"글 수정"}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div><label>등록일</label><input id="e-date" type="date" value="${p.date}"></div>${type==="press"?`<div><label>매체명</label><input id="e-src" value="${p.src||""}"></div><div><label>원문 URL</label><input id="e-url" value="${p.url||""}" placeholder="https://"></div>`:`<div><label>상단 고정</label><select id="e-pin"><option value="0" ${!p.pinned?"selected":""}>아니오</option><option value="1" ${p.pinned?"selected":""}>예</option></select></div><div></div>`}</div>
      <div style="display:flex;gap:6px" id="lt">${LANGS.map((l,i)=>`<button type="button" class="btn ${i?"btn-outline":"btn-primary"} btn-sm" data-l="${l}">${l.toUpperCase()}</button>`).join("")}<span style="font-size:.78rem;color:var(--c-muted);align-self:center;margin-left:8px">언어별 제목·본문 입력 (비어 있으면 KO → EN 순으로 대체 표시)</span></div>
      ${LANGS.map((l,i)=>`<div data-pane="${l}" style="${i?"display:none":""}"><label>제목 (${l.toUpperCase()})</label><input id="t-${l}" value="${(p.title[l]||"").replace(/"/g,"&quot;")}"><label style="margin-top:8px">본문 (${l.toUpperCase()}) — 줄바꿈 유지, 링크는 &lt;a href&gt; 사용 가능</label><textarea id="b-${l}">${p.body[l]||""}</textarea></div>`).join("")}
      <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" id="save">저장</button><button class="btn btn-outline btn-sm" id="cancel">취소</button></div></div>`;
    document.querySelectorAll("#lt [data-l]").forEach(b=>b.onclick=()=>{document.querySelectorAll("#lt [data-l]").forEach(x=>x.className="btn btn-outline btn-sm");b.className="btn btn-primary btn-sm";document.querySelectorAll("[data-pane]").forEach(pn=>pn.style.display=pn.dataset.pane===b.dataset.l?"":"none");});
    $("#cancel").onclick=()=>{editing=null;$("#editor").innerHTML="";};
    $("#save").onclick=()=>{const title={},body={};LANGS.forEach(l=>{const tv=$("#t-"+l).value.trim(),bv=$("#b-"+l).value.trim();if(tv)title[l]=tv;if(bv)body[l]=bv;});
      if(!title.ko&&!title.en){toast("제목(KO 또는 EN)은 필수입니다.");return;}
      const np={...p,date:$("#e-date").value,title,body};if(type==="press"){np.src=$("#e-src").value;np.url=$("#e-url").value;}else{np.pinned=$("#e-pin").value==="1";}
      const l=getPosts(type);const i=l.findIndex(x=>x.id===np.id);if(i>=0)l[i]=np;else l.unshift(np);savePosts(type,l);editing=null;toast("저장되었습니다.");board(type);};
    $("#editor").scrollIntoView({behavior:"smooth"});
  }

  function inquiry(){
    const list=getPosts("inquiry");
    $("#am").innerHTML=`<h2>문의사항 <span style="font-size:.8rem;color:var(--c-muted);font-weight:500">※ 문의 폼 제출 시 이 목록에 저장되고 동시에 메일 앱이 열립니다. 실제 운영 시 메일 수신함(incheontour1@gmail.com)과 함께 관리하세요.</span></h2>
      <table><thead><tr><th>일자</th><th>유형</th><th>제목</th><th>이름/연락처</th><th>상태</th><th>관리</th></tr></thead><tbody>${list.map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td><a href="#" data-v="${x.id}" style="font-weight:600">${x.subject}</a></td><td style="font-size:.85rem">${x.name}<br><span style="color:var(--c-muted)">${x.email} ${x.phone||""}</span></td><td><span class="status ${x.status}">${x.status==="new"?"미처리":"완료"}</span></td><td class="act"><a class="btn btn-outline btn-sm" href="mailto:${x.email}?subject=${encodeURIComponent("Re: "+x.subject)}">회신</a><button data-t="${x.id}">${x.status==="new"?"완료":"미처리"}</button><button class="del" data-d="${x.id}">삭제</button></td></tr>`).join("")||`<tr><td colspan="6" style="color:var(--c-muted)">접수된 문의가 없습니다.</td></tr>`}</tbody></table><div id="iv" class="editor" style="display:none"></div>`;
    document.querySelectorAll("[data-v]").forEach(a=>a.onclick=e=>{e.preventDefault();const x=list.find(y=>y.id===a.dataset.v);const v=$("#iv");v.style.display="";v.innerHTML=`<b>${x.subject}</b><div style="font-size:.85rem;color:var(--c-muted)">${x.date} · ${x.type} · ${x.name} · ${x.email} · ${x.phone||""} · lang:${x.lang}</div><div style="white-space:pre-wrap;line-height:1.7;margin-top:8px">${x.msg}</div>`;});
    document.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{const l=getPosts("inquiry");const x=l.find(y=>y.id===b.dataset.t);x.status=x.status==="new"?"done":"new";savePosts("inquiry",l);inquiry();});
    document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{if(!confirm("삭제하시겠습니까?"))return;savePosts("inquiry",getPosts("inquiry").filter(x=>x.id!==b.dataset.d));inquiry();});
  }

  function settings(){
    $("#am").innerHTML=`<h2>설정 · 백업</h2>
      <div class="note">데이터는 이 브라우저에만 저장됩니다. 정기적으로 JSON을 내보내 보관하세요. 사이트 기본 데이터로 영구 반영하려면 내보낸 JSON의 notice/press 배열을 <code>js/data.js › DEFAULT_POSTS</code>에 붙여넣고 GitHub에 커밋하면 Vercel이 자동 배포합니다.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="exp">JSON 내보내기</button><label class="btn btn-outline btn-sm">JSON 가져오기 <input type="file" id="imp" accept="application/json" hidden></label><button class="btn btn-outline btn-sm" id="reset">기본 데이터로 초기화</button></div>
      <h3 style="font-size:1rem;margin:22px 0 8px">비밀번호 변경 (해시 생성)</h3><p style="font-size:.85rem;color:var(--c-muted)">새 비밀번호의 SHA-256 해시를 생성해 <code>js/admin-config.js</code>의 hash 값을 교체하고 배포하세요. (정적 사이트이므로 파일 교체 방식)</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="npw" type="text" placeholder="새 비밀번호" style="padding:10px 12px;border:1.5px solid var(--c-line);border-radius:10px;min-width:240px"><button class="btn btn-outline btn-sm" id="gen">해시 생성</button></div><pre id="hash" style="margin-top:10px;background:#f4f7fb;padding:12px;border-radius:10px;font-size:.8rem;white-space:pre-wrap"></pre>`;
    $("#exp").onclick=()=>{const data={notice:getPosts("notice"),press:getPosts("press"),inquiry:getPosts("inquiry"),exported:new Date().toISOString()};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`itc_posts_${new Date().toISOString().slice(0,10)}.json`;a.click();};
    $("#imp").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);["notice","press","inquiry"].forEach(k=>{if(Array.isArray(d[k]))savePosts(k,d[k]);});toast("가져오기 완료");}catch(err){toast("JSON 형식 오류");}};r.readAsText(f);};
    $("#reset").onclick=()=>{if(!confirm("모든 변경 사항을 지우고 기본 데이터로 되돌립니다. 계속할까요?"))return;localStorage.removeItem("itc_posts_v1");toast("초기화되었습니다.");};
    $("#gen").onclick=async()=>{const v=$("#npw").value;if(v.length<8){toast("8자 이상 입력하세요.");return;}$("#hash").textContent=`window.ADMIN_CONFIG = { id: "${ADMIN_CONFIG.id}", hash: "${await sha(v)}" };`;};
  }

  window.onPageInit=function(){isAuthed()?shell():login();};
})();
