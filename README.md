# 인천광역시관광협의회 공식 홈페이지 (www.incheontour.or.kr)

사단법인 인천광역시관광협의회(Incheon Tourism Council) 공식 홈페이지.
정적 사이트(HTML/CSS/JS)로 구성되어 **GitHub → Vercel 자동 배포**로 운영합니다.

## 1. 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 메인 — 히어로 슬라이더·검색·퀵메뉴·거점별/테마별 여행·협의회 소개·통계·발간물·알림마당 |
| `about.html` | 협의회소개 — 인사말·비전·연혁·윤리경영·조직도·CI·오시는 길(구글지도 연동) |
| `travel.html` | 인천여행 — 2군 9구(2026.7 개편) 지역별·테마별 필터, 장소 상세 모달 (46곳) |
| `info.html` | 여행정보 — 발간물 10종 다운로드, 가이드북 웹 열람(43p), 시티투어, 관광안내소 11곳, 교통 |
| `map.html` | 인천관광지도 — Leaflet 인터랙티브 지도(명소·안내소 필터) + 공식 안내지도 앞/뒷면 줌 뷰어 |
| `collab.html` | 콜라보 — 정관 제5조 기반 8대 협업 트랙 상세 + 제안 CTA |
| `news.html` | 알림마당 — 공지사항·언론보도 게시판, 문의 폼 |
| `admin.html` | 관리자 모드 — 공지/언론보도 CRUD(4개 국어), 문의 관리, JSON 백업 |
| `members.html` | 회원사 — '준비중' + 회원 종류(정관 제6조) |
| `js/i18n.js` | 7개 국어 UI 사전 (ko / en / ja / zh-CN / vi / ru / es) — 장문 콘텐츠는 번역 없을 시 영어 폴백 |
| `js/data.js` | 콘텐츠 데이터 (지역·관광지·안내소·발간물·콜라보·연혁·이사회·기본 게시물) |
| `js/app.js` | 공통 헤더/푸터/언어/검색/애니메이션/게시물 저장소 |
| `js/admin.js`, `js/admin-config.js` | 관리자 로직 / 관리자 계정(해시) |
| `assets/img/` | 사진·로고(CI)·지도 이미지 / `assets/img/gb/` 가이드북 페이지 |
| `assets/docs/` | 발간물 PDF(웹 열람용 경량판) · `itc_logo_master.pdf` (CI 원본) |

## 2. 관리자 모드

- 주소: `/admin.html` (검색엔진 noindex)
- 로그인 아이디: `admin` · 비밀번호: Vercel 환경변수 `ADMIN_PASSWORD` (10장). 비밀번호는 이 문서에 적지 않습니다.
- 저장 방식: 브라우저 `localStorage` (서버 없음). 다른 PC와 공유하려면
  1) 설정 › JSON 내보내기 → `js/data.js`의 `DEFAULT_POSTS`에 반영 후 커밋(권장, 영구), 또는
  2) Supabase/Vercel Postgres 연동 (2단계 고도화: `getPosts/savePosts`만 교체하면 됨)
- 문의 폼: 서버 저장소에 접수 → 관리자 › 문의사항에서 확인. 접수 실패 시 이메일 보내기 버튼 안내

## 3. 배포 (GitHub + Vercel + 후이즈 DNS)

```bash
# 1) GitHub 저장소 생성 후
git init && git add . && git commit -m "ITC website v1"
git branch -M main
git remote add origin https://github.com/<ORG>/incheontour-site.git
git push -u origin main
```
2) Vercel → **Add New Project** → GitHub 저장소 선택 → Framework: **Other**, Build Command: 없음, Output: `./` → Deploy
3) Vercel 프로젝트 › Settings › Domains › `www.incheontour.or.kr`, `incheontour.or.kr` 추가
4) **후이즈(whois.co.kr)** 도메인 관리 › DNS(네임서버 레코드) 설정
   | 호스트 | 타입 | 값 |
   |---|---|---|
   | `@` (incheontour.or.kr) | A | `76.76.21.21` |
   | `www` | CNAME | `cname.vercel-dns.com` |
   - 전파 후 Vercel에서 자동 SSL 발급(Let's Encrypt). www → 루트 리다이렉트는 Vercel Domains 설정에서 선택.
5) 이후 `main` 브랜치에 커밋하면 자동 배포.

## 4. 콘텐츠 수정 가이드

| 하고 싶은 일 | 수정 위치 |
|---|---|
| 관광지 추가/수정 | `js/data.js` › `PLACES` (사진은 `assets/img/`에 추가, 위경도 입력) → **9장 빌드 실행** |
| 지역·테마 문구 | `js/data.js` › `REGIONS`, `js/i18n.js` › `travel.themes` |
| 발간물 추가 | PDF를 `assets/docs/`에, 표지를 `assets/img/cover_*.jpg`로 → `BOOKS` |
| SNS 링크(인스타·페북) | `js/data.js` › `SITE.instagram`, `SITE.facebook` (빈 값이면 '준비중' 아이콘) |
| 인사말·비전·윤리·CI·오시는 길 | `about.html` 내 `C` 객체 (4개 국어) |
| 회장 사진 | `assets/img/chairman-v1.jpg` — 교체 시 새 파일명(예: chairman-v2.jpg)으로 저장 후 `about.html` 인사말 이미지 경로 변경 |
| 관리자 비밀번호 | `js/admin-config.js` |

## 5. 확인 필요 사항 (`[확인 필요]` 표기)

- 오시는 길의 지하철역·버스·주차 정보 — 현장 기준 검증 필요
- 인천항 국제여객터미널 관광안내소 전화번호 (지도 인쇄면에서 잘림)
- 2026.7.1 행정구역 개편 후 청라·아라뱃길·정서진의 소속구(서해구로 가정)
- 영문명: 정관 제1조 "Incheon Tourism Council(약자 I.T.C)". 2026-11 로고타입 PNG 5종 영문을 INCHEON TOURISM COUNCIL로 재조판(tools/fix_logotype.py, Noto Sans KR Bold). 벡터 마스터(assets/docs/itc_logo_master.pdf)는 구 표기(ASSOCIATION)라 다운로드 버튼 숨김 — 디자이너 AI 원본 개정 후 교체
- 언론보도 기본 글의 매체명·원문 URL

## 6. 사진·자료 출처

- 관광지 사진(`*-hd.jpg` 53장): 협의회가 수집한 고해상 원본(2026-11, '신_이미지/1순위' 38장 + '2순위' 15장) — 1600px(일반)/2400px(히어로)로 최적화
  - 2순위 중 연평도 평화공원(1200px)·무령게티(1333px)는 원본 해상도 그대로 사용
- 그 외 관광지 사진·안내지도·가이드북·시티투어·섬 이야기·테마북: 인천광역시·인천관광공사 발간물 (비영리 홍보 목적 게시, 저작권은 해당 기관)
- 인천대교 야경: 협의회 소개자료(2025)
- 로고(CI): 협의회 제공 AI 원본(`assets/docs/itc_logo_master.pdf`)
- 지도 타일: © OpenStreetMap contributors (API 키 불필요)

## 7. 기술 스택

- Vanilla HTML5 / CSS3 / ES2020 (프레임워크 없음, 빌드 불필요)
- Pretendard(국문·기본) + Noto Sans JP/SC(일·중 보조) — CDN
- Leaflet 1.9.4 (지도), Google Maps Embed (오시는 길)
- 반응형 브레이크포인트: 1100px / 860px / 520px

## 8. 검색엔진 등록 (2026-11-03 완료)

| 검색엔진 | 소유확인 방식 | 위치 | 비고 |
|---|---|---|---|
| Google Search Console | `google-site-verification` 메타 태그 | 모든 HTML `<head>` | 사이트맵 제출 성공 (8페이지) |
| Bing Webmaster Tools | `msvalidate.01` 메타 태그 | 모든 HTML `<head>` | |
| 네이버 서치어드바이저 | `naver-site-verification` 메타 태그 | 모든 HTML `<head>` | 사이트맵·RSS 제출 |
| 다음 웹마스터도구 | `#DaumWebMasterTool:` 주석 줄 | `robots.txt` 맨 아래 | PIN은 협의회 내부 보관 |

- 위 메타 태그 3줄과 robots.txt의 Daum 줄은 **삭제 금지** (지우면 소유확인이 풀림)
- 새 페이지를 추가하면 `sitemap.xml`에 `<url>` 추가 후 각 도구에서 수집 요청

## 9. 빌드 — SEO·GEO·AEO·속도 최적화 (2026-11-03 도입)

콘텐츠(`js/data.js`, `js/i18n.js`, 각 페이지 HTML)나 사진을 바꾼 뒤에는 **반드시 아래 2줄을 실행한 다음 커밋**합니다.

```bash
python3 tools/optimize_images.py   # 사진 → 화면 크기별 WebP(400~2000px) + js/img-manifest.js
node tools/build.mjs               # 본문 사전 렌더링 · 명소 상세페이지 47개 · JSON-LD · sitemap · robots · llms.txt
```

| 산출물 | 역할 |
|---|---|
| HTML 안의 `<!--pr--> … <!--/pr-->` | JS가 그리던 한국어 본문을 미리 넣은 부분. JS를 실행하지 않는 AI 크롤러도 읽음. 직접 수정 금지(빌드가 덮어씀) |
| `<!--seo:start--> … <!--seo:end-->` | 페이지별 JSON-LD, 폰트, 대표 이미지 미리 불러오기. 직접 수정 금지 |
| `place-<id>.html` (47개) | 명소 상세페이지. 원본 틀은 `tools/place.template.html` |
| `assets/img/opt/`, `assets/img/gb/opt/` | 자동 생성 WebP. 원본 JPG는 다운로드·확대용으로 유지 |
| `assets/fonts/pretendard/` | Pretendard 자체 호스팅(외부 CDN 연쇄 로딩 제거) |
| `llms.txt`, `llms-full.txt` | AI 답변엔진용 사이트 요약·전체 본문 |

- 빌드에는 Node.js와 Playwright(Chromium)가 필요합니다. `tools/`는 `.vercelignore`로 배포에서 제외됩니다.
- CSS·JS 주소에 `?v=해시`가 자동으로 붙어, 1년 캐시를 써도 수정본이 바로 반영됩니다.

## 10. 서버 저장소 — 공지·언론보도·문의 공유 (2026-11-03 도입)

관리자 모드에서 고친 글과 방문자 문의를 **모든 기기가 함께 보도록** 서버에 저장합니다.

| 구성 | 내용 |
|---|---|
| `api/store.js` | Vercel Function. 공지·언론보도 읽기(공개) / 쓰기(관리자), 문의 접수(공개) / 조회·처리(관리자) |
| 저장소 | Upstash Redis (Vercel Marketplace, 무료 요금제) — 환경변수 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 자동 등록 |
| 관리자 인증 | Vercel 환경변수 `ADMIN_PASSWORD` (서버에서만 확인, 설정 전에는 서버 쓰기 거부) |
| 문의 보호 | 필수값·이메일 형식 검사, 숨김 스팸 필드, IP당 10분 5건 제한, 최근 2,000건 보관 |

설정 순서 (최초 1회)
1. Vercel › 프로젝트 `incheontour-site` › **Storage** › Create Database › **Upstash for Redis** (Free) › 프로젝트에 연결
2. Vercel › Settings › **Environment Variables** › `ADMIN_PASSWORD` = 새 비밀번호 (Production·Preview 체크)
3. Deployments › 최신 배포 › **Redeploy** (환경변수는 새 배포부터 적용)
4. `/admin` 로그인 → 상단에 🟢 "서버 저장 모드"가 보이면 완료
