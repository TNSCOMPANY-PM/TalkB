// IndexNow 알림(2026-10-20) · sitemap.xml 의 주소를 빙 · 네이버 · 얀덱스 등 IndexNow 참여 검색엔진에 한 번에 알린다(구글은 참여 안 함)
//   node scripts/indexnow.mjs            sitemap 전체
//   node scripts/indexnow.mjs URL ...    지정한 주소만
// 키 파일: 사이트 루트의 <key>.txt (공개가 정상 · 소유 확인용) · 설정 scripts/indexnow.json
// 비용: 무료 · 주간 갱신(weekly-refresh.mjs) 푸시 뒤 1번 부른다. 실패해도 갱신은 성공으로 둔다.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "scripts", "indexnow.json"), "utf8"));
const args = process.argv.slice(2);
const urlList = args.length
  ? args
  : [...readFileSync(join(ROOT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urlList.length) { console.error("알릴 주소가 없어요"); process.exit(1); }

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: cfg.host, key: cfg.key, keyLocation: cfg.keyLocation, urlList }),
  signal: AbortSignal.timeout(20_000),
});
console.log(`IndexNow ${res.status} · ${urlList.length}개`, (await res.text()).slice(0, 200));
// 200 받음 · 202 키 확인 대기 · 4xx 형식/키 문제
if (res.status >= 400) process.exit(1);
