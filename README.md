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
- **초기 계정**: ID `admin` / PW `IncheonTour2026!` → 운영 전 반드시 변경
  - 변경 방법: 관리자 › 설정 › "해시 생성" → 출력된 줄을 `js/admin-config.js`에 붙여넣고 커밋
- 저장 방식: 브라우저 `localStorage` (서버 없음). 다른 PC와 공유하려면
  1) 설정 › JSON 내보내기 → `js/data.js`의 `DEFAULT_POSTS`에 반영 후 커밋(권장, 영구), 또는
  2) Supabase/Vercel Postgres 연동 (2단계 고도화: `getPosts/savePosts`만 교체하면 됨)
- 문의 폼: 제출 시 관리자 목록 저장 + 메일 앱(incheontour1@gmail.com) 자동 실행

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
| 관광지 추가/수정 | `js/data.js` › `PLACES` (사진은 `assets/img/`에 추가, 위경도 입력) |
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
- 로고타입 영문 "INCHEON TOURISM ASSOCIATION" vs 정관 영문명 "Incheon Tourism Council (I.T.C)" 불일치 — 정관 또는 로고 개정으로 통일 권장
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
