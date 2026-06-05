-- ══════════════════════════════════════════════════════════════
-- TalkB · /ai-restaurant 랜딩페이지 · Supabase 마이그레이션
-- 실행 방법: Supabase 대시보드 → SQL Editor → 아래 전체 복사 → Run
-- ══════════════════════════════════════════════════════════════

-- 1. leads 테이블 생성
CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  biz_type    text,
  store_name  text,
  location    text,
  contact     text,
  consent     boolean NOT NULL DEFAULT false,
  source      text NOT NULL DEFAULT 'lp_ai_restaurant'
);

-- 2. 컬럼 코멘트
COMMENT ON TABLE  public.leads              IS 'TalkB 랜딩페이지 사전신청 리드';
COMMENT ON COLUMN public.leads.biz_type     IS '업종 (음식점/카페/베이커리/술집/기타)';
COMMENT ON COLUMN public.leads.store_name   IS '매장명';
COMMENT ON COLUMN public.leads.location     IS '매장 위치 (동 단위)';
COMMENT ON COLUMN public.leads.contact      IS '연락처 또는 이메일 (개인정보 — 암호화 고려)';
COMMENT ON COLUMN public.leads.consent      IS '개인정보 수집·이용 동의 여부';
COMMENT ON COLUMN public.leads.source       IS '유입 경로 (기본값: lp_ai_restaurant)';

-- 3. RLS 활성화
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: anon 사용자 INSERT만 허용 (조회·수정·삭제 금지)
CREATE POLICY "anon_insert_leads"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. RLS 정책: 인증된 사용자(서비스 어카운트)만 SELECT 허용
--    (Supabase 대시보드에서 직접 조회하거나, service_role key 사용 시)
CREATE POLICY "service_select_leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- ══════════════════════════════════════════════════════════════
-- 완료 확인용 쿼리 (실행 후 테이블 구조 확인)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'leads' ORDER BY ordinal_position;
-- ══════════════════════════════════════════════════════════════
