-- ══════════════════════════════════════════════════════════════
-- TalkB · /ai-restaurant 스키마 v2 (place_url 기반)
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 복사 → Run
-- ══════════════════════════════════════════════════════════════
--
-- ⚠ 주의: 아직 leads 테이블이 없는 경우 → 섹션 A만 실행
--         기존 테이블이 있는 경우 (biz_type/store_name/location 컬럼) → 섹션 B 실행
-- ══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 섹션 A: 신규 생성 (테이블이 없는 경우)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  place_url   text,
  phone       text,
  consent     boolean     NOT NULL DEFAULT false,
  source      text        NOT NULL DEFAULT 'lp_ai_restaurant'
);

COMMENT ON TABLE  public.leads            IS 'TalkB 랜딩페이지 사전신청 리드 (v2)';
COMMENT ON COLUMN public.leads.place_url  IS '네이버 플레이스 URL (개인정보 — 암호화 고려)';
COMMENT ON COLUMN public.leads.phone      IS '휴대폰 번호 (개인정보 — 암호화 고려)';
COMMENT ON COLUMN public.leads.consent    IS '개인정보 수집·이용 동의 여부';
COMMENT ON COLUMN public.leads.source     IS '유입 경로 (기본값: lp_ai_restaurant)';

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_leads"
  ON public.leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_select_leads"
  ON public.leads FOR SELECT TO authenticated USING (true);


-- ────────────────────────────────────────────────────────────
-- 섹션 B: 기존 테이블 마이그레이션 (이미 leads 테이블이 있는 경우)
-- 실행 전 기존 데이터 백업 권장
-- ────────────────────────────────────────────────────────────

-- B-1. 기존 컬럼 제거 (존재하는 경우에만)
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS biz_type;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS store_name;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS location;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS email;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS contact;

-- B-2. place_url 컬럼 추가 (없는 경우)
-- ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS place_url text;
-- COMMENT ON COLUMN public.leads.place_url IS '네이버 플레이스 URL (개인정보 — 암호화 고려)';

-- B-3. phone 컬럼이 contact로 되어 있는 경우
-- ALTER TABLE public.leads RENAME COLUMN contact TO phone;

-- ────────────────────────────────────────────────────────────
-- 완료 확인 쿼리 (실행 후)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'leads' ORDER BY ordinal_position;
-- ══════════════════════════════════════════════════════════════
