// 랜딩 레퍼런스 수치 갱신(2026-10-07) · 읽기 전용
// 최근 7일 ChatGPT 실측(geo_responses)으로 data/references.json 을 다시 쓴다. 그다음 build-index.mjs 를 돌린다.
//   node scripts/update-references.mjs && node scripts/build-index.mjs
// 키: TalkB-app/.env.local 의 Supabase 서비스 키(환경변수 TALKB_APP_ENV 로 경로 변경 가능)
// 공용 DB 보호: 부하(node_load15)가 2 이상이면 멈춘다 · 모든 조회에 필터·range 반복(1,000행 캡)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = process.env.TALKB_APP_ENV || join(ROOT, "..", "TalkB-app", ".env.local");
const env = Object.fromEntries(readFileSync(ENV_PATH, "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const U = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""), K = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const cfg = JSON.parse(readFileSync(join(ROOT, "scripts", "references.config.json"), "utf8"));

async function getAll(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${U}/rest/v1/${q}`, { headers: { ...H, Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error(JSON.stringify(j));
    out.push(...j);
    if (j.length < 1000) break;
  }
  return out;
}

// 0) DB 부하 확인
{
  const auth = Buffer.from(`service_role:${K}`).toString("base64");
  const t = await (await fetch(`${U}/customer/v1/privileged/metrics`, { headers: { Authorization: `Basic ${auth}` } })).text();
  const m = /node_load15\{[^}]*\}\s+([\d.]+)/.exec(t);
  const load = m ? Number(m[1]) : 0;
  console.log("db load15", load);
  if (load >= 2) { console.error("DB 부하가 높아 멈춥니다(2 이상)."); process.exit(1); }
}

const names = [...new Set([...cfg.stores.map((s) => s.name), ...cfg.featured.map((f) => f.store)])];
const stores = await getAll(`stores?select=id,name,cohort,store_type,partner_id&store_type=eq.client&partner_id=is.null&cohort=in.(launch,earlybird)&name=in.(${names.map((n) => `"${n}"`).join(",")})`);
const byName = new Map(stores.map((s) => [s.name, s]));
const missing = names.filter((n) => !byName.has(n));
if (missing.length) { console.error("매장을 찾지 못함:", missing.join(", ")); process.exit(1); }
const ids = stores.map((s) => s.id);
const qs = (await getAll(`geo_questions?select=id,store_id,question,axis,active&store_id=in.(${ids.join(",")})&active=eq.true`)).filter((q) => q.axis !== "understanding");
const since = new Date(Date.now() - 7 * 86400000);
const resp = [];
const qids = qs.map((q) => q.id);
for (let i = 0; i < qids.length; i += 60) {
  resp.push(...await getAll(`geo_responses?select=question_id,asked_at,target_found,target_rank&question_id=in.(${qids.slice(i, i + 60).join(",")})&asked_at=gte.${encodeURIComponent(since.toISOString())}&target_found=not.is.null`));
}
const kst = (d) => new Date(new Date(d).getTime() + 9 * 3600000);
const ko = (d) => { const k = kst(d); return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; };
const dot = (d) => { const k = kst(d); return `${k.getUTCFullYear()}.${k.getUTCMonth() + 1}.${k.getUTCDate()}`; };
const latest = resp.reduce((a, r) => (r.asked_at > a ? r.asked_at : a), "");

const out = { updatedAt: new Date().toISOString(), periodFrom: ko(since), periodTo: ko(latest || new Date()), updatedDot: dot(latest || new Date()), stores: {}, featured: {}, warnings: [] };
let sumB = 0, sumN = 0;
for (const s of cfg.stores) {
  const st = byName.get(s.name);
  const q = new Set(qs.filter((x) => x.store_id === st.id).map((x) => x.id));
  const rs = resp.filter((r) => q.has(r.question_id));
  const pct = rs.length ? Math.round((rs.filter((r) => r.target_found).length / rs.length) * 1000) / 10 : null;
  if (pct == null) out.warnings.push(`${s.name}: 최근 7일 실측 없음`);
  out.stores[s.key] = { ...s, nowPct: pct, base10: Math.round(s.baselinePct / 10), now10: pct == null ? null : Math.round(pct / 10), runs: rs.length };
  sumB += s.baselinePct; sumN += pct ?? 0;
}
out.avg = { basePct: Math.round((sumB / cfg.stores.length) * 10) / 10, nowPct: Math.round((sumN / cfg.stores.length) * 10) / 10 };
out.avg.base10 = Math.round(out.avg.basePct / 10);
out.avg.now10 = Math.round(out.avg.nowPct / 10);
out.storeCount = cfg.stores.length;

for (const f of cfg.featured) {
  const st = byName.get(f.store);
  const q = qs.find((x) => x.store_id === st.id && x.question === f.question);
  if (!q) { out.warnings.push(`${f.key}: 질문이 비활성/없음 · ${f.question}`); out.featured[f.key] = null; continue; }
  const rs = resp.filter((r) => r.question_id === q.id);
  const r1 = rs.filter((r) => r.target_rank === 1).length;
  if (!rs.length || r1 === 0) out.warnings.push(`${f.key}: 최근 7일 1위 없음(${r1}/${rs.length}) · 문구 점검 필요`);
  out.featured[f.key] = { runs: rs.length, rank1: r1, label: `${rs.length}번 중 ${r1}번`, all: rs.length > 0 && r1 === rs.length };
}

mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(join(ROOT, "data", "references.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ avg: out.avg, featured: Object.fromEntries(Object.entries(out.featured).map(([k, v]) => [k, v?.label])), stores: Object.fromEntries(Object.entries(out.stores).map(([k, v]) => [k, `${v.base10}→${v.now10} (${v.nowPct}%)`])), warnings: out.warnings }, null, 1));
