/* 토크비 랜딩 공용 계측(2026-10-07 개편) · 홈·인사이트·자료·404 모두 이 파일 하나
   - tb_vid(방문자), tb_team(팀 기기 제외), tb_ref(할인코드 30일)는 종전 규칙 그대로
   - 홈(<script data-home="1">)만 landing_view 를 보낸다 · 퍼널 1단계 = 홈 방문(종전 정의 유지)
   - 카카오 상담 버튼(pf.kakao.com) 클릭 = kakao_click · props: pos(버튼 위치), page, variant(제목 A/B)
   - 앱 셀프 진단(app.talkb.co.kr/onboard) 클릭 = landing_cta_click(종전 이벤트) + vid·ref 꼬리표 */
(function () {
  var API = "https://app.talkb.co.kr/api/track";
  var me = document.currentScript;
  var isHome = !!(me && me.getAttribute("data-home"));
  var vid = null;
  try {
    vid = localStorage.getItem("tb_vid");
    if (!vid) {
      vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(36).slice(2));
      localStorage.setItem("tb_vid", vid);
    }
  } catch (e) {}
  var p = new URLSearchParams(location.search);
  var TEAM_KEY = "tb_team";
  try { var tq = p.get("team"); if (tq === "1") localStorage.setItem(TEAM_KEY, "1"); else if (tq === "0") localStorage.removeItem(TEAM_KEY); } catch (e) {}
  function isTeam() { try { return localStorage.getItem(TEAM_KEY) === "1"; } catch (e) { return false; } }
  function beacon(payload) { try { if (isTeam()) payload.team = 1; navigator.sendBeacon(API, JSON.stringify(payload)); } catch (e) {} }
  var variant = window.TB_VARIANT || null;

  if (isHome) beacon({ event: "landing_view", visitor_id: vid, utm_source: p.get("utm_source"), utm_medium: p.get("utm_medium"), utm_campaign: p.get("utm_campaign"), utm_content: p.get("utm_content"), referrer: document.referrer || null, props: { variant: variant } });

  var REF_KEY = "tb_ref", REF_TS = "tb_ref_ts";
  try {
    var refQ = p.get("ref");
    if (refQ && /^[A-Za-z0-9-]{3,16}$/.test(refQ)) { localStorage.setItem(REF_KEY, refQ.toUpperCase()); localStorage.setItem(REF_TS, String(Date.now())); }
  } catch (e) {}
  function refCode() {
    try {
      var ts = Number(localStorage.getItem(REF_TS) || 0);
      if (!ts || Date.now() - ts > 30 * 86400000) return null;
      return localStorage.getItem(REF_KEY);
    } catch (e) { return null; }
  }
  function linkVid(a) {
    try {
      var u = new URL(a.href);
      if (vid && !u.searchParams.get("vid")) u.searchParams.set("vid", vid);
      var rc = refCode();
      if (rc && !u.searchParams.get("ref")) u.searchParams.set("ref", rc);
      a.setAttribute("href", u.toString());
    } catch (e) {}
  }
  function wire() { document.querySelectorAll('a[href*="app.talkb.co.kr/onboard"]').forEach(linkVid); }
  if (document.readyState !== "loading") wire(); else document.addEventListener("DOMContentLoaded", wire);
  function label(a) { return (((a.textContent || "").replace(/\s+/g, " ").trim()) || a.className || "").slice(0, 40); }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var k = t.closest('a[href*="pf.kakao.com"]');
    if (k) {
      var pos = k.getAttribute("data-pos") || "etc";
      beacon({ event: "kakao_click", visitor_id: vid, props: { pos: pos, page: location.pathname, variant: variant, cta: label(k) } });
      try { if (window.gtag) gtag("event", "kakao_click", { pos: pos, page_path: location.pathname, variant: variant }); } catch (e1) {}
      try { if (window.fbq) fbq("track", "Contact"); } catch (e2) {}
      return;
    }
    var a = t.closest('a[href*="app.talkb.co.kr/onboard"]');
    if (a) {
      linkVid(a);
      beacon({ event: "landing_cta_click", visitor_id: vid, props: { cta: label(a), page: location.pathname, pos: a.getAttribute("data-pos") || null, variant: variant } });
      try { if (window.gtag) gtag("event", "self_onboard_click", { page_path: location.pathname }); } catch (e3) {}
      try { if (window.fbq) fbq("trackCustom", "CTAClick_FreeDiagnosis"); } catch (e4) {}
    }
  }, true);

  // 중간 행동 3개(2026-10-08 레드팀) · 리타게팅 세분화용 · GA4·Meta 픽셀만, 앱 퍼널에는 보내지 않는다
  function mid(name) {
    try { if (window.gtag) gtag("event", name, { page_path: location.pathname, variant: variant }); } catch (e) {}
    try { if (window.fbq) fbq("trackCustom", name); } catch (e) {}
  }
  var scrolled = false;
  window.addEventListener("scroll", function () {
    if (scrolled) return;
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0 && scrollY / h >= 0.5) { scrolled = true; mid("scroll_50"); }
  }, { passive: true });
  function onReady(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  onReady(function () {
    var price = document.getElementById("price");
    if (price && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { mid("price_view"); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(price);
    }
    var faqSeen = false;
    document.addEventListener("toggle", function (e) {
      var d = e.target; if (faqSeen || !d || !d.classList || !d.classList.contains("faq") || !d.open) return;
      faqSeen = true; mid("faq_open");
    }, true);
  });
})();
