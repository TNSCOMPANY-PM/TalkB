# NEXT_TASKS.md · 다음 작업 지시서

> Claude Code 시작 시 이 파일과 CLAUDE.md를 함께 읽으세요.
> 이 문서는 이전 작업(Claude.ai 채팅 Step 1~6)에서 이어지는 남은 작업을 정의합니다.

---

## 📊 현재 상태 (2026.04.27 기준)

**완료**: 사이트 대규모 리뉴얼 완료, GitHub bd07527 커밋, Vercel 자동 배포 됨

### 이미 완료된 작업 (Step 1-6)
- ✅ Apixo → TalkB 브랜드 전환
- ✅ 사업자 정보 + 인증 4종 사이트 반영
- ✅ Hero 섹션 위협 톤 재작성 ("옆집이 먼저 나옵니다")
- ✅ 한국 시장 변화 데이터 섹션 신규 추가 (47.93% / 50.9% / 2,031만 / +15%p)
- ✅ Paradox 섹션 한국 톤 재작성 ("매주 들립니다 / 매일 들립니다")
- ✅ Gap 섹션 카드 순서 변경 (지역 매장 1순위)
- ✅ "예비창업자" → "가맹희망자" 표현 통일
- ✅ 가격 4단 구조 (Free/Insights/Solution/Enterprise) 전면 재구성
- ✅ 얼리버드 50% 할인 표시
- ✅ AI 최적화 웹사이트 보너스 박스 추가
- ✅ JSON-LD Service offers + FAQ 새 가격 구조 반영
- ✅ Exit modal 트리거 개선 (PC: 마우스+30%스크롤+20초 / 모바일: 60%+빠른 위로)
- ✅ Newsletter bar 24시간 유지 적용

---

## 🎯 남은 작업: Step 7-8

### Step 7: 인사이트 11편 일괄 정리

#### 7-1. "컨설팅" 표현 검색·정리

각 인사이트 글에서 "컨설팅"이 있는지 확인하고 다음 원칙으로 정리:

**케이스 A: 비교 맥락 (보존)**
> 예: "사람이 자문하는 컨설팅이 아닌 SaaS 솔루션입니다"
→ 그대로 보존 (의도된 비교 표현)

**케이스 B: 일반 맥락 (변경)**
> 예: "GEO 컨설팅 서비스" → "GEO 자동화 솔루션"
> 예: "전문가 컨설팅" → "전문가 자문"

**검색 명령**:
```bash
grep -n "컨설팅" insights-*.html
```

각 결과를 보고 케이스 A인지 B인지 판단해서 정리.

#### 7-2. "F&B" → "맛집" 일관성 점검

**원칙**: 메인 사이트 본문은 "맛집" 통일됐지만, 인사이트 글은 학술 톤이라 일부 "F&B" 보존 가능.

**점검 기준**:
- 일반 본문: "맛집" 권장 (예: "F&B 브랜드" → "맛집 브랜드")
- 학술·전문 맥락: "F&B" 보존 가능 (예: "F&B 산업 동향" → 그대로)
- 메타 태그 (title/description): 가능한 한 "맛집" 사용

**검색 명령**:
```bash
grep -n "F&B\|F&amp;B" insights-*.html | head -30
```

#### 7-3. "한 번 Fix된" 표현 정리

이전 어원(Apixo의 "Fix") 잔재가 남아있을 수 있음. 다음 검색:
```bash
grep -n "Fix된\|Fix되면\|fix된\|fix되면" insights-*.html index.html
```

발견되면 자연스러운 표현으로 변경:
- "Fix된 인용 구조" → "고정된 인용 구조" 또는 "확립된 인용 구조"
- "Fix되면" → "확정되면" 또는 "정착되면"

#### 7-4. 인사이트 페이지 작성자 표기 통일 점검

이미 통일됐을 가능성 높지만 확인:
```bash
grep -n "author\|작성자\|by " insights-*.html | head -20
```

표준: **"김태정 · 대표"** 또는 **"By 김태정 (TalkB 대표)"**

---

### Step 8: 종합 검증 + 최종 패키징

#### 8-1. HTML 무결성 검증 (모든 페이지)

```bash
# 모든 HTML 파일 태그 짝 검증
for f in *.html; do
  echo "=== $f ==="
  echo "html: $(grep -o '<html' $f | wc -l) / $(grep -o '</html>' $f | wc -l)"
  echo "body: $(grep -o '<body' $f | wc -l) / $(grep -o '</body>' $f | wc -l)"
  echo "head: $(grep -o '<head>' $f | wc -l) / $(grep -o '</head>' $f | wc -l)"
  echo "section: $(grep -o '<section' $f | wc -l) / $(grep -o '</section>' $f | wc -l)"
done
```

#### 8-2. JSON-LD 유효성 검증

Python 스크립트로 모든 페이지의 JSON-LD 블록 파싱 검증:

```python
import re, json
import glob

for f in sorted(glob.glob('*.html')):
    with open(f) as fp: c = fp.read()
    matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.DOTALL)
    for i, m in enumerate(matches):
        try:
            json.loads(m)
            print(f"  ✓ {f} [{i+1}]")
        except Exception as e:
            print(f"  ✗ {f} [{i+1}]: {e}")
```

#### 8-3. JavaScript syntax 검증

```bash
# index.html의 JS 블록만 추출해서 node로 검증
node -e "console.log('Node available')"
```

#### 8-4. 옛 표현 잔존 0건 확인

```bash
# 절대 있어선 안 되는 표현
grep -ni "Apixo\|에픽소\|apixo.ai" *.html *.txt *.xml || echo "✓ 옛 브랜드 잔존 없음"

# 옛 가격 (있어선 안 됨)
grep -n '<span class="num">20</span>\|<span class="num">35</span>\|<span class="num">60</span>' index.html || echo "✓ 옛 가격 잔존 없음"
```

#### 8-5. 사업자 정보 일관성

다음 정보가 모든 페이지에서 동일하게 표기되는지 확인:
- 사업자등록번호: 455-86-00636
- 법인등록번호: 110111-6223103
- 사업장: 공항대로 247, A동 12층 1209호 (마곡동, 퀸즈파크나인)
- 이메일: hello@talkb.co.kr

#### 8-6. 가격 정보 4곳 동기화

다음 4곳의 가격 정보가 일치하는지:
1. index.html 가격 카드 (4개 카드)
2. index.html JSON-LD Service offers
3. index.html FAQ 답변
4. llms.txt 가격 정보

표준 가격:
- Free: 0원/평생
- Insights: 49,000원/월 (얼리버드 24,500원)
- Solution: 290,000원/월 (얼리버드 145,000원)
- Enterprise: 별도 견적

#### 8-7. sitemap.xml URL 12개 점검

main + 11편 인사이트 = 12개 URL이 정확히 등록되어 있는지:
```bash
grep -c "<loc>" sitemap.xml
# 기대값: 12
```

#### 8-8. llms.txt 인사이트 11편 일치 확인

llms.txt에 11편 인사이트 모두 정확히 매핑됐는지:
```bash
grep -c "https://talkb.co.kr/insights-" llms.txt
# 기대값: 11
```

#### 8-9. DEPLOY_GUIDE.md v3 업데이트

새 작업 반영해서 배포 가이드 업데이트:
- 변경 이력 추가
- 새 가격 구조 반영
- 새 섹션 (한국 시장 데이터) 표기
- 도메인 talkb.co.kr 연결 가이드 추가

---

## 🚀 마지막 배포

모든 검증 통과 후:

```bash
git status
git add .
git commit -m "Step 7-8: 인사이트 11편 정리 + 종합 검증 + 최종 패키징"
git push
```

Vercel 자동 배포 1~2분 후 https://talkb.vercel.app/ 확인.

---

## ⏳ 추후 작업 (이번 세션 이후, 시스템 개발)

이번 세션은 사이트 빌드까지만. 이후 박재민·김동균 팀장과 진행:

### 박재민 팀장 담당 (시스템 개발)
- 진단 시스템 (Claude API + Vercel + Supabase)
- 트래킹 시스템 (자동 모니터링)
- 솔루션 자동 실행 (콘텐츠 자동 생성·발행)
- AI 자동 웹사이트 빌더 (1분 자동 생성)
- 진단 차등 주기 자동 이메일 시퀀스 (10일/30일/90일)

### 김동균 팀장 담당 (인프라)
- Supabase 스키마 설계
- 결제 연동 (토스페이먼츠 또는 Stripe)
- 출처 표기 워터마크 시스템
- 트래픽 과금 시스템

### 김태정 대표 담당 (영업·전략)
- 사이트 추가 보강 (랜딩 페이지)
- 영업 자료 (PDF, PPT) 제작
- FCEO 45기 강의 자료 (5/12 예정)
- 가맹점 영업 외길 운영

---

## 📋 외부 의존성 (이번 세션에 처리 안 됨)

| 항목 | 상태 |
|------|------|
| 실제 대표 전화번호 | 010-XXXX-XXXX 자리 비어있음 |
| Formspree 양식 ID | mailto: 폴백 사용 중 |
| OG 이미지 12개 PNG | _internal/og-image-generator.html에서 캡처 후 public/ 업로드 필요 |
| Google Search Console | 미등록 |
| talkb.co.kr DNS 연결 | 미연결 (Vercel preview URL만 작동) |
| logo.png 256×256 | 미제작 |
| Privacy Policy 페이지 | 미제작 |

---

**문서 버전**: v1.0  
**작성일**: 2026.04.27
