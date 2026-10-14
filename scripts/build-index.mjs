// 템플릿 + data/references.json → index.html · llms.txt (2026-10-07)
// {{경로}} 자리표시를 JSON 값으로 채운다. 못 채운 자리가 하나라도 있으면 실패한다(빈칸이 그대로 배포되지 않게).
// 사이트맵의 홈 lastmod 도 수치 갱신일로 맞춘다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "data", "references.json"), "utf8"));
// 화면용 파생값
const f = data.featured;
data.heroPhrase = f.hero?.all ? `${f.hero.runs}번 모두` : `${f.hero?.runs}번 중 ${f.hero?.rank1}번`;
for (const s of Object.values(data.stores)) {
  s.bar = Math.max(4, Math.round(s.nowPct ?? 0));
  s.barClass = (s.nowPct ?? 0) >= 60 ? "" : "b";
}

// 화면 표기용 날짜(한국시간 · 2026.10.08 꼴)
{
  const k = new Date(new Date(data.updatedAt).getTime() + 9 * 3600000);
  data.updatedDotPad = `${k.getUTCFullYear()}.${String(k.getUTCMonth() + 1).padStart(2, "0")}.${String(k.getUTCDate()).padStart(2, "0")}`;
}
// 공휴일(문의폼 통화 달력에서 빼는 날 · 2026-10-14) · 공공데이터포털 특일 정보(한국천문연구원 getRestDeInfo, 무료)
//   올해·내년을 받아 data/holidays.json 에 저장(커밋)하고, 못 받으면 저장본을 그대로 쓴다. 주간 갱신 때마다 다시 받아 임시공휴일도 따라간다.
{
  const hp = join(ROOT, "data", "holidays.json");
  let saved = { dates: [], at: null };
  try { saved = JSON.parse(readFileSync(hp, "utf8")); } catch { /* 처음 */ }
  let key = process.env.DATA_GO_KR_API_KEY ?? "";
  if (!key) {
    try {
      const line = readFileSync(join(ROOT, "..", "TalkB-app", ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATA_GO_KR_API_KEY="));
      key = (line ?? "").slice("DATA_GO_KR_API_KEY=".length).trim().replace(/^"|"$/g, "");
    } catch { /* 키 없음 */ }
  }
  if (key) {
    try {
      const y = new Date(Date.now() + 9 * 3600000).getUTCFullYear();
      const dates = [];
      for (const yr of [y, y + 1]) {
        const r = await fetch(`https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${encodeURIComponent(key)}&solYear=${yr}&numOfRows=100&_type=json`, { signal: AbortSignal.timeout(15000) });
        const j = await r.json();
        const it = j?.response?.body?.items?.item;
        const list = (Array.isArray(it) ? it : it ? [it] : []).filter((x) => x.isHoliday === "Y");
        if (!list.length) throw new Error(`${yr}년 공휴일 0건`);
        for (const x of list) { const s = String(x.locdate); dates.push(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`); }
      }
      saved = { dates: [...new Set(dates)].sort(), at: new Date().toISOString(), source: "data.go.kr SpcdeInfoService/getRestDeInfo" };
      writeFileSync(hp, JSON.stringify(saved, null, 1) + "\n");
      console.log("공휴일", saved.dates.length, "일 받음");
    } catch (e) { console.warn("공휴일 API 실패 · 저장본 사용:", e instanceof Error ? e.message : e); }
  } else console.warn("DATA_GO_KR_API_KEY 없음 · 공휴일 저장본 사용");
  if (!saved.dates?.length) { console.error("공휴일 목록이 비어 있음(data/holidays.json)"); process.exit(1); }
  data.holidays = saved.dates.join(" ");
}
const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);
function fill(tplName, outName) {
  let text = readFileSync(join(ROOT, tplName), "utf8");
  const bad = [];
  text = text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, p) => { const v = get(p); if (v == null) { bad.push(p); return m; } return String(v); });
  if (bad.length) { console.error(`${tplName} 채우지 못한 자리:`, [...new Set(bad)].join(", ")); process.exit(1); }
  writeFileSync(join(ROOT, outName), text);
  console.log(`${outName} 생성`, text.length, "bytes");
}
// 요금제(/pricing/)는 홈과 같은 스타일을 쓴다 · 홈 템플릿의 <style>을 그대로 가져온다
{
  const home = readFileSync(join(ROOT, "index.template.html"), "utf8");
  const m = /<style>([\s\S]*?)<\/style>/.exec(home);
  if (!m) { console.error("홈 템플릿에서 <style>을 찾지 못함"); process.exit(1); }
  data.landingCss = m[1].trim();
}
fill("index.template.html", "index.html");
mkdirSync(join(ROOT, "pricing"), { recursive: true });
fill("pricing.template.html", "pricing/index.html");
fill("llms.template.txt", "llms.txt");

// 사이트맵 홈 lastmod
const day = new Date(data.updatedAt).toISOString().slice(0, 10);
const smPath = join(ROOT, "sitemap.xml");
const sm = readFileSync(smPath, "utf8");
const sm2 = sm.replace(/(<loc>https:\/\/talkb\.co\.kr\/<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/, `$1${day}$2`);
if (sm2 !== sm) { writeFileSync(smPath, sm2); console.log("sitemap 홈 lastmod", day); }
if (data.warnings?.length) console.warn("경고:", data.warnings.join(" / "));
