// 템플릿 + data/references.json → index.html · llms.txt (2026-10-07)
// {{경로}} 자리표시를 JSON 값으로 채운다. 못 채운 자리가 하나라도 있으면 실패한다(빈칸이 그대로 배포되지 않게).
// 사이트맵의 홈 lastmod 도 수치 갱신일로 맞춘다.
import { readFileSync, writeFileSync } from "node:fs";
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

const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);
function fill(tplName, outName) {
  let text = readFileSync(join(ROOT, tplName), "utf8");
  const bad = [];
  text = text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, p) => { const v = get(p); if (v == null) { bad.push(p); return m; } return String(v); });
  if (bad.length) { console.error(`${tplName} 채우지 못한 자리:`, [...new Set(bad)].join(", ")); process.exit(1); }
  writeFileSync(join(ROOT, outName), text);
  console.log(`${outName} 생성`, text.length, "bytes");
}
fill("index.template.html", "index.html");
fill("llms.template.txt", "llms.txt");

// 사이트맵 홈 lastmod
const day = new Date(data.updatedAt).toISOString().slice(0, 10);
const smPath = join(ROOT, "sitemap.xml");
const sm = readFileSync(smPath, "utf8");
const sm2 = sm.replace(/(<loc>https:\/\/talkb\.co\.kr\/<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/, `$1${day}$2`);
if (sm2 !== sm) { writeFileSync(smPath, sm2); console.log("sitemap 홈 lastmod", day); }
if (data.warnings?.length) console.warn("경고:", data.warnings.join(" / "));
