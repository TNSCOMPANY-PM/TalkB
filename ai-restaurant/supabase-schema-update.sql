-- ══════════════════════════════════════════════════════════════
-- TalkB · leads 테이블 스키마 업데이트
-- contact → phone 컬럼명 변경
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 복사 → Run
-- ══════════════════════════════════════════════════════════════

-- 1. contact 컬럼을 phone으로 이름 변경
--    (기존 leads 테이블에 contact 컬럼이 있는 경우만 실행)
ALTER TABLE public.leads RENAME COLUMN contact TO phone;

-- 2. 코멘트 업데이트
COMMENT ON COLUMN public.leads.phone IS '휴대폰 번호 (개인정보 — 암호화 고려)';

-- ── 확인 쿼리 ──────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'leads' ORDER BY ordinal_position;
-- ══════════════════════════════════════════════════════════════

-- ※ 테이블을 아직 생성하지 않았다면 supabase-migration.sql을 먼저 실행한 후
--   migration.sql의 contact 컬럼을 phone으로 바꿔서 실행하거나,
--   이 파일 대신 아래의 최신 전체 DDL을 사용하세요:

/*
CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  biz_type    text,
  store_name  text,
  location    text,
  phone       text,
  consent     boolean NOT NULL DEFAULT false,
  source      text NOT NULL DEFAULT 'lp_ai_restaurant'
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_leads"
  ON public.leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_select_leads"
  ON public.leads FOR SELECT TO authenticated USING (true);
*/
