/* 토크비 랜딩 공용 계측(2026-10-07 개편) · 홈·인사이트·자료·404 모두 이 파일 하나
   - tb_vid(방문자), tb_team(팀 기기 제외), tb_ref(할인코드 30일)는 종전 규칙 그대로
   - 홈(<script data-home="1">)만 landing_view 를 보낸다 · 퍼널 1단계 = 홈 방문(종전 정의 유지)
   - 카카오 상담 버튼(pf.kakao.com) 클릭 = kakao_click · props: pos(버튼 위치), page, variant(제목 A/B)
   - 앱 셀프 진단(app.talkb.co.kr/onboard) 클릭 = landing_cta_click(종전 이벤트) + vid·ref 꼬리표
   - 랜딩 행동 세션 요약(10/22) = /api/track/session · 맨 아래 블록 */
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

  // 유입 경로 저장(2026-10-19) · 문의폼이 문의와 함께 보낸다(어느 광고·검색에서 온 문의인지 · 어드민 퍼널 유입별 비교).
  // 광고·검색 꼬리표나 바깥 사이트에서 온 방문만 덮어쓴다 · 나중의 직접 재방문이 광고 유입을 지우지 않게.
  try {
    var refHost = ""; try { refHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e0) {}
    var outside = !!refHost && !/(^|\.)talkb\.co\.kr$/.test(refHost);
    var tagged = !!(p.get("utm_source") || p.get("fbclid") || p.get("gclid"));
    if (tagged || outside || !localStorage.getItem("tb_attr")) {
      localStorage.setItem("tb_attr", JSON.stringify({
        utm_source: p.get("utm_source") || (p.get("fbclid") ? "meta" : p.get("gclid") ? "google" : null),
        utm_medium: p.get("utm_medium"), utm_campaign: p.get("utm_campaign"), utm_content: p.get("utm_content"),
        referrer: outside ? document.referrer.slice(0, 300) : null, landing: location.pathname, at: new Date().toISOString(),
        // 메타 광고 클릭 ID(10/21) · 서버가 _fbc 쿠키가 없을 때 fb.1.{클릭 시각}.{fbclid} 로 만들어 전환 API에 싣는다
        fbclid: p.get("fbclid") ? p.get("fbclid").slice(0, 500) : null
      }));
    }
  } catch (e) {}

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

  // 랜딩 행동 세션 요약(2026-10-22 · SQL 193 · PLAN-talkb-landing-behavior) · 방문 한 번 = 행 하나를 덮어쓴다
  // 어느 구역까지 봤나 · 얼마나 머물렀나 · 무엇을 눌렀나 · 무엇 위에서 망설였나 · 어디서 나갔나
  // 폼 입력값은 읽지 않는다(칸을 눌렀는지·썼는지만) · 마우스는 원본 궤적 대신 구역별 20×20 칸 수
  // Clarity(무료 화면 녹화)는 CLARITY_ID 를 채우면 켜진다 · 팀 기기는 녹화하지 않는다
  var CLARITY_ID = "z1h51fvwbn";
  (function () {
    var SES_API = "https://app.talkb.co.kr/api/track/session";
    var now = function () { return Date.now(); };
    var T0 = now(), sid = null, returning = false;
    try {
      var old = JSON.parse(sessionStorage.getItem("tb_sid") || "null");
      if (old && old.id && T0 - old.at < 30 * 60000) sid = old.id;
    } catch (e) {}
    if (!sid) sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (T0.toString(36) + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    function touch() { try { sessionStorage.setItem("tb_sid", JSON.stringify({ id: sid, at: now() })); } catch (e) {} }
    touch();
    try { returning = !!localStorage.getItem("tb_seen"); localStorage.setItem("tb_seen", "1"); } catch (e) {}
    window.TB_SID = sid;

    if (CLARITY_ID && !isTeam()) {
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, "clarity", "script", CLARITY_ID);
      try {
        clarity("identify", vid || sid, sid); clarity("set", "sid", sid); if (variant) clarity("set", "variant", variant);
        // 태그(PLAN-talkb-landing-cro §12-1) · 소재 · 유입 묶음 · 재방문 · 실험 ID 로 녹화를 골라 본다
        if (p.get("utm_content")) clarity("set", "utm_content", p.get("utm_content").slice(0, 80));
        clarity("set", "src", p.get("fbclid") || /meta|facebook|instagram/i.test(p.get("utm_source") || "") ? "meta" : /naver|google|daum|bing/i.test(document.referrer) ? "search" : document.referrer ? "etc" : "direct");
        if (window.TB_EXP) clarity("set", "exp", String(window.TB_EXP));
      } catch (e) {}
    }
    // 행동 이벤트를 GA4 · 메타 픽셀 · Clarity 에 한 번씩(cro §8 · 입력값 없음)
    var once = {};
    function sig(name) { if (once[name]) return; once[name] = 1; mid(name); try { if (window.clarity) clarity("event", name); } catch (e) {} }

    var mobile = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || innerWidth <= 640;
    var S = { sections: {}, path: [], clicks: [], hesitations: [], cta_seen: {}, form: { fields: {}, last: null, submitted: false }, faq_open: [], heat: {},
      flags: { rage: 0, dead: 0, exit_intent: 0, copies: [], tab_hidden_ms: 0, backtracks: [], pauses: [] }, max_scroll_pct: 0, exit_section: null };
    var secs = [], cur = null, maxIdx = -1, dirty = true, sent = 0, mx = -1, my = -1, mAt = 0, hiddenAt = 0;
    function t() { return now() - T0; }
    function el2name(el) {
      var n = el.getAttribute("data-track") || el.getAttribute("data-pos") || el.id;
      if (!n) n = ((el.textContent || "").replace(/\s+/g, " ").trim()).slice(0, 24) || el.tagName.toLowerCase();
      return n.slice(0, 40);
    }
    function secAt(pageY) {
      for (var i = 0; i < secs.length; i++) { var r = secs[i].el.getBoundingClientRect(), top = r.top + scrollY; if (pageY >= top && pageY < top + r.height) return { k: secs[i].k, i: i, top: top, h: r.height }; }
      return null;
    }
    function rel(pageX, pageY) {
      var s = secAt(pageY); if (!s) return null;
      return { sec: s.k, x: Math.round(pageX / Math.max(1, document.documentElement.clientWidth) * 1000) / 1000, y: Math.round((pageY - s.top) / Math.max(1, s.h) * 1000) / 1000, s: s };
    }

    // 0.25초마다 · 화면에 보인 구역 · 머문 시간 · 지나온 길 · 마우스 칸 · 스크롤 깊이(탭이 숨겨져 있으면 쉰다)
    var lastTick = now(), lastScrollAt = now(), pausedAt = -1;
    function tick() {
      var n = now(), dt = n - lastTick; lastTick = n;
      if (document.hidden || !secs.length) return;
      var vh = innerHeight, best = null, bestV = 0;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].el.getBoundingClientRect(), v = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        if (v >= Math.min(r.height * 0.5, vh * 0.5) && v > 0) {
          var o = S.sections[secs[i].k] || (S.sections[secs[i].k] = { first_ms: t(), ms: 0, visits: 0 });
          o.ms += Math.min(dt, 1000);
        }
        if (v > bestV) { bestV = v; best = i; }
      }
      if (best !== null && best !== cur) {
        var k = secs[best].k;
        if (S.path.length < 60) S.path.push([k, t()]);
        S.sections[k] = S.sections[k] || { first_ms: t(), ms: 0, visits: 0 };
        S.sections[k].visits++;
        if (best < maxIdx && cur !== null && S.flags.backtracks.length < 20) S.flags.backtracks.push([secs[cur].k, k, t()]);
        cur = best; if (best > maxIdx) maxIdx = best; S.exit_section = k; dirty = true;
      }
      // 떠날 때 보던 자리(10/22) · 화면 가운데가 지금 구역의 위에서 몇 % 지점인가 · 어드민 캐릭터 세로 자리
      if (cur !== null) { var cr = secs[cur].el.getBoundingClientRect(), ey = Math.max(0, Math.min(1, (vh / 2 - cr.top) / Math.max(1, cr.height))); ey = Math.round(ey * 100) / 100; if (ey !== S.flags.exit_y) S.flags.exit_y = ey; }
      var docH = document.documentElement.scrollHeight, pct = Math.min(100, Math.round((scrollY + vh) / Math.max(1, docH) * 100));
      if (pct > S.max_scroll_pct) { S.max_scroll_pct = pct; dirty = true; }
      if (!mobile && mx >= 0 && n - mAt < 2000) {
        var p = rel(mx + scrollX, my + scrollY);
        if (p) { var h = S.heat[p.sec] || (S.heat[p.sec] = {}), c = Math.min(19, Math.floor(p.y * 20)) * 20 + Math.min(19, Math.floor(p.x * 20)); h[c] = (h[c] || 0) + 1; dirty = true; }
      }
      if (mobile && pausedAt !== lastScrollAt && n - lastScrollAt > 1500) {
        pausedAt = lastScrollAt;
        var q = rel(innerWidth / 2 + scrollX, scrollY + vh / 2);
        if (q && S.flags.pauses.length < 30) { S.flags.pauses.push([q.sec, q.y, t()]); dirty = true; }
      }
    }
    addEventListener("scroll", function () { lastScrollAt = now(); }, { passive: true });
    addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; mAt = now(); }, { passive: true });

    // 클릭 · 헛클릭(눌러도 1초 안에 아무 변화 없음) · 화난 클릭(1초 안 30px 안에서 3번)
    // 10/28 헛클릭 판정 바로잡기(PLAN-talkb-landing-deadclick-20261028 C)
    //  · 저절로 움직이는 곳(사례 흐름 · 후기 넘김 · 첫 화면 답변 넘김)의 변화는 반응으로 치지 않는다(그동안 헛클릭을 놓쳤다)
    //  · 글자를 끌어 고른 클릭은 헛클릭으로 세지 않는다
    var recent = [], mutated = false, AUTO = "#csRoll,#rsTrack,.hero-fig";
    if ("MutationObserver" in window) new MutationObserver(function (rs) {
      for (var i = 0; i < rs.length; i++) { var n = rs[i].target; n = n && n.nodeType === 1 ? n : n && n.parentElement; if (!n || !n.closest || !n.closest(AUTO)) { mutated = true; return; } }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    document.addEventListener("click", function (e) {
      var tg = e.target; if (!tg || !tg.closest) return;
      var act = tg.closest("a,button,input,select,textarea,label,summary,[role=button],[role=tab],[onclick],[data-track]");
      if (tg.closest('a[href*="pf.kakao.com"]')) S.flags.kakao = (S.flags.kakao || 0) + 1;
      var name = act ? el2name(act) : el2name(tg.closest("[id],[class]") || tg);
      var p = rel(e.pageX, e.pageY), ent = { el: name, sec: p ? p.sec : null, x: p ? p.x : null, y: p ? p.y : null, t: t() };
      if (S.clicks.length < 50) S.clicks.push(ent);
      if (hov && hov.el === (act || null)) hov.clicked = true;
      var n = now(); recent = recent.filter(function (r) { return n - r.at < 1000 && Math.abs(r.x - e.clientX) < 30 && Math.abs(r.y - e.clientY) < 30; });
      recent.push({ at: n, x: e.clientX, y: e.clientY });
      if (recent.length === 3) S.flags.rage++;
      var picked = ""; try { picked = String(window.getSelection ? getSelection() : ""); } catch (er) {}
      if (!act && !picked) {
        mutated = false; var y0 = scrollY;
        setTimeout(function () { if (!mutated && scrollY === y0) { ent.d = 1; S.flags.dead++; dirty = true; } }, 1000);
      }
      dirty = true;
    }, true);

    // 망설임 · 버튼 위에 1초 넘게 머물다가 누르지 않음(PC)
    var hov = null, CTA = "a[data-pos],a.kbtn,button[type=submit],[data-track],.pc-detail";
    document.addEventListener("mouseover", function (e) {
      var b = e.target && e.target.closest && e.target.closest(CTA); if (!b || (hov && hov.el === b)) return;
      hov = { el: b, at: now(), clicked: false };
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && e.clientY <= 0) { S.flags.exit_intent++; dirty = true; }
      if (!hov || (e.relatedTarget && hov.el.contains(e.relatedTarget))) return;
      var ms = now() - hov.at;
      if (ms >= 1000 && !hov.clicked && S.hesitations.length < 30) {
        var r = hov.el.getBoundingClientRect(), s = secAt(r.top + scrollY + r.height / 2);
        S.hesitations.push({ el: el2name(hov.el), sec: s ? s.k : null, ms: Math.min(ms, 60000), t: t() }); dirty = true;
        sig("cta_hesitate");
      }
      hov = null;
    }, { passive: true });

    // 폼 · 칸을 눌렀는지(f)·썼는지(e)·머문 ms(ms)·떠날 때 비어 있었는지(v) · 값 자체는 저장하지 않는다
    function fieldName(x) { return x && x.form && (x.name || x.id) ? String(x.name || x.id).slice(0, 30) : null; }
    var fAt = 0;
    document.addEventListener("focusin", function (e) { var k = fieldName(e.target); if (!k) return; var o = S.form.fields[k] || (S.form.fields[k] = { f: 0, e: false, ms: 0 }); o.f++; S.form.last = k; fAt = now(); dirty = true; sig("form_start"); });
    document.addEventListener("focusout", function (e) { var k = fieldName(e.target), o = k && S.form.fields[k]; if (!o || !fAt) return; o.ms += Math.min(now() - fAt, 600000); fAt = 0; if ("value" in e.target && e.target.type !== "checkbox") o.v = !!String(e.target.value).trim(); dirty = true; });
    document.addEventListener("input", function (e) { var k = fieldName(e.target); if (!k || !S.form.fields[k] || S.form.fields[k].e) return; S.form.fields[k].e = true; dirty = true; });
    document.addEventListener("submit", function () { S.form.submitted = true; dirty = true; try { if (window.clarity) clarity("set", "inquiry", "yes"); } catch (e) {} setTimeout(function () { send(false); }, 300); }, true);

    // 속도(cro §12-6) · LCP · CLS · INP 근사(가장 느린 반응) · 라이브러리 없이 브라우저 기본 기능으로
    var V = S.flags.vitals = {};
    function po(type, fn, opt) { try { new PerformanceObserver(function (l) { l.getEntries().forEach(fn); dirty = true; }).observe(opt || { type: type, buffered: true }); } catch (e) {} }
    po("largest-contentful-paint", function (en) { V.lcp = Math.round(en.startTime); });
    po("layout-shift", function (en) { if (!en.hadRecentInput) V.cls = Math.round(((V.cls || 0) + en.value) * 1000) / 1000; });
    po("event", function (en) { if (en.interactionId && en.duration > (V.inp || 0)) V.inp = Math.round(en.duration); }, { type: "event", buffered: true, durationThreshold: 40 });

    document.addEventListener("toggle", function (e) {
      var d = e.target; if (!d || !d.classList || !d.classList.contains("faq") || !d.open) return;
      var sm = d.querySelector("summary"), q = sm ? sm.textContent.trim().slice(0, 30) : "?";
      if (S.faq_open.indexOf(q) < 0 && S.faq_open.length < 20) { S.faq_open.push(q); dirty = true; }
    }, true);
    document.addEventListener("copy", function () {
      var sel = String(window.getSelection ? getSelection() : ""), node = getSelection && getSelection().anchorNode, el = node && (node.nodeType === 1 ? node : node.parentElement), r = el && el.getBoundingClientRect(), s = r ? secAt(r.top + scrollY) : null;
      if (S.flags.copies.length < 10) { S.flags.copies.push([s ? s.k : null, sel.length]); dirty = true; }
    });

    // 버튼이 화면에 보인 시간(누른 비율의 분모)
    var ctaIn = {};
    function watchCtas() {
      if (!("IntersectionObserver" in window)) return;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { var k = el2name(en.target); if (en.isIntersecting) ctaIn[k] = now(); else if (ctaIn[k]) { S.cta_seen[k] = (S.cta_seen[k] || 0) + now() - ctaIn[k]; delete ctaIn[k]; dirty = true; } });
      }, { threshold: 0.5 });
      [].forEach.call(document.querySelectorAll(CTA), function (b) { io.observe(b); });
    }

    function payload(final) {
      var cs = {}, n = now(), k;
      for (k in S.cta_seen) cs[k] = S.cta_seen[k];
      for (k in ctaIn) cs[k] = (cs[k] || 0) + n - ctaIn[k];
      var u = {}; ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (x) { if (p.get(x)) u[x] = p.get(x).slice(0, 120); });
      if (p.get("fbclid")) u.utm_source = u.utm_source || "meta";
      var o = { sid: sid, vid: vid, n: sent + 1, final: final ? 1 : 0, page: location.pathname, device: mobile ? "mobile" : "pc", vw: innerWidth, vh: innerHeight,
        doc_h: document.documentElement.scrollHeight, utm: u, referrer: document.referrer ? document.referrer.slice(0, 300) : null, variant: variant, returning: returning,
        sections: S.sections, path: S.path, clicks: S.clicks, hesitations: S.hesitations, cta_seen: cs, form: S.form, faq_open: S.faq_open, heat: S.heat,
        flags: S.flags, max_scroll_pct: S.max_scroll_pct, exit_section: S.exit_section };
      if (isTeam()) o.team = 1;
      var s = JSON.stringify(o);
      if (s.length > 10000) { o.heat = {}; s = JSON.stringify(o); }
      if (s.length > 10000) { o.clicks = o.clicks.slice(-15); s = JSON.stringify(o); }
      return s;
    }
    function send(final) {
      if ((!dirty && !final) || (sent >= 40 && !final)) return;
      try { if (navigator.sendBeacon(SES_API, payload(final))) { sent++; dirty = false; touch(); } } catch (e) {}
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { hiddenAt = now(); send(true); }
      else if (hiddenAt) { S.flags.tab_hidden_ms += now() - hiddenAt; hiddenAt = 0; lastTick = now(); }
    });
    addEventListener("pagehide", function () { send(true); });

    onReady(function () {
      [].forEach.call(document.querySelectorAll("[data-sec]"), function (el) { secs.push({ k: el.getAttribute("data-sec").slice(0, 20), el: el }); });
      if (!secs.length) secs.push({ k: "page", el: document.body });
      watchCtas();
      var start = function (cb) { if ("requestIdleCallback" in window) requestIdleCallback(cb, { timeout: 2000 }); else setTimeout(cb, 200); };
      start(function () { tick(); setInterval(tick, 250); setTimeout(function () { send(false); }, 3000); setInterval(function () { send(false); }, 15000); });
    });
  })();
})();
