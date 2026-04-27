# TalkB 프로젝트 컨텍스트 (Claude Code 전용)

> **이 파일은 Claude Code가 작업 시작 시 자동으로 읽는 프로젝트 컨텍스트입니다.**
> 작업하기 전에 반드시 이 문서를 먼저 참고하세요.

---

## 🏢 회사 · 운영자 정보

- **회사**: (주)티앤에스컴퍼니
- **대표**: 김태정 (TJ)
- **팀**: 김태정(전략·세일즈) / 박재민(콘텐츠·자동화) / 김동균(기술·랜딩페이지)
- **전체 비개발자**, 바이브코딩(Claude Code + VS Code) 활용 초보

---

## 🎯 사이트 정체성 (절대 흔들리면 안 되는 핵심)

### 메인 한 줄 정의
**TalkB는 국내 1세대 맛집 전문 AI 노출 자동화 솔루션이다.**

### 브랜드 표기 표준 (v1.3)
| 요소 | 표준 |
|------|------|
| 영문 브랜드명 | TalkB (단독) |
| 한글 브랜드명 | 토크비 (단독) |
| 분야 표기 (영문) | AI Visibility Solution |
| 분야 표기 (한글) | AI 노출 솔루션 |
| 영문 태그라인 | Make AI Talk Your Brand |
| 한글 태그라인 | AI가 당신의 브랜드를 말하게 |
| 도메인 | talkb.co.kr |
| 이메일 | hello@talkb.co.kr |

### ⚠ 절대 금지 표기
- ❌ TalkB AI (한 단어 취급) — TalkB 단독 + AI는 분야 표기
- ❌ "컨설팅 회사" / "GEO 컨설팅" / "AI 컨설팅"
- ❌ "최초 / 유일" (표시광고법 위반 위험) → "1세대" 사용
- ❌ "F&B" 키워드 단독 (사이트는 "맛집" 사용, F&B는 본사 영업 자료에만)

### ✅ 핵심 포지셔닝 메시지
- **"AI에 우리 매장을 검색하면 옆집이 먼저 나옵니다."** (위협 직접 체감 톤)
- "손님은 이미 AI에게 묻고, 답변에 나온 매장으로 갑니다."
- "거기에 우리 매장이 없으면, 매출은 옆집으로 갑니다."

### 사업 정체성 (컨설팅 ❌ → 솔루션 ✅)
- ✅ 솔루션 (Solution) — 자동으로 작동하는 시스템
- ✅ 플랫폼 (Platform) — 다수 클라이언트가 공유하는 인프라
- ❌ 컨설팅 (Consulting) — 사람의 노동 시간
- ❌ 에이전시 (Agency) — 외주 노동력

---

## 🎯 타겟 우선순위

1. **1순위**: 지역 맛집 사장님
2. **2순위**: 프랜차이즈 직가맹점·본사 (별도 Enterprise 플랜)

---

## 💰 가격 구조 (4단)

| 단계 | 상품명 | 가격 | 핵심 |
|------|--------|------|------|
| 1 | Free Diagnostic · 무료 진단 | 0원 | 매월 1회 무료 AI 노출 진단 |
| 2 | Insights · 인사이트 | 49,000원/월 (얼리버드 24,500원) | 자동 트래킹·경쟁사 분석 |
| 3 | Solution · 솔루션 | 290,000원/월 (얼리버드 145,000원) | 자동 실행 + AI 웹사이트 무료 |
| 4 | Enterprise · 본사 | 별도 견적 | 본사·가맹점 통합 |

**얼리버드**: 첫 3개월 50% 할인

---

## 📁 프로젝트 구조

```
talkb-site/
├── CLAUDE.md (이 파일)
├── DEPLOY_GUIDE.md (배포 가이드)
├── _internal/og-image-generator.html (배포 제외, OG 이미지 생성용)
├── index.html (메인 페이지, 약 270KB)
├── 404.html
├── robots.txt
├── llms.txt (AI 크롤러용 사이트 요약)
├── sitemap.xml
└── insights-*.html (인사이트 11편)
    ├── insights-geo-guide.html (Pillar 01-01)
    ├── insights-seo-geo-aeo-comparison.html (01-02)
    ├── insights-ai-answer-4-stages.html (01-03)
    ├── insights-franchise-hq-ai-citation.html (02-01)
    ├── insights-local-store-checklist.html (02-02)
    ├── insights-situational-query-response.html (02-03)
    ├── insights-chatgpt-citation-conditions.html (03-01)
    ├── insights-perplexity-citation-structure.html (03-02)
    ├── insights-google-aio-gemini-guide.html (03-03)
    ├── insights-korea-ai-search-2026.html (04-01)
    └── insights-zero-click-era-fnb.html (04-02)
```

---

## 🔧 기술 스택

- **호스팅**: Vercel (자동 배포, Hobby 플랜)
- **소스**: GitHub TNSCOMPANY-PM/TalkB (main 브랜치)
- **도메인**: talkb.co.kr (DNS 연결 예정)
- **현재 미리보기 URL**: https://talkb.vercel.app/
- **분석**: Google Analytics 4 + UTM (예정)
- **콘텐츠 생성**: Claude API (예정)
- **결제**: 토스페이먼츠 또는 Stripe (예정)
- **DB**: Supabase (예정)

---

## 🏛️ 사업자 정보

- **법인명**: (주)티앤에스컴퍼니
- **대표자**: 김태정
- **사업자등록번호**: 455-86-00636
- **법인등록번호**: 110111-6223103
- **창립일**: 2016년 11월 4일 (현재 9년차)
- **사업장**: 서울특별시 강서구 공항대로 247, A동 12층 1209호 (마곡동, 퀸즈파크나인)
- **종목**: 홈페이지제작, 소프트웨어개발 및 공급, 광고대행업

### 인증 4종 (사이트에 신뢰 배지로 노출 중)
1. **9년차 운영** (2016.11.04 설립)
2. **MAIN-BIZ 인증** (제 240104-08982 호 / 2024.08.19~2027.08.18)
3. **ISO 9001:2015** (No. 24-A-6750 / 2024.07.16~2027.07.15)
4. **ISO 14001:2015** (No. 24-C-5847 / 2024.07.16~2027.07.15)
5. **특허** (제 10-2804310호 "온라인 마케팅을 위한 웹사이트 서비스 플랫폼 제공 시스템" / 2025.04.30 등록)

---

## 🎨 디자인 토큰

```css
--accent: #E85D3A (주황)
--accent-soft: rgba(232, 93, 58, 0.06)
--ink: #1C1B1A (검정)
--ink-mid: #4D4943 (중간 회색)
--ink-muted: #8A867F (옅은 회색)
--ink-light: #B8B5AE (가장 옅은 회색)
--bg-soft: #F8F5EF (베이지 배경)
--white: #FFFFFF
--border: #E8E4DA
--cream-soft: #F4F0E8

폰트: Pretendard (한글) + JetBrains Mono (모노)
```

### 디자인 원칙
- 화이트 베이스 + 주황 액센트
- 모바일 반응형 3-tier (≤960 / ≤640 / ≤400px)
- Hero 직후 신뢰 배지 → 한국 시장 데이터 → Pilot 흐름 유지

---

## 📊 사이트 섹션 흐름 (현재 구조)

1. **Hero** — 위협 직접 체감 카피 ("옆집이 먼저 나옵니다")
2. **Trust Badges** — 9년차 / 메인비즈 / ISO / 특허 (4종 배지)
3. **Korea Market** — 한국 시장 변화 데이터 (47.93% / 50.9% / 2,031만 / +15%p)
4. **Pilot Strip** — 오공김밥 / 덮밥장사장 / 한신우동 (3사 로고)
5. **Cost Shift** — 같은 노출, 다른 비용 구조
6. **Now** — AI 검색 시대의 현재 (글로벌·한국 데이터)
7. **Paradox** (소비자 행동 변화) — "손님은 더 이상 검색하지 않습니다"
8. **Timing** — 시대는 반복된다 (블로그 → SNS → 유튜브 → AI)
9. **Gap** — 지금 잃고 있는 것 (지역 맛집 → 본사 순)
10. **Compounding** — 광고비 사라짐, AI 자산 쌓임
11. **Conversion** — 같은 고객 확보, 다른 결과
12. **Solution** — TalkB 작동 방식 (4단계 + 3-tier)
13. **Why TalkB** — 우리만 할 수 있는 이유
14. **Cases Data** — 3개사 Before/After 실측
15. **Process** — 진행 방식 (계약→첫 성과)
16. **Hq Pricing** — 본사 단위 도입 ROI
17. **Pricing** — 4단 가격 (Free/Insights/Solution/Enterprise)
18. **Promise** — TalkB 책임지는 것
19. **FAQ** — 자주 묻는 질문
20. **Final CTA** — 무료 도입 진단 신청

---

## 🚧 알려진 잔존 작업 (Step 7-8)

### Step 7: 인사이트 11편 정리
- "컨설팅" 표현 검색해서 솔루션·자동 톤으로 변경
- "F&B" 표현이 인사이트에 많이 있는데, 학술 톤이라 일부 보존 가능 (메인 사이트만 "맛집"으로 통일됨)
- author 표기는 이미 "김태정 · 대표"로 통일됨

### Step 8: 종합 검증
- HTML 태그 무결성 (모든 페이지)
- JSON-LD 유효성
- JavaScript syntax (Node.js로 체크)
- sitemap.xml URL 12개 일치 확인
- llms.txt 인사이트 11편 일치 확인

### 미래 작업 (시스템 개발)
- **박재민 팀장 담당**: 진단 시스템, 트래킹 시스템, 솔루션 자동 실행 (Claude API + Vercel + Supabase)
- **김동균 팀장 담당**: 기술 인프라, 결제 연동
- **김태정 대표 담당**: 사이트 구축, 영업 구조

---

## ⚠ 작업 시 반드시 지킬 것

### 1. 카피 변경 시
- **"국내 1세대"** 표현은 그대로 유지 ("최초·유일" 사용 금지)
- **"맛집"** 키워드 우선 (사이트 본문)
- **"솔루션"** 정체성 유지 ("컨설팅" 단어 도입 금지, 단 비교 맥락 "사람이 자문하는 컨설팅이 아닌 SaaS 솔루션"은 의도된 사용으로 보존)

### 2. JSON-LD 수정 시
- index.html에 **3개 블록**: Organization / Service / FAQPage
- 모든 인사이트 글에 1개 블록: Article + BreadcrumbList
- 수정 후 반드시 JSON 유효성 검증

### 3. JavaScript 수정 시
- 수정 후 반드시 `node --check` 검증
- IIFE 캡슐화 유지 (전역 변수 안 노출)
- localStorage 차단 환경 → sessionStorage 폴백 구조 유지

### 4. 가격 정보 수정 시
- index.html 4곳 동기화: 가격 카드 / Service offers JSON-LD / FAQ 답변 / llms.txt
- 옛 가격 (20만원/35만원/60만원) 절대 부활 금지

### 5. 새 콘텐츠 추가 시
- Hero·솔루션 메시지와 충돌하면 안 됨
- 모바일 반응형 점검 필수
- 새 섹션은 가능한 한 기존 디자인 토큰 재사용

---

## 🚀 배포 워크플로우

```bash
# 1. 변경 후 검증 (이 파일 마지막에 있는 검증 스크립트 참조)
# 2. Git 커밋·푸시
git add .
git commit -m "Description"
git push

# 3. Vercel 자동 배포 (1~2분)
# 4. https://talkb.vercel.app/ 에서 확인
```

---

## 📋 검증 체크리스트 (변경 후 매번)

```
- [ ] HTML 태그 짝 (html/body/head/style/section)
- [ ] JSON-LD 유효성 (모든 페이지)
- [ ] JavaScript syntax (node --check)
- [ ] 옛 표현 잔존 0건 (Apixo, 에픽소, apixo.ai 등)
- [ ] 사업자 정보 일관성 (455-86-00636 / 퀸즈파크나인 등)
- [ ] 가격 정보 4곳 동기화
- [ ] 모바일 반응형 (≤960 / ≤640 / ≤400)
```

---

## 🔗 외부 자료 참고

- 한국 검색 점유율: StatCounter 2025.12 (구글 47.93% / 네이버 42.5%)
- 한국 ChatGPT 사용: 오픈서베이 AI 검색 트렌드 리포트 2026 (50.9%)
- 한국 ChatGPT MAU: 와이즈앱 (2,031만 명)
- 글로벌 ChatGPT WAU: OpenAI 공식 (9억 명)

---

**문서 버전**: v1.0  
**작성일**: 2026.04.27  
**작성자**: Claude (이전 채팅) + 김태정 대표 결정 사항 반영
