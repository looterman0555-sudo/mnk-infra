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
  var heroSection = heroMedia ? heroMedia.closest(".hero, .phero") : null;

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
      g.target = (0.5 - progress) * g.speed * (desktop ? 1 : 0.5);
      if (reduceMotion) g.cur = g.target;
      g.cur = lerp(g.cur, g.target, 0.07);
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

  /* ============ 6. Projects slider: continuous horizontal drag + arrows ============ */
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
      slider.style.animationPlayState = "paused";
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
        slider.style.animationPlayState = "running";
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
        var step = card ? card.getBoundingClientRect().width + 40 : 380;
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
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a") && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }
  });

  /* ============ 8b. Hero headline fade rotation ============ */
  var heroLines = document.querySelectorAll(".hero__line");
  if (heroLines.length > 1) {
    if (reduceMotion) {
      // keep first line only
      for (var li = 1; li < heroLines.length; li++) {
        heroLines[li].classList.remove("is-active");
        heroLines[li].style.display = "none";
      }
    } else {
      var heroIdx = 0;
      setInterval(function () {
        heroLines[heroIdx].classList.remove("is-active");
        heroIdx = (heroIdx + 1) % heroLines.length;
        heroLines[heroIdx].classList.add("is-active");
      }, 3500);
    }
  }

  /* ============ 9. Hero video play / pause ============ */
  var heroVideo = document.getElementById("heroVideo");
  var heroVideoBtn = document.getElementById("heroVideoBtn");
  if (heroVideo && heroVideoBtn) {
    var vIcon = document.getElementById("heroVideoIcon");
    var vState = document.getElementById("heroVideoState");
    var tryPlay = heroVideo.play();
    if (tryPlay && typeof tryPlay.catch === "function") tryPlay.catch(function () {});
    heroVideoBtn.addEventListener("click", function () {
      if (heroVideo.paused) {
        heroVideo.play();
        vIcon.innerHTML = "&#10074;&#10074;";
        vState.textContent = "playing";
        heroVideoBtn.setAttribute("aria-label", "Pause background video");
      } else {
        heroVideo.pause();
        vIcon.innerHTML = "&#9654;";
        vState.textContent = "paused";
        heroVideoBtn.setAttribute("aria-label", "Play background video");
      }
    });
  }

  /* ============ 10. Active nav item (multi-page routing) ============ */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (here === "") here = "index.html";
  if (here === "project.html") here = "projects.html";
  if (here === "service.html") here = "services.html";
  [].forEach.call(document.querySelectorAll(".nav__list > li > a"), function (a) {
    var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (href && href === here) a.classList.add("is-active");
  });

  /* ============ 11. Detail page renderer (project.html / service.html) ============ */
  var data = window.MNK_DATA;
  if (data) {
    var params = new URLSearchParams(location.search);

    function setText(sel, val) {
      var el = document.querySelector(sel);
      if (el && val != null) el.textContent = val;
    }
    function setHTML(sel, val) {
      var el = document.querySelector(sel);
      if (el && val != null) el.innerHTML = val;
    }
    function escapeHTML(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function projectCard(p) {
      return (
        '<a class="p-card reveal is-visible" href="project.html?p=' + encodeURIComponent(p.slug) + '">' +
          '<div class="p-card__frame"><img data-imgparallax src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.title) + '" loading="lazy"></div>' +
          '<p class="p-card__cat">' + escapeHTML(p.category) + "</p>" +
          '<h3 class="p-card__title">' + escapeHTML(p.title) + "</h3>" +
          '<p class="p-card__loc">' + escapeHTML(p.location) + "</p>" +
        "</a>"
      );
    }
    function relatedProjects(currentSlug, category) {
      var list = data.projects.filter(function (p) { return p.slug !== currentSlug; });
      var sameCat = list.filter(function (p) { return p.category === category; });
      var rest = list.filter(function (p) { return p.category !== category; });
      return sameCat.concat(rest).slice(0, 3);
    }

    // ---- project.html ----
    var slug = params.get("p");
    if (slug && data.projects) {
      var project = null;
      for (var i = 0; i < data.projects.length; i++) {
        if (data.projects[i].slug === slug) { project = data.projects[i]; break; }
      }
      if (project) {
        document.title = project.title + " — MNK INFRA";
        setText("[data-detail-cat]", project.category);
        setText("[data-detail-title]", project.title);
        setText("[data-detail-location]", project.location);
        setText("[data-detail-overview]", project.overview);
        var media = document.querySelector("[data-detail-media]");
        if (media) media.style.backgroundImage = 'url("' + project.image + '")';
        var img = document.querySelector("[data-detail-image]");
        if (img) { img.src = project.image; img.alt = project.title; }
        var facts = document.querySelector("[data-detail-facts]");
        if (facts) {
          var rows = [
            ["Location", project.location],
            ["Category", project.category],
            ["Client", project.client],
            ["Year", project.year],
            ["Status", project.status],
            ["Scope", project.scope]
          ];
          facts.innerHTML = rows.map(function (r) {
            return '<div class="facts__row"><span class="facts__k">' + escapeHTML(r[0]) + '</span><span class="facts__v">' + escapeHTML(r[1]) + "</span></div>";
          }).join("");
        }
        var hl = document.querySelector("[data-detail-highlights]");
        if (hl) hl.innerHTML = project.highlights.map(function (h) {
          return "<li>" + escapeHTML(h) + "</li>";
        }).join("");
        var rel = document.querySelector("[data-detail-related]");
        if (rel) rel.innerHTML = relatedProjects(project.slug, project.category).map(projectCard).join("");
      }
    }

    // ---- service.html ----
    var sSlug = params.get("s");
    if (sSlug && data.services) {
      var service = null;
      for (var j = 0; j < data.services.length; j++) {
        if (data.services[j].slug === sSlug) { service = data.services[j]; break; }
      }
      if (service) {
        document.title = service.title + " — MNK INFRA";
        setText("[data-detail-group]", service.group);
        setText("[data-detail-title]", service.title);
        setText("[data-detail-lede]", service.lede);
        setText("[data-detail-eyebrow]", service.group);
        setText("[data-detail-intro]", service.intro);
        setText("[data-detail-intro-title]", service.title);
        var sMedia = document.querySelector("[data-detail-media]");
        if (sMedia) sMedia.style.backgroundImage = 'url("' + service.image + '")';
        var sScopeImg = document.querySelector("[data-detail-scope-image]");
        if (sScopeImg) { sScopeImg.src = service.image; sScopeImg.alt = service.title; }

        var secWrap = document.querySelector("[data-detail-sections]");
        if (secWrap && service.sections) {
          secWrap.innerHTML = service.sections.map(function (sec, idx) {
            var reversed = idx % 2 === 1;
            return (
              '<div class="split__grid' + (reversed ? " split__grid--rev" : "") + '" style="' + (idx ? "margin-top: clamp(48px, 7vw, 96px);" : "") + '">' +
                '<div class="split__media reveal"><div class="frame"><img data-imgparallax src="' + escapeHTML(sec.image) + '" alt="' + escapeHTML(sec.title) + '" loading="lazy"></div></div>' +
                '<div class="split__body reveal" style="--d:.15s">' +
                  '<p class="eyebrow">0' + (idx + 1) + " — " + escapeHTML(service.title) + "</p>" +
                  '<h2 class="ptitle ptitle--sm">' + escapeHTML(sec.title) + "</h2>" +
                  '<p class="plede">' + escapeHTML(sec.text) + "</p>" +
                "</div>" +
              "</div>"
            );
          }).join("");
        }

        var statsEl = document.querySelector("[data-detail-stats]");
        if (statsEl && service.stats) {
          statsEl.innerHTML = service.stats.map(function (st) {
            return (
              '<div class="stat reveal">' +
                '<p class="stat__num">' + escapeHTML(st.value) + "</p>" +
                '<h6 class="stat__label">' + escapeHTML(st.label) + "</h6>" +
              "</div>"
            );
          }).join("");
        }

        var scopeEl = document.querySelector("[data-detail-scope]");
        if (scopeEl && service.scope) {
          scopeEl.innerHTML = service.scope.map(function (s) {
            return "<li>" + escapeHTML(s) + "</li>";
          }).join("");
        }

        var sRel = document.querySelector("[data-detail-related]");
        if (sRel) {
          var catMap = {
            "Buildings": ["Commercial Buildings", "Residential Buildings", "Industrial Structures"],
            "Civil & Infrastructure": ["Road Construction", "Warehouses"],
            "Specialty & MEP": ["Concrete Tanks", "Commercial Buildings"]
          };
          var wanted = catMap[service.group] || [];
          var picked = data.projects.filter(function (p) { return wanted.indexOf(p.category) !== -1; });
          var filler = data.projects.filter(function (p) { return wanted.indexOf(p.category) === -1; });
          sRel.innerHTML = picked.concat(filler).slice(0, 3).map(projectCard).join("");
        }
      }
    }

    // observe / show reveals added by the detail renderer above
    var lateReveals = document.querySelectorAll(".reveal:not(.is-visible)");
    if (typeof io !== "undefined" && io) {
      [].forEach.call(lateReveals, function (el) { io.observe(el); });
    } else {
      [].forEach.call(lateReveals, function (el) { el.classList.add("is-visible"); });
    }
  }


  /* ============ 11. Category filter pills (projects page) ============ */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    var filterItems = document.querySelectorAll("[data-category]");
    filterBar.addEventListener("click", function (e) {
      var pill = e.target.closest(".pill");
      if (!pill) return;
      [].forEach.call(filterBar.querySelectorAll(".pill"), function (p) {
        p.classList.toggle("is-active", p === pill);
      });
      var cat = pill.dataset.pill;
      [].forEach.call(filterItems, function (item) {
        var show = cat === "all" || item.dataset.category === cat;
        item.classList.toggle("is-hidden", !show);
      });
    });
  }

  /* ============ 12. Enquiry form validation (contact page) ============ */
  var form = document.getElementById("enquiryForm");
  if (form) {
    var formStatus = document.getElementById("formStatus");
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var phoneRe = /^\+?[0-9][0-9\s\-()]{7,16}$/;

    function fieldOf(input) { return input.closest(".field"); }
    function setErr(input, msg) {
      var field = fieldOf(input);
      var err = field.querySelector(".field__err");
      field.classList.toggle("is-error", !!msg);
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
      return !msg;
    }
    function check(input) {
      var v = (input.value || "").trim();
      var name = input.name;
      if (input.hasAttribute("required") && !v) return setErr(input, "This field is required.");
      if (!v) return setErr(input, "");
      if (name === "email" && !emailRe.test(v)) return setErr(input, "Please enter a valid email address.");
      if (name === "phone" && !phoneRe.test(v)) return setErr(input, "Please enter a valid phone number.");
      if (name === "name" && v.length < 2) return setErr(input, "Please enter your full name.");
      if (name === "message" && v.length < 10) return setErr(input, "Please provide at least 10 characters.");
      return setErr(input, "");
    }

    [].forEach.call(form.querySelectorAll("input, select, textarea"), function (input) {
      input.addEventListener("blur", function () { check(input); });
      input.addEventListener("input", function () {
        if (fieldOf(input).classList.contains("is-error")) check(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;
      [].forEach.call(form.querySelectorAll("input, select, textarea"), function (input) {
        if (!check(input)) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) { if (firstBad) firstBad.focus(); return; }
      // TODO: POST the enquiry to a backend / form endpoint when available.
      form.reset();
      if (formStatus) {
        formStatus.hidden = false;
        formStatus.textContent = "Thank you — your enquiry has been received. Our team will get back to you shortly.";
      }
    });
  }
})();
