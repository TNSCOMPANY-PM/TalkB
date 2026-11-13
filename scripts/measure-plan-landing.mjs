// 측정 플랜 자리(2026-11-13) · data/measure-plan.json → 홈 · 요금제 · llms.txt 템플릿 자리 값
//   live 가 false 면 전부 빈 글자 · 자리는 기존 줄 끝에 붙어 있어 꺼져 있으면 만들어지는 파일이 이 작업 전과 글자 하나까지 같다
//   켜면 4곳(요금제 칸 · JSON-LD offers · FAQ · llms.txt)이 한 번에 같이 나간다(CLAUDE.md 가격 4곳 동기화)
//   주의 · 정규식이 들어 있어 node -e · sed로 고치지 않는다
import { readFileSync } from "node:fs";
import { join } from "node:path";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;

/** 빈 값 묶음 · 꺼져 있을 때 */
export const EMPTY_FIELDS = {
  measurePlanCard: "", measurePlanOffer: "", measurePlanOfferHome: "",
  measurePlanFaqLd: "", measurePlanFaqLdHome: "", measurePlanFaq: "", measurePlanLlms: "",
};

export function measurePlanFields(mp) {
  if (!mp || mp.live !== true) return { ...EMPTY_FIELDS };
  const url = String(mp.signupUrl);
  const card = [
    `<div class="mp-card" id="${esc(mp.anchor)}">`,
    `<style>.mp-card{max-width:820px;margin:28px auto 0;padding:20px 22px;border:1.5px dashed #E5E8EB;border-radius:18px;background:#fff;text-align:left;word-break:keep-all}.mp-card .mp-eb{font-size:12.5px;font-weight:800;color:#E85D3A;margin:0}.mp-card h3{font-size:19px;margin:4px 0 8px}.mp-card h3 span{font-size:13px;font-weight:600;color:#6B7684}.mp-card ul{margin:0 0 10px;padding-left:18px}.mp-card li{font-size:14.5px;line-height:1.65}.mp-card .mp-x{font-size:13px;color:#6B7684;line-height:1.6;margin:0 0 12px}.mp-card a.mp-go{display:inline-flex;align-items:center;min-height:46px;padding:0 18px;border-radius:12px;background:#191F28;color:#fff;font-weight:800;text-decoration:none}@media(max-width:640px){.mp-card{margin:20px 0 0;padding:18px 16px}}</style>`,
    `<p class="mp-eb">${esc(mp.eyebrow)}</p>`,
    `<h3>${esc(mp.name)} · ${won(mp.monthly)} / 월 <span>(VAT 별도)</span></h3>`,
    `<ul>${(mp.includes ?? []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`,
    `<p class="mp-x">${esc(mp.excludes)}</p>`,
    `<a class="mp-go" href="${esc(url)}" data-pos="measure-plan">${esc(mp.cta)}</a>`,
    `<p class="mp-x" style="margin:10px 0 0">${esc(mp.terms)}</p>`,
    `</div>`,
  ].join("\n");
  const offerObj = {
    "@type": "Offer", name: mp.name, description: mp.offerDescription, price: mp.monthly, priceCurrency: "KRW",
    priceSpecification: { "@type": "UnitPriceSpecification", price: mp.monthly, priceCurrency: "KRW", unitText: "매장당 월", billingDuration: "P1M", valueAddedTaxIncluded: false },
    url: `https://talkb.co.kr/pricing/#${mp.anchor}`,
  };
  const indent = (s, pad) => s.split("\n").map((l) => pad + l).join("\n");
  const faqObj = { "@type": "Question", name: mp.faq.q, acceptedAnswer: { "@type": "Answer", text: mp.faq.a } };
  return {
    measurePlanCard: `\n${card}`,
    measurePlanOffer: `,\n${indent(JSON.stringify(offerObj, null, 1), "  ")}`,
    measurePlanOfferHome: `,\n${indent(JSON.stringify(offerObj, null, 2), "    ")}`,
    measurePlanFaqLd: `,\n${indent(JSON.stringify(faqObj, null, 1), "  ")}`,
    measurePlanFaqLdHome: `,\n    ${JSON.stringify(faqObj)}`,
    measurePlanFaq: `\n<details class="faq"><summary>${esc(mp.faq.q)}</summary><p>${esc(mp.faq.a)}</p></details>`,
    measurePlanLlms: `\n${mp.llms}`,
  };
}

export function loadMeasurePlanFields(root) {
  const mp = JSON.parse(readFileSync(join(root, "data", "measure-plan.json"), "utf8"));
  return measurePlanFields(mp);
}
