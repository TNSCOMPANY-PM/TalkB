// 토크비 랜딩 가이드 글(2026-10-20 · PLAN-talkb-landing-content-20261020 §1 · §2-1 · §3-3 · SQL 191)
//   승인(approved) · 게시(published) 글로 /guide/{slug}/ 와 목록 /guide/ 를 만든다. build-index.mjs 가 부른다.
//   옛 /insights/ 주소는 vercel.json 에서 /guide/ 로 301(2026-10-20 사장 정정).
//
//   CLI
//     node scripts/build-posts.mjs                 · 기본 --dry: data/guide-posts.json 기준으로 "게시로 바꿀 글"만 보여 준다(DB 안 바꿈)
//     node scripts/build-posts.mjs --commit-status · weekly-refresh.mjs 가 git push 성공 뒤에만 부른다 · approved → published
//     node scripts/build-posts.mjs --fixture --out <폴더> · 가짜 글로 <폴더>/guide/ 에 렌더(DB 안 읽음 · 저장소에 안 씀)
//
//   검사: 어드민 검사(checks.blockers)를 믿되, 빌드에서 같은 막힘 규칙을 한 번 더 건다(원본 TalkB-app/lib/landing-posts/checks.ts ·
//         저장소 밖 import 금지라 필요한 규칙만 복사) + 후기 글 실명 검사(동의 없으면 매장 실명이 어디에도 있으면 안 됨 · 자동 치환 안 함)
//   걸린 글은 페이지를 만들지 않고 로그만 남긴다. 예전에 만든 페이지가 있으면 지우지 않고 noindex 로 바꿔 둔다.
//   주의 · 정규식이 들어 있어 node -e · sed로 고치지 않는다
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nameAllowed } from "./landing-db.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://talkb.co.kr";
export const GUIDE_DIR = "guide";
const MANIFEST = join(ROOT, "data", "guide-posts.json");
const AUTHOR = "토크비 팀";

// ── 원본 TalkB-app/lib/landing-posts/checks.ts (2026-10-20) · 막힘 규칙만 복사 ──
const LANDING_FORBIDDEN = ["여기먹자", "정본", "유료", "메디스펙"];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DASH_RE = /[—–]/;
function cleanFaq(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => ({ q: String(x?.q ?? "").trim(), a: String(x?.a ?? "").trim() })).filter((x) => x.q || x.a).slice(0, 10);
}
// ── 복사 끝 ──
const FORBIDDEN_HOST_RE = /(yeogimeokja|yeogi-meokja|medi-?spec)/i;

export const VERTICAL_LABEL = { restaurant: "식당", cafe: "카페", bar: "술집", all: "공통" };
export const KIND_LABEL = { guide: "가이드", data: "데이터", insight: "소식", case: "후기" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonLd = (o) => `<script type="application/ld+json">\n${JSON.stringify(o).replace(/</g, "\\u003c")}\n</script>`;
const kst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600000);
export const koDate = (iso) => { const k = kst(iso); return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; };
const ymd = (iso) => kst(iso).toISOString().slice(0, 10);
const urlOf = (slug) => `${SITE}/${GUIDE_DIR}/${slug}/`;

/** 매장 실명 후보(이름 · 별칭 · 지점 뺀 브랜드) · 두 글자 이하는 오탐이 많아 뺀다 */
function realNames(st) {
  const out = new Set();
  const add = (n) => { const s = String(n ?? "").trim(); if (s.replace(/\s+/g, "").length >= 3) out.add(s); };
  add(st?.name);
  for (const a of Array.isArray(st?.aliases) ? st.aliases : []) add(a);
  const first = String(st?.name ?? "").trim().split(/\s+/)[0];
  if (first && first !== String(st?.name ?? "").trim()) add(first);
  return [...out];
}

/**
 * 글 한 줄 → 게시할 모양 또는 건너뛸 이유
 *   ctx: { stores, consents, partnerNames, now }
 */
export function preparePost(row, ctx) {
  const why = [];
  const slug = String(row.slug ?? "");
  const title = String(row.title ?? "").trim();
  const summary = String(row.summary ?? "").trim();
  const body = String(row.body_md ?? "");
  const faq = cleanFaq(row.faq).filter((f) => f.q && f.a);
  const blockers = Array.isArray(row.checks?.blockers) ? row.checks.blockers : [];
  if (blockers.length) why.push(`어드민 검사 막힘 ${blockers.length}건(${blockers.map((b) => b.rule).slice(0, 3).join(", ")})`);
  const fields = [["제목", title], ["요약", summary], ["본문", body], ["FAQ", faq.map((f) => `${f.q}\n${f.a}`).join("\n")], ["이미지 설명", String(row.cover_alt ?? "")]];
  for (const [field, text] of fields) {
    for (const w of LANDING_FORBIDDEN) if (text.includes(w)) why.push(`금지어 "${w}"(${field})`);
    if (DASH_RE.test(text)) why.push(`줄표(${field})`);
    if (FORBIDDEN_HOST_RE.test(text)) why.push(`금지 사이트 링크(${field})`);
  }
  if (!SLUG_RE.test(slug) || slug.length > 80) why.push(`슬러그 형식(${slug || "비어 있음"})`);
  if (!title) why.push("제목 비어 있음");
  else if (/[:：]/.test(title)) why.push("제목 콜론");
  if (!summary) why.push("요약 비어 있음");
  if (faq.length < 2) why.push(`FAQ ${faq.length}개(2개 미만)`);
  const all = fields.map(([, t]) => t).join("\n");
  if (ctx.partnerNames === null) why.push("파트너 매장 이름을 확인하지 못함");
  else for (const n of ctx.partnerNames ?? []) if (all.includes(n)) { why.push(`파트너 매장 이름 "${n}"`); break; }
  if (row.kind === "case") {
    if (!row.store_id) why.push("후기 글인데 매장 연결 없음");
    else if (!nameAllowed(row.store_id, ctx.stores, ctx.consents)) {
      const st = ctx.stores.find((s) => s.id === row.store_id);
      if (!st) why.push("후기 글 매장을 찾지 못함(실명 여부 판단 불가)");
      else for (const n of realNames(st)) if (all.includes(n)) { why.push(`실명 동의 없는 매장 이름 "${n}"`); break; }
    }
  }
  if (why.length) return { ok: false, slug, id: row.id, why };

  const lines = summary.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nowIso = (ctx.now ?? new Date()).toISOString();
  const datePublished = row.published_at || nowIso;
  const modSrc = row.content_updated_at || row.published_at || row.approved_at || nowIso;
  const dateModified = new Date(modSrc) > new Date(datePublished) ? modSrc : datePublished;
  const cover = row.cover_path && (/^https:\/\//.test(row.cover_path) || /^\/[\w./-]+$/.test(row.cover_path)) ? row.cover_path : null;
  return {
    ok: true,
    post: {
      id: row.id, kind: row.kind, vertical: VERTICAL_LABEL[row.vertical] ? row.vertical : "all", slug, title, lines, body_md: body, faq,
      cover, cover_alt: String(row.cover_alt ?? "").trim() || title, status: row.status, datePublished, dateModified,
    },
  };
}

/** 메타 설명 · 요약 첫 줄부터 90~150자 */
export function metaDescription(lines) {
  let d = "";
  for (const l of lines) { d = d ? `${d} ${l}` : l; if (d.length >= 90) break; }
  if (d.length > 150) {
    const cut = d.slice(0, 150);
    const sp = cut.lastIndexOf(" ");
    d = (sp > 90 ? cut.slice(0, sp) : cut).replace(/[,·\s]+$/, "");
  }
  return d;
}

// ── 마크다운 → HTML(어드민 미리보기 TalkB-app/app/admin/(protected)/landing-posts/parts.tsx mdToHtml 과 같은 규칙) ──
//   제목(# → h2) · 문단 · 목록 · 인용 · 표 · 굵게 · 링크만 · 먼저 이스케이프해서 HTML을 넣지 못하게
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (m, t, h) => (h.startsWith("/") ? `<a href="${h}">${t}</a>` : `<a href="${h}" target="_blank" rel="noopener">${t}</a>`));
}
export function mdToHtml(md) {
  const lines = String(md ?? "").split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const lv = Math.min(4, h[1].length + 1); out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue; }
    if (/^\|/.test(t)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      out.push(`<div class="g-tbl"><table>${rows.map((r, ri) => `<tr>${r.map((c) => (ri === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("")}</tr>`).join("")}</table></div>`);
      continue;
    }
    if (/^([-*+]|\d+\.)\s+/.test(t)) {
      const ordered = /^\d+\./.test(t);
      const items = [];
      while (i < lines.length && /^([-*+]|\d+\.)\s+/.test(lines[i].trim())) { items.push(`<li>${inline(lines[i].trim().replace(/^([-*+]|\d+\.)\s+/, ""))}</li>`); i++; }
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^>\s?/.test(t)) { out.push(`<blockquote>${inline(t.replace(/^>\s?/, ""))}</blockquote>`); i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||([-*+]|\d+\.)\s|>)/.test(lines[i].trim())) { para.push(inline(lines[i].trim())); i++; }
    out.push(`<p>${para.join("<br>")}</p>`);
  }
  return out.join("\n");
}

// ── 페이지 머리 · 꼬리(홈 템플릿의 스타일 · 헤더 · 푸터 재사용) ──
const GUIDE_CSS = `
.g-main{padding:40px 0 72px}
.g-art{max-width:760px;margin:0 auto}
.g-crumb{font-size:15px;color:var(--ink-mid);display:flex;gap:6px;flex-wrap:wrap}
.g-crumb a{text-decoration:underline;text-underline-offset:3px}
.g-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:18px}
.g-chip{display:inline-flex;align-items:center;min-height:28px;padding:0 11px;border-radius:999px;background:var(--accent-soft);color:var(--deep);font-size:14px;font-weight:700}
.g-chip.k{background:var(--soft);color:var(--ink-mid)}
.tb .g-h1{font-size:clamp(28px,4.2vw,40px);font-weight:800;margin-top:12px;word-break:keep-all;text-wrap:balance;letter-spacing:-0.035em;line-height:1.25}
.tb .g-by{margin-top:12px;font-size:15px;color:var(--ink-mid)}
.g-cover{margin-top:22px;border-radius:18px;width:100%;height:auto;display:block}
.g-sum{margin-top:24px;background:var(--warm);border:1px solid #FBD5C6;border-radius:18px;padding:20px 22px}
.g-sum b{display:block;font-size:15px;color:var(--deep);margin-bottom:8px}
.g-sum ul{margin:0;padding-left:20px;display:grid;gap:6px;font-size:16.5px;font-weight:600;line-height:1.6}
.g-body{margin-top:32px;font-size:17px;line-height:1.85;color:var(--ink);overflow-wrap:break-word}
.tb .g-body h2{font-size:24px;margin:40px 0 12px}
.tb .g-body h3{font-size:20px;margin:30px 0 10px}
.tb .g-body h4{font-size:18px;margin:24px 0 8px}
.tb .g-body p{margin:0 0 16px}
.g-body ul,.g-body ol{margin:0 0 16px;padding-left:24px}
.g-body li{margin:4px 0}
.g-body blockquote{margin:0 0 16px;padding:10px 16px;border-left:3px solid var(--accent);background:var(--soft);border-radius:0 12px 12px 0}
.g-tbl{overflow-x:auto;margin:0 0 18px;-webkit-overflow-scrolling:touch}
.g-body table{border-collapse:collapse;font-size:15px;min-width:100%}
.g-body th,.g-body td{border:1px solid var(--line);padding:8px 12px;text-align:left;vertical-align:top}
.g-body th{background:var(--soft);white-space:nowrap}
.g-body a{color:var(--deep);text-decoration:underline;text-underline-offset:3px}
.g-sec{margin-top:48px}
.tb .g-sec h2{font-size:24px;font-weight:800;margin-bottom:6px}
.g-cta{margin-top:48px;background:#191F28;color:#fff;border-radius:22px;padding:28px;display:flex;align-items:center;justify-content:space-between;gap:16px 20px;flex-wrap:wrap}
.tb .g-cta p{font-size:20px;font-weight:800;line-height:1.45}
.g-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px}
.g-card{display:block;border:1px solid var(--line);border-radius:18px;padding:20px;background:#fff}
.g-card:hover{border-color:#FBD5C6;color:inherit}
.tb .g-card h3{font-size:18px;font-weight:800;margin-top:10px;line-height:1.4}
.tb .g-card p{margin-top:8px;color:var(--ink-mid);font-size:15px}
.tb .g-card p.d{margin-top:10px;font-size:14px}
.g-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}
.g-tab{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:#fff;font:inherit;font-size:15px;font-weight:700;color:var(--ink-mid);cursor:pointer}
.g-tab[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.tb .g-empty{margin-top:28px;background:var(--soft);border-radius:18px;padding:28px;font-size:18px;font-weight:700}
.g-list-h{max-width:none}
@media (max-width:640px){.g-main{padding:28px 0 56px}.g-body{font-size:16.5px}.g-cta{padding:22px}.g-cta .kbtn{width:100%}.g-sum{padding:18px}}
`;

function homeParts(root) {
  const tpl = readFileSync(join(root, "index.template.html"), "utf8").replace(/\r\n/g, "\n");
  const style = /<style>([\s\S]*?)<\/style>/.exec(tpl);
  const ga = /<!-- Google Analytics \(GA4\) -->\n<script async[^\n]*<\/script>\n<script>[\s\S]*?<\/script>/.exec(tpl);
  const foot = /<footer class="foot">[\s\S]*?<\/footer>/.exec(tpl);
  const kakao = /<a class="float-kakao"[\s\S]*?<\/a>/.exec(tpl);
  if (!style || !ga || !foot || !kakao) throw new Error("홈 템플릿에서 스타일·GA·푸터·카톡 버튼을 찾지 못함");
  if (/\{\{/.test(style[1] + foot[0])) throw new Error("홈 스타일·푸터에 자리표시가 있어 그대로 쓸 수 없음");
  return { css: style[1].trim(), ga: ga[0], foot: foot[0], kakao: kakao[0].replace('data-pos="float"', 'data-pos="guide-float"') };
}

function pageHead(H, { title, desc, canonical, robots, ogType, image, imageAlt, ld }) {
  return `<!DOCTYPE html>
<!-- 생성 파일 · scripts/build-posts.mjs 가 DB(talkb_posts)로 만든다 · 직접 고치지 말 것 -->
<html lang="ko">
<head>
${H.ga}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#E85D3A">
<meta name="format-detection" content="telephone=no">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta property="og:site_name" content="TalkB 토크비">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" type="image/svg+xml" href="/images/brand/talkb-symbol.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/images/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/brand/apple-touch-icon-180.png">
<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM용 사이트 요약">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
${H.css}
${GUIDE_CSS.trim()}
</style>
${ld.map(jsonLd).join("\n")}
</head>
<body>
<div class="tb">
<header class="hdr">
<div class="hdr-in">
<a class="logo" href="/" aria-label="토크비 홈"><img src="/images/brand/talkb-symbol.svg" alt="" width="30" height="30"><span>TalkB <small>토크비</small></span></a>
<nav class="nav" aria-label="주요 메뉴">
<a class="nl" href="/">홈</a>
<a class="nl" href="/pricing/">요금제</a>
<a class="nl" href="/${GUIDE_DIR}/" aria-current="page">가이드</a>
<a class="nl" href="/#inquiry">문의하기</a>
</nav>
<a class="nl-m" href="/${GUIDE_DIR}/">가이드</a>
<a class="kbtn kbtn-sm fbtn" href="/#inquiry" data-pos="guide-header">무료 리포트 신청</a>
</div>
</header>
`;
}

function pageTail(H) {
  return `
${H.foot}

<div class="float" aria-label="카카오톡 상담">
${H.kakao}
</div>
</div>
<script src="/track.js" defer></script>
</body>
</html>
`;
}

const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "토크비", alternateName: "TalkB", url: `${SITE}/`, logo: `${SITE}/logo.png` };
const absImg = (p) => (p ? (p.startsWith("/") ? SITE + p : p) : `${SITE}/og-image.png?v=5`);
const chips = (p) => `<span class="g-chip">${VERTICAL_LABEL[p.vertical]}</span><span class="g-chip k">${KIND_LABEL[p.kind] ?? "가이드"}</span>`;

function card(p) {
  return `<a class="g-card" href="/${GUIDE_DIR}/${p.slug}/" data-v="${p.vertical}" data-k="${p.kind}"><div class="g-chips" style="margin-top:0">${chips(p)}</div><h3>${esc(p.title)}</h3><p>${esc(p.lines[0] ?? "")}</p><p class="d">${koDate(p.dateModified)} 수정</p></a>`;
}

/** 관련 글 · 같은 업종 먼저, 그다음 공통 글 · 최대 3개(수정일 최근 순) */
export function related(p, posts) {
  const others = posts.filter((x) => x.slug !== p.slug).sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1));
  const same = others.filter((x) => x.vertical === p.vertical);
  const rest = others.filter((x) => x.vertical !== p.vertical && (x.vertical === "all" || p.vertical === "all"));
  return [...same, ...rest].slice(0, 3);
}

export function renderPost(H, p, posts) {
  const url = urlOf(p.slug);
  const title = `${p.title} | 토크비(TalkB)`;
  const desc = metaDescription(p.lines);
  const image = absImg(p.cover);
  const rel = related(p, posts);
  const ld = [
    {
      "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`, headline: p.title, description: desc,
      datePublished: p.datePublished, dateModified: p.dateModified, inLanguage: "ko",
      author: { "@type": "Organization", name: AUTHOR, url: `${SITE}/` }, publisher: ORG, image: [image], mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "토크비", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "가이드", item: `${SITE}/${GUIDE_DIR}/` },
        { "@type": "ListItem", position: 3, name: p.title, item: url },
      ],
    },
  ];
  const head = pageHead(H, { title, desc, canonical: url, robots: "index, follow, max-snippet:-1, max-image-preview:large", ogType: "article", image, imageAlt: p.cover ? p.cover_alt : p.title, ld });
  const main = `<main class="g-main">
<article class="wrap"><div class="g-art">
<nav class="g-crumb" aria-label="현재 위치"><a href="/">홈</a><span aria-hidden="true">›</span><a href="/${GUIDE_DIR}/">가이드</a></nav>
<div class="g-chips">${chips(p)}</div>
<h1 class="g-h1">${esc(p.title)}</h1>
<p class="g-by">${AUTHOR} · <time datetime="${p.dateModified}">${koDate(p.dateModified)} 수정</time></p>
${p.cover ? `<img class="g-cover" src="${esc(p.cover)}" alt="${esc(p.cover_alt)}" loading="eager" decoding="async">\n` : ""}<div class="g-sum"><b>세 줄 요약</b><ul>${p.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>
<div class="g-body">
${mdToHtml(p.body_md)}
</div>
<section class="g-sec" aria-labelledby="g-faq"><h2 id="g-faq">자주 묻는 질문</h2>
${p.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}
</section>
${rel.length ? `<section class="g-sec" aria-labelledby="g-rel"><h2 id="g-rel">같이 읽으면 좋은 글</h2><div class="g-cards">${rel.map(card).join("")}</div></section>\n` : ""}<div class="g-cta"><p>우리 가게도 AI가 추천하는지<br>무료 리포트로 확인해 보세요.</p><a class="kbtn kbtn-lg fbtn" href="/#inquiry" data-pos="guide-cta">무료 리포트 신청하기</a></div>
</div></article>
</main>`;
  return head + main + pageTail(H);
}

const TABS = [["", "전체"], ["restaurant", "식당"], ["cafe", "카페"], ["bar", "술집"], ["case", "후기"]];
export function renderList(H, posts) {
  const url = `${SITE}/${GUIDE_DIR}/`;
  const title = "식당·카페·술집 사장님 가이드 | 토크비(TalkB)";
  const desc = "식당·카페·술집 사장님이 플레이스 광고, 리뷰, AI 검색에서 손님을 만나는 방법을 토크비가 매주 확인한 결과로 정리한 가이드예요.";
  const sorted = [...posts].sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1));
  const ld = sorted.length ? [
    { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${url}#page`, url, name: "식당·카페·술집 사장님 가이드", description: desc, inLanguage: "ko", publisher: ORG,
      mainEntity: { "@type": "ItemList", itemListElement: sorted.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: urlOf(p.slug), name: p.title })) } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "토크비", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "가이드", item: url }] },
  ] : [];
  const head = pageHead(H, { title, desc, canonical: url, robots: sorted.length ? "index, follow, max-snippet:-1, max-image-preview:large" : "noindex, follow", ogType: "website", image: `${SITE}/og-image.png?v=5`, imageAlt: "식당·카페·술집 사장님 가이드", ld });
  const body = sorted.length
    ? `<div class="g-tabs" role="group" aria-label="업종 고르기" id="gTabs" hidden>${TABS.map(([v, l], i) => `<button type="button" class="g-tab" data-f="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
<div class="g-cards" id="gCards">${sorted.map(card).join("")}</div>
<p class="g-empty" id="gNone" hidden>이 업종 글은 준비하고 있어요.</p>
<script>
(function(){
  var tabs = document.getElementById("gTabs"), cards = document.querySelectorAll("#gCards .g-card"), none = document.getElementById("gNone");
  if (!tabs) return; tabs.hidden = false;
  function apply(f){
    var n = 0;
    cards.forEach(function(c){ var v = c.getAttribute("data-v"), k = c.getAttribute("data-k");
      var on = !f || (f === "case" ? k === "case" : (v === f || v === "all")); c.hidden = !on; if (on) n++; });
    none.hidden = n > 0;
    tabs.querySelectorAll(".g-tab").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-f") === f)); });
  }
  tabs.addEventListener("click", function(e){ var b = e.target.closest(".g-tab"); if (b) apply(b.getAttribute("data-f")); });
})();
</script>`
    : `<p class="g-empty">첫 글을 준비하고 있어요.</p>`;
  const main = `<main class="g-main">
<div class="wrap">
<nav class="g-crumb" aria-label="현재 위치"><a href="/">홈</a><span aria-hidden="true">›</span><span>가이드</span></nav>
<h1 class="g-h1">식당·카페·술집 사장님 가이드</h1>
<p class="lead" style="margin-top:12px">플레이스 광고, 리뷰, AI 검색에서 손님을 만나는 방법을 매주 확인한 결과로 정리해요.</p>
${body}
<div class="g-cta"><p>우리 가게도 AI가 추천하는지<br>무료 리포트로 확인해 보세요.</p><a class="kbtn kbtn-lg fbtn" href="/#inquiry" data-pos="guide-list-cta">무료 리포트 신청하기</a></div>
</div>
</main>`;
  return head + main + pageTail(H);
}

/** 사이트맵 · <!-- guide:start --> 묶음을 지우고 1편 이상이면 다시 넣는다(다른 항목은 그대로) */
export function applySitemap(sm, posts) {
  let out = sm.replace(/\n?[ \t]*<!-- guide:start[\s\S]*?<!-- guide:end -->[ \t]*\n?/, "\n");
  if (out !== sm) out = out.replace(/\n\n(\s*<\/urlset>)/, "\n$1");
  if (!posts.length) return out === sm ? sm : out;
  const latest = posts.reduce((a, p) => (p.dateModified > a ? p.dateModified : a), "");
  const block = [
    "  <!-- guide:start · scripts/build-posts.mjs 가 만든다(게시 글 1편 이상일 때만) -->",
    `  <url>\n    <loc>${SITE}/${GUIDE_DIR}/</loc>\n    <lastmod>${ymd(latest)}</lastmod>\n  </url>`,
    ...posts.map((p) => `  <url>\n    <loc>${urlOf(p.slug)}</loc>\n    <lastmod>${ymd(p.dateModified)}</lastmod>\n  </url>`),
    "  <!-- guide:end -->",
  ].join("\n");
  return out.replace(/\n?<\/urlset>/, `\n${block}\n</urlset>`);
}

/** llms.txt "가이드 글" 섹션 · 0편이면 빈 문자열 */
export function llmsSection(posts) {
  if (!posts.length) return "";
  const sorted = [...posts].sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1));
  return `\n\n## 가이드 글\n\n- 목록: ${SITE}/${GUIDE_DIR}/\n${sorted.map((p) => `- ${p.title}: ${urlOf(p.slug)} · ${p.lines[0] ?? ""}`).join("\n")}`;
}

/** 예전에 만든 글 페이지 중 이번에 안 만든 것 → 지우지 않고 noindex */
function demoteStale(outRoot, keep) {
  const dir = join(outRoot, GUIDE_DIR);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || keep.has(d.name)) continue;
    const f = join(dir, d.name, "index.html");
    if (!existsSync(f)) continue;
    const t = readFileSync(f, "utf8");
    const t2 = t.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
    if (t2 !== t) writeFileSync(f, t2);
    out.push(d.name);
  }
  return out;
}

/**
 * 렌더 · rows(DB 줄) → outRoot/guide/ 에 쓰고 게시 목록을 돌려준다
 *   log: 건너뛴 글 · noindex 로 바꾼 글
 */
export function buildGuide({ root = ROOT, outRoot = ROOT, rows, stores, consents, partnerNames, now, log = console.log }) {
  const H = homeParts(root);
  const ready = [];
  for (const r of rows) {
    const res = preparePost(r, { stores, consents, partnerNames, now });
    if (res.ok) ready.push(res.post);
    else log(`글 건너뜀 · ${res.slug || res.id} · ${res.why.join(" / ")}`);
  }
  const slugs = new Set();
  const posts = ready.filter((p) => (slugs.has(p.slug) ? (log(`글 건너뜀 · ${p.slug} · 같은 슬러그 중복`), false) : (slugs.add(p.slug), true)));
  mkdirSync(join(outRoot, GUIDE_DIR), { recursive: true });
  for (const p of posts) {
    mkdirSync(join(outRoot, GUIDE_DIR, p.slug), { recursive: true });
    writeFileSync(join(outRoot, GUIDE_DIR, p.slug, "index.html"), renderPost(H, p, posts));
  }
  writeFileSync(join(outRoot, GUIDE_DIR, "index.html"), renderList(H, posts));
  const stale = demoteStale(outRoot, slugs);
  if (stale.length) log(`예전 글 페이지 noindex 로 둠: ${stale.join(", ")}`);
  log(`가이드 글 ${posts.length}편 생성${posts.length ? "" : " · 목록 noindex"}`);
  return posts;
}

/** 게시 목록 기록(커밋됨) · 상태 전환과 DB 실패 때 폴백이 읽는다 */
export function writeManifest(posts) {
  const m = { posts: posts.map((p) => ({ id: p.id, slug: p.slug, title: p.title, line1: p.lines[0] ?? "", vertical: p.vertical, kind: p.kind, status: p.status, datePublished: p.datePublished, dateModified: p.dateModified })) };
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + "\n");
}
export function readManifest() {
  try { const m = JSON.parse(readFileSync(MANIFEST, "utf8")); return Array.isArray(m.posts) ? m.posts.map((p) => ({ ...p, lines: [p.line1] })) : []; } catch { return []; }
}

// ── 게시 상태 전환(push 성공 뒤에만 · weekly-refresh.mjs 가 --commit-status 로 부른다) ──
async function commitStatus(commit) {
  const wait = readManifest().filter((p) => p.status === "approved" && p.id);
  if (!wait.length) { console.log("게시로 바꿀 승인 글 없음"); return; }
  if (!commit) { for (const p of wait) console.log(`[dry] 게시로 바꿀 글 · ${p.slug} · ${p.title}`); console.log("DB는 바꾸지 않았어요(--commit-status 로만 바꿈)"); return; }
  const { dbEnv } = await import("./landing-db.mjs");
  const e = dbEnv();
  const H = { ...e.H, "Content-Type": "application/json", Prefer: "return=representation" };
  for (const p of wait) {
    const r = await fetch(`${e.U}/rest/v1/talkb_posts?id=eq.${p.id}&status=eq.approved&select=id`, { method: "PATCH", headers: H, body: JSON.stringify({ status: "published", updated_at: new Date().toISOString() }) });
    const j = await r.json();
    if (!r.ok) { console.error(`상태 전환 실패 · ${p.slug} · ${JSON.stringify(j).slice(0, 200)}`); continue; }
    if (!Array.isArray(j) || !j.length) { console.log(`건너뜀 · ${p.slug} · 이미 승인 상태가 아님`); continue; }
    await fetch(`${e.U}/rest/v1/talkb_posts?id=eq.${p.id}&published_at=is.null`, { method: "PATCH", headers: H, body: JSON.stringify({ published_at: p.datePublished }) });
    const ev = await fetch(`${e.U}/rest/v1/talkb_post_events`, { method: "POST", headers: H, body: JSON.stringify({ post_id: p.id, action: "publish", actor: "landing-build", note: urlOf(p.slug) }) });
    console.log(`게시로 바꿈 · ${p.slug}${ev.ok ? "" : " · 기록 실패"}`);
  }
}

// 홈 후기 · <!--reviews:start-->…<!--reviews:end--> 자리를 talkb_testimonials(show_on_home · sort 순)로 바꾼다
//   매장 연결(store_id)이 있고 실명 동의가 없거나 철회됐으면(파트너 매장 포함) 이름 · 사람 표기 · 매장 사진을 가린다(동네 + 업종 · 모르면 "사장님 후기")
//   store_id 없는 예전 후기는 템플릿의 같은 후기(사진 · 원문이 같은 것)를 줄바꿈까지 그대로 쓴다(이미 게시돼 있던 것)
const escH = esc;
const plainQuote = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/[“”]/g, "").replace(/\s+/g, " ").trim();
export function fillReviews(text, db, warn = console.warn) {
  const m = /<!--reviews:start[^>]*-->\n([\s\S]*?)\n<!--reviews:end-->/.exec(text);
  if (!m) throw new Error("홈 템플릿에 후기 자리(reviews:start)가 없음");
  const tplFigs = m[1].match(/<figure class="rs"[\s\S]*?<\/figure>/g) ?? [];
  let figs = null;
  if (db) {
    const rows = [];
    for (const t of db.testimonials) {
      const st = t.store_id ? db.stores.find((s) => s.id === t.store_id) : null;
      const masked = !!t.store_id && !nameAllowed(t.store_id, db.stores, db.consents);
      if (masked) {
        const names = [st?.name, t.store_name].filter((n) => n && n.replace(/\s+/g, "").length >= 3);
        if (names.some((n) => t.quote.includes(n))) { warn(`홈 후기 뺌 · 실명 동의 없는 매장 이름이 원문에 있음 · ${t.store_name}`); continue; }
        const where = [st?.region_dong, st?.category_main].filter(Boolean).join(" ");
        rows.push({ t, caption: where ? `${where} 사장님` : "사장님 후기", alt: null });
      } else {
        rows.push({ t, caption: t.person_label ? `${t.store_name} · ${t.person_label}` : t.store_name, alt: t.store_name });
      }
    }
    if (rows.length) {
      figs = rows.map(({ t, caption, alt }) => {
        if (!t.store_id) {
          const same = tplFigs.find((f) => f.includes(`src="${t.photo_path}"`) && plainQuote(/<blockquote>([\s\S]*?)<\/blockquote>/.exec(f)?.[1]) === plainQuote(t.quote) && plainQuote(/<figcaption>([\s\S]*?)<\/figcaption>/.exec(f)?.[1]) === plainQuote(caption));
          if (same) return same;
        }
        const img = alt && t.photo_path ? `<img class="rv-img" src="${escH(t.photo_path)}" alt="${escH(alt)} 매장 사진" width="640" height="400" loading="lazy" decoding="async">` : "";
        const q = escH(t.quote).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('<br class="pc-br"> ');
        return `<figure class="rs${img ? "" : " rs-noimg"}" id="rs0" role="group" aria-roledescription="후기" aria-label="1 / 1">${img}<div><blockquote>“${q}”</blockquote><figcaption>${escH(caption)}</figcaption></div></figure>`;
      });
    } else warn("경고 · 홈에 보일 후기가 DB에 없음(템플릿 후기 사용)");
  }
  if (!figs) figs = tplFigs;
  const n = figs.length;
  figs = figs.map((f, i) => f.replace(/ id="rs\d+"/, ` id="rs${i}"`).replace(/aria-label="\d+ \/ \d+"/, `aria-label="${i + 1} / ${n}"`));
  return { count: n, text: text.slice(0, m.index) + figs.join("\n") + text.slice(m.index + m[0].length) };
}

// ── 시험용 가짜 글(--fixture) · 메모리에서만 ──
function fixtureRows() {
  const now = "2026-10-20T01:00:00.000Z";
  const base = { checks: { blockers: [] }, status: "approved", approved_at: now, published_at: null, content_updated_at: now, cover_path: null, cover_alt: null, store_id: null };
  return {
    rows: [
      { ...base, id: "00000000-0000-0000-0000-000000000001", kind: "guide", vertical: "restaurant", slug: "naver-ai-tab-restaurant-info",
        title: "네이버 AI탭에 가게가 나오려면, 식당이 먼저 채울 정보 10가지",
        summary: "네이버 AI탭은 플레이스에 적힌 정보로 가게를 고르기 때문에 빈칸부터 채워야 해요.\n영업시간·주차·메뉴 가격·단체석처럼 손님이 묻는 정보를 먼저 적어요.\n채운 뒤에는 같은 질문을 다시 물어 답이 바뀌는지 확인해요.",
        body_md: "## 네이버 AI탭은 무엇을 보고 가게를 고르나요\n\n손님이 \"주차되는 고깃집\"처럼 물으면 AI탭은 **플레이스 정보와 리뷰**에서 근거를 찾아요.\n\n## 먼저 채울 정보 10가지\n\n1. 영업시간과 휴무일\n2. 주차 가능 여부와 대수\n3. 대표 메뉴 가격\n4. 단체석·룸\n5. 예약 방법\n\n| 정보 | 손님 질문 예 |\n|---|---|\n| 주차 | 주차되는 식당 알려줘 |\n| 룸 | 회식하기 좋은 룸 있는 곳 |\n\n> 토크비 측정은 ChatGPT 기준이라 AI탭 노출을 약속하지 않아요.\n\n자세한 요금은 [요금제](/pricing/)에서 볼 수 있어요.",
        faq: [{ q: "AI탭에 꼭 나오게 해 주나요?", a: "아니요. 토크비는 ChatGPT 추천을 매주 확인하고 가게 정보를 정리해 드려요. AI탭 노출은 약속하지 않아요." }, { q: "정보를 채우면 바로 바뀌나요?", a: "반영까지 보통 1~3주가 걸려요. 같은 질문을 다시 물어 확인해요." }] },
      { ...base, id: "00000000-0000-0000-0000-000000000002", kind: "data", vertical: "cafe", slug: "chatgpt-cafe-reasons-2026-09",
        title: "ChatGPT가 카페를 추천할 때 든 이유 순위 (2026년 9월 답 1,240건)",
        summary: "2026년 9월 ChatGPT 답 1,240건에서 카페 추천 이유를 세어 보니 분위기와 좌석이 가장 많았어요.\n주차·디저트 메뉴가 그다음이었고 가격은 적게 나왔어요.\n가게 정보에 좌석 수와 분위기를 구체적으로 적은 카페가 더 자주 나왔어요.",
        body_md: "## 집계 방법\n\n2026년 9월 1일부터 30일까지 카페 질문 답 1,240건을 셌어요.\n\n| 순위 | 이유 | 건수 |\n|---|---|---|\n| 1 | 분위기·인테리어 | 412건 |\n| 2 | 좌석·공간 | 318건 |\n| 3 | 주차 | 201건 |\n| 4 | 디저트 메뉴 | 187건 |\n\n## 읽는 법\n\n- 분위기는 사진보다 **글로 적힌 설명**이 인용됐어요.\n- 가격 이야기는 적었어요.",
        faq: [{ q: "어떤 질문으로 집계했나요?", a: "매장 이름을 빼고 손님처럼 묻는 카페 질문으로 집계했어요." }, { q: "매장 이름도 볼 수 있나요?", a: "집계 숫자만 공개하고 매장 이름은 쓰지 않아요." }, { q: "다음 집계는 언제인가요?", a: "매달 한 번 같은 방법으로 다시 세어요." }] },
      { ...base, id: "00000000-0000-0000-0000-000000000003", kind: "case", vertical: "restaurant", slug: "case-suwon-dakbokkeumtang", store_id: "fx-store-1",
        title: "수원 인계동 닭볶음탕집, ChatGPT 추천률 46%에서 63%로 (12주)",
        summary: "수원 인계동 닭볶음탕집은 12주 만에 ChatGPT 추천률이 46%에서 63%로 올랐어요.\n가게 정보 18개 항목을 정리하고 소개 글을 매주 발행했어요.\n사장님은 예약 전화가 늘었다고 말씀해 주셨어요.",
        body_md: "## 시작할 때\n\n\"수원 닭볶음탕 추천해줘\" 질문에서 다른 가게가 먼저 나왔어요.\n\n## 한 일\n\n- 메뉴·가격·주차·단체석 정보 18개 항목 정리\n- 소개 글 12편 발행\n\n## 결과\n\n| 기간 | 추천률 |\n|---|---|\n| 시작 4주 | 46% |\n| 최근 4주 | 63% |\n\n> 요즘은 지피티 보고 왔다는 손님이 종종 있어요",
        faq: [{ q: "어떤 질문으로 쟀나요?", a: "매장 이름 없이 손님처럼 묻는 질문 20개를 매주 물었어요." }, { q: "다른 가게도 이렇게 오르나요?", a: "가게마다 달라요. 무료 리포트로 먼저 확인해 보세요." }] },
      // 막힘 확인용(렌더되면 안 됨) · 실명 동의 없는 매장 이름이 본문에 있음
      { ...base, id: "00000000-0000-0000-0000-000000000004", kind: "case", vertical: "restaurant", slug: "case-should-skip", store_id: "fx-store-1",
        title: "실명 동의 없는 후기 글이 걸러지는지 보는 시험 글",
        summary: "한 줄\n두 줄\n세 줄", body_md: "도시농원 수원인계본점 이야기예요.", faq: [{ q: "a", a: "b" }, { q: "c", a: "d" }] },
    ],
    stores: [{ id: "fx-store-1", name: "도시농원 수원인계본점", aliases: [], region_dong: "인계동", category_main: "닭볶음탕", partner_id: null }],
    consents: [],
    partnerNames: [],
    now: new Date(now),
  };
}

// ── CLI ──
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  if (args.includes("--fixture")) {
    const oi = args.indexOf("--out");
    const out = oi >= 0 ? args[oi + 1] : null;
    if (!out) { console.error("--fixture 는 --out <폴더> 가 필요해요(저장소 밖 임시 폴더)"); process.exit(1); }
    const fx = fixtureRows();
    const posts = buildGuide({ outRoot: out, ...fx });
    writeFileSync(join(out, "sitemap.preview.xml"), applySitemap(readFileSync(join(ROOT, "sitemap.xml"), "utf8"), posts));
    writeFileSync(join(out, "llms.preview.txt"), llmsSection(posts));
    // 홈 후기 시험 · 지금 홈(index.html)의 후기 자리만 가짜 후기로 바꿔 <out>/index.html 로(예전 5개 + 동의 없는 매장 1 + 동의한 매장 1)
    const legacy = [
      ["탐라담 영종도점", "백지혜 사장님", "지피티에게 저희 동네 고기집이라던가 맛집을 물어보면 항상 다른 경쟁업체만 얘기했었는데, 토크비 이용 후에 지피티에서 추천받고 연락 하셨다고 12명 예약 하시는 분도 생기고 전화 문의도 많이 늘었어요! 종종 지피티 추천 받았다고 얘기해주시는분도 있어서 너무 기분좋아요ㅎㅎ", "/images/reviews/tamladam.jpg"],
      ["인생뼈다귀 본점", "이현민 사장님", "답변률도 좋아지고 바뀌는 시대에 맞게 발빠르게 준비할 수 있는 좋은 시스템인거 같아요 !! 발빨라진느낌이라고 해야할까요?!! 앞으로도 기대가 됩니다 !! ㅎㅎㅎ", "/images/reviews/insaeng.jpg"],
      ["일산게장집", null, "ChatGpt를 활용한 마케팅도 기본적으로 수반되어야 한다 생각됩니다. 맛있는 음식을 만들기만 잘해서는 성공이 어려운 현재의 시대! 토크B가 많은 도움이 되고있습니다^^", "/images/reviews/ilsan-gejang.jpg"],
      ["부대찌개대사관 인하대역점", null, "ChatGPT에서 저희 매장이 두번째로 추천되는 걸 확인했어요. 네이버로 두번째 추천될려면 엄청난 비용이 드는데~~ 토크비 서비스는 저렴한 금액으로 매장 홍보를 가능하게 해 주네요. ChatGPT 검색이 더 활성화 되면 고객 유입이 더 늘어날 것으로 기대됩니다.", "/images/reviews/budae-inha.jpg"],
      ["부대찌개대사관 마곡직영점", "전선용 대표", "점차 답변률이 올라가는거 같아 기대가 큽니다ㅎㅎ", "/images/reviews/budae-magok.jpg"],
    ].map(([store_name, person_label, quote, photo_path]) => ({ store_id: null, store_name, person_label, quote, photo_path }));
    const fdb = {
      testimonials: [...legacy,
        { store_id: "fx-store-1", store_name: "도시농원 수원인계본점", person_label: "김가상 사장님", quote: "요즘은 지피티 보고 왔다는 손님이 종종 있어요", photo_path: "/images/reviews/tamladam.jpg" },
        { store_id: "fx-store-2", store_name: "가상카페 본점", person_label: "이가상 사장님", quote: "주말 손님이 늘었어요\n다음 달도 기대돼요", photo_path: "/images/reviews/insaeng.jpg" }],
      stores: [...fx.stores, { id: "fx-store-2", name: "가상카페 본점", aliases: [], region_dong: "행궁동", category_main: "카페", partner_id: null }],
      consents: [{ store_id: "fx-store-2", consented: true, revoked_at: null }],
    };
    const home = readFileSync(join(ROOT, "index.html"), "utf8");
    const a = '<div class="rs-track" id="rsTrack">\n', b = '\n</div></div>\n<div class="wrap"><div class="rs-nav">';
    const i = home.indexOf(a), k = home.indexOf(b);
    if (i < 0 || k < 0) throw new Error("index.html 후기 자리를 못 찾음");
    const tplLike = home.slice(0, i + a.length) + "<!--reviews:start-->\n" + home.slice(i + a.length, k) + "\n<!--reviews:end-->" + home.slice(k);
    const r = fillReviews(tplLike, fdb);
    writeFileSync(join(out, "index.html"), r.text.replace(/(id="rsCount">1 \/ )\d+/, `$1${r.count}`));
    console.log("홈 후기 시험", r.count, "개 · <out>/index.html");
    console.log("fixture 렌더 끝 ·", out);
  } else {
    await commitStatus(args.includes("--commit-status"));
  }
}
