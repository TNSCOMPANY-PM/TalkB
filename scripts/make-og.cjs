// 글마다 공유 그림(1200×630 PNG) 만들기(2026-11-05 · 가이드 글 14편이 모두 기본 og-image 였던 것)
//   data/guide-posts.json(게시 목록)과 승인 대기 글 목록 파일을 읽어 images/og/{slug}.png 를 만든다 · 이미 있으면 건너뜀(--force 면 다시)
//   표지(cover)가 있는 글(사장님 이야기 · 매장 사진)은 그 표지가 공유 그림이라 만들지 않는다
//   그림은 브라우저(Playwright · TalkB-app 에 설치된 것)로 그린다 · 로컬 도구라 배포에는 안 쓰인다(build-posts 는 파일만 본다)
//   CLI: node scripts/make-og.cjs [--force] [slug=제목 ...]   예) node scripts/make-og.cjs "seo-meaning=SEO 뜻과 네이버 SEO"
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const APP = process.env.TALKB_APP || path.join(ROOT, "..", "TalkB-app");
const { chromium } = require(path.join(APP, "node_modules", "playwright"));
const OUT = path.join(ROOT, "images", "og");
const force = process.argv.includes("--force");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const symbol = fs.readFileSync(path.join(ROOT, "images", "brand", "talkb-symbol-white.svg"), "utf8");

function html(title, label) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:"Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;background:#191F28;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px;word-break:keep-all}
.k{display:inline-flex;align-self:flex-start;padding:10px 20px;border-radius:999px;background:#E85D3A;font-size:26px;font-weight:800}
h1{font-size:64px;line-height:1.28;font-weight:800;letter-spacing:-1px;max-width:1050px}
.b{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800}
.b svg{width:44px;height:44px}
.b span{color:#B0B8C1;font-weight:600;font-size:24px;margin-left:8px}
</style></head><body>
<div class="k">${esc(label)}</div>
<h1>${esc(title)}</h1>
<div class="b">${symbol}TalkB 토크비<span>talkb.co.kr</span></div>
</body></html>`;
}

const LABEL = { guide: "가이드", insight: "소식", data: "데이터", case: "사장님 이야기" };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = [];
  for (const a of process.argv.slice(2).filter((x) => x.includes("="))) {
    const i = a.indexOf("="); const [slug, kind] = a.slice(0, i).split(":");
    jobs.push({ slug, title: a.slice(i + 1), kind: kind || "guide" });
  }
  if (!jobs.length) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "guide-posts.json"), "utf8"));
    for (const p of m.posts ?? []) if (p.kind !== "case") jobs.push({ slug: p.slug, title: p.title, kind: p.kind });
  }
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const j of jobs) {
    if (!/^[a-z0-9-]+$/.test(j.slug)) { console.log("주소 이상 · 건너뜀", j.slug); continue; }
    const file = path.join(OUT, `${j.slug}.png`);
    if (fs.existsSync(file) && !force) { console.log("있음 · 건너뜀", j.slug); continue; }
    await pg.setContent(html(j.title, LABEL[j.kind] ?? "가이드"), { waitUntil: "networkidle" });
    await pg.screenshot({ path: file, type: "png" });
    console.log("만듦", j.slug);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
