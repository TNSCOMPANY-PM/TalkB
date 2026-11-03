// RSS(2026-11-03) · 게시된 글(가이드 · 사장님 이야기)로 /rss.xml 을 만든다 · build-index.mjs 가 부른다
//   node scripts/build-rss.mjs → DB 없이 data/guide-posts.json(게시 목록)으로만 다시 만든다
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathOf, readManifest } from "./build-posts.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://talkb.co.kr";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (iso) => new Date(iso).toUTCString();

/** 게시 글 목록 → rss.xml 글자 · 최신 글이 위 · 0편이어도 채널은 남긴다 */
export function rssXml(posts) {
  const list = posts.filter((p) => p.status === "published" || p.status == null)
    .sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1)).slice(0, 50);
  const last = list.reduce((a, p) => (p.dateModified > a ? p.dateModified : a), "");
  const items = list.map((p) => {
    const url = SITE + (p.path ?? pathOf(p));
    return [
      "  <item>",
      `    <title>${esc(p.title)}</title>`,
      `    <link>${url}</link>`,
      `    <guid isPermaLink="true">${url}</guid>`,
      `    <pubDate>${rfc822(p.datePublished)}</pubDate>`,
      `    <description>${esc(p.line1 ?? p.lines?.[0] ?? "")}</description>`,
      "  </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "  <title>토크비(TalkB) 콘텐츠</title>",
    `  <link>${SITE}/</link>`,
    "  <description>식당·카페·술집 사장님을 위한 AI 검색 마케팅 가이드와 사장님 이야기</description>",
    "  <language>ko</language>",
    `  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ...(last ? [`  <lastBuildDate>${rfc822(last)}</lastBuildDate>`] : []),
    ...items,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function writeRss(posts) {
  writeFileSync(join(ROOT, "rss.xml"), rssXml(posts));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const posts = readManifest();
  writeRss(posts);
  console.log(`rss.xml · 글 ${posts.length}편`);
}
