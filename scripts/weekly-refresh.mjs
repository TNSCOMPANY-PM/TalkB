// 주 1회 레퍼런스 자동 갱신(2026-10-08 레드팀 2-5)
//   update-references(DB 최근 7일, 부하 가드 내장) → 경고 있으면 커밋 없이 중단 → build-index → 생성 파일만 커밋·푸시(Vercel 자동 배포)
// 등록: Windows 작업 스케줄러 "TalkB landing weekly refresh" (월 09:30) · 로그: _internal/refresh.log(gitignore)
// 비용: DB 조회 수십 건/주 · 배포 1회/주
import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "_internal"), { recursive: true });
const LOG = join(ROOT, "_internal", "refresh.log");
const log = (m) => { const line = `[${new Date().toISOString()}] ${m}`; console.log(line); appendFileSync(LOG, line + "\n"); };
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });

try {
  sh("git pull --ff-only origin main");
  log("update-references 시작");
  sh("node scripts/update-references.mjs");
  const data = JSON.parse(readFileSync(join(ROOT, "data", "references.json"), "utf8"));
  if (data.warnings?.length) { log("경고가 있어 커밋하지 않음: " + data.warnings.join(" | ")); process.exit(2); }
  const bad = Object.values(data.stores).filter((s) => s.now10 == null);
  if (bad.length) { log("측정값 없는 매장이 있어 커밋하지 않음: " + bad.map((s) => s.name).join(", ")); process.exit(2); }
  sh("node scripts/build-index.mjs");
  const changed = sh("git status --porcelain -- data/references.json index.html llms.txt sitemap.xml").trim();
  if (!changed) { log("변경 없음"); process.exit(0); }
  sh("git add data/references.json index.html llms.txt sitemap.xml");
  sh(`git commit -q -m "chore(랜딩): 레퍼런스 주간 자동 갱신 ${data.updatedDot}"`);
  sh("git push -q origin main");
  log(`커밋·푸시 완료 · 평균 ${data.avg.base10}→${data.avg.now10} · ${data.periodTo}`);
} catch (e) {
  log("실패: " + String(e.stderr || e.message || e).slice(0, 400));
  process.exit(1);
}
