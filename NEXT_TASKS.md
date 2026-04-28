# NEXT_TASKS.md · 다음 작업 지시서

> Claude Code 시작 시 이 파일과 CLAUDE.md를 함께 읽으세요.

---

## 📊 현재 상태 (2026.04.28 기준)

**완료**: 사이트 Step 1-8 + SITE_REVAMP_TASKS.md Phase 1-6 전체 완료, GitHub push됨, Vercel 자동 배포 완료

---

## ✅ 완료된 모든 작업

### Step 1-6 (GitHub bd07527)
- ✅ Apixo → TalkB 브랜드 전환
- ✅ 사업자 정보 + 인증 4종 반영
- ✅ Hero 섹션 위협 톤 재작성
- ✅ 한국 시장 변화 데이터 섹션 추가
- ✅ 가격 4단 구조 전면 재구성
- ✅ 얼리버드 50% 할인 표시
- ✅ JSON-LD Service + FAQ 새 가격 반영
- ✅ Exit modal + Newsletter bar 개선

### Step 7: 인사이트 11편 정리
- ✅ 7-1: 비교 맥락 외 "컨설팅" 표현 없음 확인
- ✅ 7-2: footer "F&B 브랜드" → "맛집 브랜드" 변경 (11건)
- ✅ 7-3: "Fix된" → "정착된/확립된" 변경
- ✅ 7-4: 작성자 표기 "TalkB · 김태정" 11편 통일
- ✅ 인사이트 이전/다음 글 네비게이션 (11편 순서 연결)

### Step 8: 종합 검증
- ✅ 8-1: HTML 태그 무결성 ALL CLEAR
- ✅ 8-2: JSON-LD 유효성 ALL CLEAR
- ✅ 8-3: JavaScript syntax ALL CLEAR
- ✅ 8-4: 구 브랜드(Apixo) 잔존 0건, 구 가격 잔존 0건
- ✅ 8-5: 사업자 정보 일관성 통과
- ✅ 8-6: 가격 4곳 동기화 완료
- ✅ 8-7: sitemap.xml URL 확인
- ✅ 8-8: llms.txt 인사이트 11편 확인
- ✅ 8-9: DEPLOY_GUIDE.md v3 업데이트

### Site Revamp (GitHub 28c666c, 2026.04.28)
- ✅ Phase 1: 메인 페이지 8단 골격 재배치 (25개 → 14개 섹션)
  - 섹션 순서: Hero → 신뢰배지 → 왜토크비 → 비교표 → 서비스 → 진행방식 → 왜지금 → 가격 → FAQ → CTA → Enterprise → 고객사례 → 콘텐츠
  - 네비게이션 업데이트: 왜토크비·서비스·왜지금·가격·FAQ·자료·무료진단
  - F&B → 요식업 가시 콘텐츠 전면 교체
  - Hero: GPT 채팅 창 UI 목업, "NO.1 요식업 전문 AI 노출 솔루션" 슬로건
- ✅ Phase 2: /resources.html 생성 (AI 검색 리서치 자료 7개 섹션 분리)
  - korea-market / now / paradox / gap / compounding / conversion / saas
  - sitemap.xml 추가 (14 URL), llms.txt Resource Pages 섹션 추가
  - 메인 네비 "자료" → /resources.html 연결
- ✅ Phase 3: 비용 섹션 3개 → pricing 1개 통합
  - cost-shift / cost 섹션 제거 (Phase 1에서 처리)
  - commitments 섹션 pricing 하단에 병합
  - 가격 4곳 동기화 확인 (JSON-LD/FAQ/카드/llms.txt)
- ✅ Phase 4: 인사이트 영역 → OG 이미지 가로 스크롤 카드 카루셀 (11편)
  - scroll-snap CSS + 터치 스와이프 지원
  - 좌우 화살표 버튼 (44px, 모바일 숨김)
  - "전체 자료 보기 →" /resources.html 링크 추가
- ✅ Phase 5: Hero + Timing 카피 확정
  - Hero: "AI는 지금 사장님 옆집을 추천하고 있습니다."
  - Timing: "AI 마케팅, 지금이 저점입니다."
- ✅ Phase 6: 종합 검증 통과 + git push

### 추가 완료 작업
- ✅ privacy.html (개인정보처리방침) 신규 생성
- ✅ insights/ 서브폴더 이동 (루트 → insights/)
- ✅ vercel.json 301 리다이렉트 11건
- ✅ OG 이미지 12개 PNG 생성
- ✅ 모바일 터치 타겟 44px 적용

---

## 🔴 남은 작업 (외부 의존성)

| 항목 | 상태 | 담당 |
|------|------|------|
| 실제 대표 전화번호 | 010-XXXX-XXXX 자리 | 김태정 |
| Formspree 양식 연결 | mailto 폴백 사용 중 | 김동균 |
| Google Search Console | 미등록 | 김태정 |
| talkb.co.kr DNS 연결 | 미연결 | 김동균 |
| logo.png 256×256 | 미제작 | — |

---

## ⏳ 추후 작업 (시스템 개발 Phase 1)

### 김태정 대표 (트래킹 시스템)
- 외부 API 호출 (ChatGPT, Perplexity, Google AI, Gemini)
- 측정 결과 파싱·저장
- 분석·결정 로직

### 박재민 팀장 (실행 시스템)
- 콘텐츠 자동 생성 (Claude API)
- 자동 발행 (네이버 플레이스, 블로그, SNS)
- Before/After 자동 리포트

### 김동균 팀장 (인프라)
- Supabase 스키마 설계 (시니어 자문과 함께)
- 결제 연동 (토스페이먼츠)
- 회원·인증 시스템

---

**문서 버전**: v3.0
**작성일**: 2026.04.28
**상태**: SITE_REVAMP_TASKS.md Phase 1-6 전체 완료
