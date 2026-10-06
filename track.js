/* 토크비 하위 페이지 공용 계측(2026-10-06) · 인사이트·자료·404에서 앱 온보드로 가는 버튼 처리
   index.html의 퍼널 계측과 같은 규칙(tb_vid·tb_ref·tb_team)을 쓴다.
   landing_view는 보내지 않는다. 퍼널 1단계(랜딩 조회)는 홈 방문만 센다는 기존 정의를 지키고,
   하위 페이지에서 일어난 신청 클릭만 landing_cta_click(props.page)로 남긴다. */
(function () {
  var API = "https://app.talkb.co.kr/api/track";
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
    var a = t.closest('a[href*="app.talkb.co.kr/onboard"]');
    if (!a) return;
    linkVid(a);
    beacon({ event: "landing_cta_click", visitor_id: vid, props: { cta: label(a), page: location.pathname } });
    try { if (window.gtag) gtag("event", "subpage_onboard_click", { page_path: location.pathname, cta: label(a) }); } catch (e2) {}
    try { if (window.fbq) fbq("trackCustom", "CTAClick_FreeDiagnosis"); } catch (e3) {}
  }, true);
})();
