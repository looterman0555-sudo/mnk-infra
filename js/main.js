// MNK Infra — HITT-style motion: panel color flip, giant titles, scroll slider, parallax

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isDesktop = function () { return window.innerWidth > 920; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ============ 1. Panel color flip (body black <-> white, 0.6s) ============ */
  var panels = document.querySelectorAll("[data-panel]");
  var currentTheme = "black";

  function updateTheme() {
    var mid = window.innerHeight * 0.5;
    for (var i = 0; i < panels.length; i++) {
      var r = panels[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        var t = panels[i].dataset.panel;
        if (t !== currentTheme) {
          currentTheme = t;
          document.body.classList.toggle("color-white", t === "white");
          document.body.classList.toggle("color-black", t === "black");
        }
        break;
      }
    }
  }

  /* ============ 2. Header + scroll progress ============ */
  var header = document.getElementById("siteheader");
  var scrollbarFill = document.getElementById("scrollbarFill");

  function updateHeader() {
    var y = window.scrollY || 0;
    header.classList.toggle("is-solid", y > 80);
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollbarFill) scrollbarFill.style.width = (docH > 0 ? (y / docH) * 100 : 0) + "%";
  }

  /* ============ 3. Smooth-scroll-driven values (lerp rAF loop) ============ */
  var giants = [].map.call(document.querySelectorAll("[data-giant]"), function (el) {
    return { el: el, parent: el.closest("section"), speed: parseFloat(el.dataset.giantSpeed) || 400, cur: 0, target: 0 };
  });

  var expSlider = document.getElementById("expSlider");
  var expTrack = document.getElementById("expTrack");

  var imgEls = [].map.call(document.querySelectorAll("[data-imgparallax]"), function (el) {
    return { el: el, cur: 0, target: 0 };
  });

  var circle = document.getElementById("circleAnim");
  var arcs = circle ? [].slice.call(circle.querySelectorAll(".arc")) : [];
  arcs.forEach(function (a) {
    var len = a.getTotalLength();
    a._len = len;
    a.style.strokeDasharray = len;
    a.style.strokeDashoffset = reduceMotion ? 0 : len;
  });

  var heroMedia = document.querySelector("[data-heromedia]");
  var heroSection = heroMedia ? heroMedia.closest(".hero") : null;

  function updateMotion() {
    var vh = window.innerHeight;
    var desktop = isDesktop();

    // hero video parallax — media drifts slower than scroll (HITT fixed-bg feel)
    if (heroMedia && heroSection && !reduceMotion) {
      var hR = heroSection.getBoundingClientRect();
      if (hR.bottom > -50 && hR.top < vh + 50) {
        heroMedia.style.transform = "translate3d(0," + (-hR.top * 0.16).toFixed(1) + "px,0)";
      }
    }

    // giant section titles: move horizontally as section crosses viewport
    giants.forEach(function (g) {
      if (!g.parent) return;
      var r = g.parent.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var progress = clamp((vh - r.top) / (vh + r.height), 0, 1);
      // Full-phrase sweep: "O" enters the white zone by ~p0.15 and the
      // tail passes by ~p0.67 — all while the giant is still on screen.
      g.target = (0.30 - progress) * g.speed * (desktop ? 1 : 0.5);
      if (reduceMotion) g.cur = g.target;
      g.cur = lerp(g.cur, g.target, 0.12);
      g.el.style.transform = "translate3d(" + g.cur.toFixed(1) + "px,0,0)";
    });

    // image up/down parallax inside frames
    imgEls.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (vh - r.top) / (vh + r.height); // 0 entering -> 1 leaving
      o.target = (0.5 - p) * 70; // px travel
      if (reduceMotion) o.cur = o.target;
      o.cur = lerp(o.cur, o.target, 0.08);
      o.el.style.transform = "translate3d(0," + o.cur.toFixed(1) + "px,0)";
    });

    // circle arcs draw with scroll
    if (circle && arcs.length) {
      var cr = circle.getBoundingClientRect();
      var cProg = clamp((vh * 0.85 - cr.top) / (vh * 0.6), 0, 1);
      if (reduceMotion) cProg = 1;
      arcs.forEach(function (a) {
        a.style.strokeDashoffset = (a._len * (1 - cProg)).toFixed(1);
      });
    }
  }

  var frameRequested = false;
  function frame() {
    frameRequested = false;
    updateTheme();
    updateHeader();
    updateMotion();
  }
  function requestFrame() {
    if (!frameRequested) { frameRequested = true; requestAnimationFrame(frame); }
  }
  // continuous loop keeps lerp smoothing alive while scrolling/animating
  (function loop() { updateMotion(); requestAnimationFrame(loop); })();

  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  frame();

  /* ============ 4. Reveal on scroll (fl-fade-up) ============ */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -60px 0px" });
    [].forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    [].forEach.call(reveals, function (el) { el.classList.add("is-visible"); });
  }

  // stagger groups
  [].forEach.call(document.querySelectorAll("[data-stagger]"), function (group) {
    [].forEach.call(group.children, function (child, idx) {
      child.style.setProperty("--d", (idx * 0.1) + "s");
    });
  });

  /* ============ 5. Stat counters ============ */
  function animateCount(el) {
    var target = parseFloat(el.dataset.target);
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    var dur = 1700, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.floor(eased * target).toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toLocaleString("en-US") + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll(".count");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    [].forEach.call(counters, function (el) { cio.observe(el); });
  } else {
    [].forEach.call(counters, function (el) {
      el.textContent = (el.dataset.prefix || "") + parseFloat(el.dataset.target).toLocaleString("en-US") + (el.dataset.suffix || "");
    });
  }

  /* ============ 6. Projects slider: drag + arrows ============ */
  var slider = document.getElementById("pSlider");
  if (slider) {
    var isDown = false, startX = 0, startScroll = 0, moved = 0;

    slider.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      isDown = true; moved = 0;
      startX = e.clientX;
      startScroll = slider.scrollLeft;
      slider.classList.add("is-dragging");
      slider.setPointerCapture(e.pointerId);
    });
    slider.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      slider.scrollLeft = startScroll - dx;
    });
    ["pointerup", "pointercancel"].forEach(function (evt) {
      slider.addEventListener(evt, function () {
        isDown = false;
        slider.classList.remove("is-dragging");
      });
    });

    document.querySelectorAll("[data-slide]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = slider.querySelector(".p-card");
        var step = card ? card.getBoundingClientRect().width + 44 : 420;
        slider.scrollBy({ left: btn.dataset.slide === "next" ? step : -step, behavior: "smooth" });
      });
    });
  }

  /* ============ 6b. Expertise slider: drag + arrows ============ */
  if (expSlider) {
    var eDown = false, eStartX = 0, eStartScroll = 0;

    expSlider.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      eDown = true;
      eStartX = e.clientX;
      eStartScroll = expSlider.scrollLeft;
      expSlider.classList.add("is-dragging");
      expSlider.setPointerCapture(e.pointerId);
    });
    expSlider.addEventListener("pointermove", function (e) {
      if (!eDown) return;
      expSlider.scrollLeft = eStartScroll - (e.clientX - eStartX);
    });
    ["pointerup", "pointercancel"].forEach(function (evt) {
      expSlider.addEventListener(evt, function () {
        eDown = false;
        expSlider.classList.remove("is-dragging");
      });
    });

    document.querySelectorAll("[data-exp-slide]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = expSlider.querySelector(".e-card");
        var step = card ? card.getBoundingClientRect().width + 36 : 380;
        expSlider.scrollBy({ left: btn.dataset.expSlide === "next" ? step : -step, behavior: "smooth" });
      });
    });
  }

  /* ============ 7. Market dropdown ============ */
  var dropdown = document.getElementById("dropdown");
  if (dropdown) {
    var ddBtn = dropdown.querySelector(".dropdown__btn");
    var ddValue = dropdown.querySelector(".dropdown__value");
    ddBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle("is-open");
      ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    dropdown.querySelectorAll(".dropdown__menu button").forEach(function (li) {
      li.addEventListener("click", function () {
        ddValue.textContent = li.dataset.value;
        dropdown.classList.remove("is-open");
        ddBtn.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("click", function () {
      dropdown.classList.remove("is-open");
      ddBtn.setAttribute("aria-expanded", "false");
    });
  }

  /* ============ 8. Mobile nav ============ */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  var navBackdrop = document.getElementById("navBackdrop");
  function setNav(open) {
    nav.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    if (navBackdrop) navBackdrop.classList.toggle("is-open", open);
  }
  burger.addEventListener("click", function () {
    setNav(!nav.classList.contains("is-open"));
  });
  if (navBackdrop) {
    navBackdrop.addEventListener("click", function () { setNav(false); });
  }
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a") && nav.classList.contains("is-open")) setNav(false);
  });

  /* ============ 9. Hero video autoplay ============ */
  var heroVideo = document.getElementById("heroVideo");
  if (heroVideo) {
    var tryPlay = heroVideo.play();
    if (tryPlay && typeof tryPlay.catch === "function") tryPlay.catch(function () {});
  }
})();
