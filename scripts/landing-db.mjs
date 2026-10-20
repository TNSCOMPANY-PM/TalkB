// 랜딩 빌드용 DB 읽기(2026-10-20 · SQL 191 talkb_posts · talkb_testimonials · 186 reference_name_consents)
//   키: TalkB-app/.env.local 의 Supabase 서비스 키(update-references.mjs 와 같은 방식 · 환경변수 TALKB_APP_ENV 로 경로 변경 가능)
//   공용 DB 보호: 부하(node_load15) 2 이상이면 읽지 않는다 · select * 금지(칸을 적는다) · 1,000행 캡은 range 반복(id 정렬)
//   주의 · 정규식이 들어 있어 node -e · sed로 고치지 않는다
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function dbEnv() {
  const p = process.env.TALKB_APP_ENV || join(ROOT, "..", "TalkB-app", ".env.local");
  const env = Object.fromEntries(readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
  const U = String(env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""), K = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!U || !K) throw new Error("Supabase 주소·서비스 키 없음");
  return { U, K, H: { apikey: K, Authorization: `Bearer ${K}` } };
}

/** 1,000행 캡 루프 · q 에 order=id 를 넣어 페이지가 밀리지 않게 */
export async function getAll(e, q) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    const r = await fetch(`${e.U}/rest/v1/${q}`, { headers: { ...e.H, Range: `${from}-${from + 999}`, "Range-Unit": "items" }, signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300));
    out.push(...j);
    if (j.length < 1000) break;
  }
  return out;
}

export async function dbLoad(e) {
  const auth = Buffer.from(`service_role:${e.K}`).toString("base64");
  const t = await (await fetch(`${e.U}/customer/v1/privileged/metrics`, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(15000) })).text();
  const m = /node_load15\{[^}]*\}\s+([\d.]+)/.exec(t);
  return m ? Number(m[1]) : 0;
}

export const POST_COLS = "id,kind,vertical,slug,title,summary,body_md,faq,store_id,cover_path,cover_alt,author,status,checks,approved_at,published_at,content_updated_at";
export const TESTIMONIAL_COLS = "id,store_id,store_name,person_label,quote,photo_path,sort";

/**
 * 빌드에 필요한 것 한 번에 · 실패하면 throw(부르는 쪽이 폴백)
 *   posts: 승인 · 게시 글 / testimonials: 홈 후기 / stores: 연결된 매장(이름 · 별칭 · 동네 · 업종 · 파트너) / consents: 실명 동의 / partnerNames
 */
export async function loadLandingDb() {
  const e = dbEnv();
  const load = await dbLoad(e);
  if (load >= 2) throw new Error(`DB 부하가 높아 읽지 않음(load15 ${load})`);
  const posts = await getAll(e, `talkb_posts?select=${POST_COLS}&status=in.(approved,published)&order=id`);
  const testimonials = await getAll(e, `talkb_testimonials?select=${TESTIMONIAL_COLS}&show_on_home=eq.true&order=sort.asc,id.asc`);
  const ids = [...new Set([...posts.map((p) => p.store_id), ...testimonials.map((t) => t.store_id)].filter(Boolean))];
  const stores = [];
  const consents = [];
  for (let i = 0; i < ids.length; i += 80) {
    const part = ids.slice(i, i + 80).join(",");
    stores.push(...await getAll(e, `stores?select=id,name,aliases,region_dong,region_sigungu,category_main,partner_id&id=in.(${part})&order=id`));
    consents.push(...await getAll(e, `reference_name_consents?select=store_id,consented,revoked_at&store_id=in.(${part})&order=store_id`));
  }
  // 파트너 매장 이름(어드민 검사와 같은 기준 · 세 글자 이상)
  const partnerNames = [...new Set((await getAll(e, "stores?select=id,name&partner_id=not.is.null&order=id")).map((s) => String(s.name ?? "").trim()).filter((n) => n.replace(/\s+/g, "").length >= 3))];
  return { posts, testimonials, stores, consents, partnerNames, load };
}

/** 실명 써도 되나 · 동의 기록이 있고(consented) 철회 안 됐고, 파트너 매장이 아님 */
export function nameAllowed(storeId, stores, consents) {
  if (!storeId) return false;
  const st = stores.find((s) => s.id === storeId);
  if (st?.partner_id) return false;
  const c = consents.find((x) => x.store_id === storeId);
  return !!(c && c.consented === true && c.revoked_at == null);
}
