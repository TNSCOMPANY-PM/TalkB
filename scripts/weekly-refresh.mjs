// 레퍼런스 · 가이드 글 자동 갱신(2026-10-08 레드팀 2-5 · 2026-10-20부터 월 · 목 주 2회)
//   update-references(DB 최근 7일, 부하 가드 내장) → 경고 있으면 커밋 없이 중단 → build-index → 생성 파일만 커밋·푸시(Vercel 자동 배포)
// 등록: Windows 작업 스케줄러 두 개 · "TalkB landing weekly refresh"(월 09:30) + "TalkB landing weekly refresh (Thu)"(목 09:30, 2026-10-20 가이드 글 주 2편) · 같은 명령 · 로그: _internal/refresh.log(gitignore)
// 비용: DB 조회 수십 건 × 주 2회 · 배포는 바뀐 게 있을 때만(최대 주 2회)
import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "_internal"), { recursive: true });
const LOG = join(ROOT, "_internal", "refresh.log");
const log = (m) => { const line = `[${new Date().toISOString()}] ${m}`; console.log(line); appendFileSync(LOG, line + "\n"); };
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
// 게시 상태 전환 · 실패해도 배포는 이미 끝났으니 로그만(다음 주 "변경 없음" 때 다시 시도)
function publishStatus() {
  try { log("게시 상태 · " + sh("node scripts/build-posts.mjs --commit-status").trim().replace(/\n/g, " | ")); }
  catch (e) { log("게시 상태 전환 실패(다음 실행 때 다시): " + String(e.stderr || e.message || e).slice(0, 300)); }
}

try {
  sh("git pull --ff-only origin main");
  log("update-references 시작");
  sh("node scripts/update-references.mjs");
  const data = JSON.parse(readFileSync(join(ROOT, "data", "references.json"), "utf8"));
  if (data.warnings?.length) { log("경고가 있어 커밋하지 않음: " + data.warnings.join(" | ")); process.exit(2); }
  const bad = Object.values(data.stores).filter((s) => s.now10 == null);
  if (bad.length) { log("측정값 없는 매장이 있어 커밋하지 않음: " + bad.map((s) => s.name).join(", ")); process.exit(2); }
  log(sh("node scripts/build-index.mjs").trim().split("\n").filter((l) => /가이드|글 건너뜀|noindex|랜딩 DB|홈 후기|경고/.test(l)).join(" | ") || "build-index 끝");
  // 생성 파일 · 가이드 글(guide/ · 새 글 폴더와 목록)과 게시 목록(data/guide-posts.json) 포함(2026-10-20)
  const OUTPUTS = "data/references.json data/holidays.json data/guide-posts.json index.html pricing/index.html enterprise/index.html llms.txt sitemap.xml guide";
  const changed = sh(`git status --porcelain -- ${OUTPUTS}`).trim();
  if (!changed) {
    log("변경 없음");
    // 지난번에 페이지는 올라갔는데 상태 전환만 못 했으면(푸시된 상태일 때만) 여기서 마저 바꾼다
    if (sh("git rev-parse HEAD").trim() === sh("git rev-parse origin/main").trim()) publishStatus();
    process.exit(0);
  }
  sh(`git add -- ${OUTPUTS}`);
  sh(`git commit -q -m "chore(랜딩): 레퍼런스 · 가이드 글 주간 자동 갱신 ${data.updatedDot}"`);
  sh("git push -q origin main");
  log(`커밋·푸시 완료 · 평균 ${data.avg.base10}→${data.avg.now10} · ${data.periodTo}`);
  // 푸시가 성공한 뒤에만 승인 글을 게시 상태로(approved → published · published_at 처음 한 번 · talkb_post_events publish)
  publishStatus();
  // IndexNow(빙 · 네이버 등)에 바뀐 주소 알림 · 실패해도 갱신은 성공으로 둔다
  try { log(sh("node scripts/indexnow.mjs").trim()); } catch (e2) { log("IndexNow 실패(무시): " + String(e2.stderr || e2.message || e2).slice(0, 200)); }
} catch (e) {
  log("실패: " + String(e.stderr || e.message || e).slice(0, 400));
  process.exit(1);
}
