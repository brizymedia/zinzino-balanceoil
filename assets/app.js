/* 진지노 밸런스 오일 플러스 — 스크럽 히어로 엔진 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 유틸 ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var smoothstep = function (p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ---------- 글자 분해 (로드 시 1회, 시드 고정) ---------- */
  function splitText(el, mode, seed) {
    if (!el) return;
    var text = el.textContent;
    el.setAttribute('aria-hidden', 'false');
    var sr = document.createElement('span');
    sr.className = 'sr';
    sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    var r = rng(seed);
    var words = text.split('\n').join(' \n ').split(' ');
    var charIndex = 0, total = text.replace(/\s/g, '').length;
    words.forEach(function (word, wi) {
      if (word === '\n') { vis.appendChild(document.createElement('br')); return; }
      if (!word) return;
      var w = document.createElement('span');
      w.className = 'w';
      w.style.setProperty('--th', (wi * 0.07 + r() * 0.05).toFixed(3));
      for (var i = 0; i < word.length; i++) {
        var c = document.createElement('span');
        c.className = 'c';
        var th = mode === 'grid'
          ? (charIndex / Math.max(1, total) * 0.42 + r() * 0.06)
          : (r() * 0.5);
        c.style.setProperty('--th', th.toFixed(3));
        c.style.setProperty('--jx', ((r() * 2 - 1) * 34).toFixed(1) + 'px');
        c.textContent = word[i];
        w.appendChild(c);
        charIndex++;
      }
      vis.appendChild(w);
      vis.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.classList.add('split');
    el.appendChild(sr);
    el.appendChild(vis);
  }

  /* ---------- 요소 ---------- */
  var hero = $('.hero');
  var stage = $('.stage');
  var video = $('#heroVideo');
  var posterLayer = $('.stage .poster');
  var ring = $('.ring');
  var chip = $('.chip');
  var chipVal = $('.chip b');
  var bandEls = [$('#b1'), $('#b2'), $('#b3'), $('#b4')];

  /* 휴대폰은 마지막 문구가 뜬 뒤 남는 스크롤이 길게 느껴진다.
     그래서 세로 화면에서는 정착 밴드를 뒤로 미뤄 꼬리를 짧게 만든다. */
  var PORTRAIT_Q = '(max-width: 820px) and (orientation: portrait)';
  var BAND_DESKTOP = [
    { a: 0.00, b: 0.20, first: true },
    { a: 0.23, b: 0.46 },
    { a: 0.48, b: 0.68 },
    { a: 0.76, b: 1.00, last: true, settle: true }
  ];
  var BAND_PORTRAIT = [
    { a: 0.00, b: 0.24, first: true },
    { a: 0.27, b: 0.52 },
    { a: 0.55, b: 0.78 },
    { a: 0.88, b: 1.00, last: true, settle: true }
  ];
  var BANDS = [];
  function applyBandMap() {
    var src = matchMedia(PORTRAIT_Q).matches ? BAND_PORTRAIT : BAND_DESKTOP;
    BANDS.length = 0;
    src.forEach(function (bd) {
      BANDS.push({ a: bd.a, b: bd.b, first: bd.first, last: bd.last, settle: bd.settle, op: -1, k: -1 });
    });
  }
  applyBandMap();

  splitText($('#b2 .fx-target'), 'grid', 22);
  splitText($('#b3 .fx-target'), 'scatter', 33);
  splitText($('#b4 .fx-target'), 'rise', 44);

  /* 밴드1 소프트 카피 복제 (블러→선명) */
  (function () {
    var b1 = $('#b1 .fx-blur');
    if (!b1) return;
    var sharp = $('.sharp', b1);
    var soft = sharp.cloneNode(true);
    soft.classList.remove('sharp');
    soft.className = 'soft';
    soft.setAttribute('aria-hidden', 'true');
    b1.appendChild(soft);
  })();

  /* ---------- 히어로 스크럽 ---------- */
  var VIDEO_URL = 'assets/hero-scrub.mp4';
  var VIDEO_BYTES = 6193593;
  var POSTER_URL = 'assets/hero-poster.jpg';

  var target = 0, shown = 0, rafId = null, lastTick = 0;
  var heroOnScreen = true, scrubOn = false, videoReady = false;
  var seekBusy = false, pendingTime = null;
  var loadK = 0, loadK0 = 0, settled = false;
  var chipLast = '', chipAt = 0;
  var heroInited = false, started = false;

  function heroProgress() {
    var r = hero.getBoundingClientRect();
    var range = r.height - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  function requestSeek(t) {
    if (!videoReady || !video.duration) return;
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', function () {
    seekBusy = false;
    if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', function () {
    seekBusy = false; pendingTime = null;
    failVideo();
  });

  function makeChevron() {
    var d = document.createElement('div');
    d.className = 'cue';
    d.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9l8 7 8-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return d;
  }
  function failVideo() {
    if (stage.classList.contains('video-failed')) return;
    stage.classList.add('video-failed');
    if (ring && ring.parentNode) ring.replaceWith(makeChevron());
  }

  function startBlobFetch() {
    if (started) return;
    started = true;
    loadHeroBlob().catch(failVideo);
  }

  function loadHeroBlob() {
    var ctrl = new AbortController();
    var watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
    return fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('video http ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
      var reader = res.body.getReader();
      var chunks = [], got = 0, lastRing = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          clearTimeout(watchdog);
          watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
          chunks.push(r.value);
          got += r.value.length;
          var frac = Math.min(1, got / total);
          var now = performance.now();
          if (now - lastRing > 100 || frac === 1) {
            lastRing = now;
            if (ring) ring.style.setProperty('--ld', Math.round(126 * (1 - frac)));
          }
          return pump();
        });
      }
      return pump().then(function () {
        clearTimeout(watchdog);
        if (ring) { ring.style.setProperty('--ld', 0); ring.style.opacity = 0; }
        video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        video.load();
        video.addEventListener('canplay', function () {
          videoReady = true;
          requestSeek(heroProgress() * video.duration);
          stage.classList.add('video-ready');
        }, { once: true });
      });
    });
  }

  function initHeroOnce() {
    if (heroInited) return;
    heroInited = true;
    posterLayer.style.backgroundImage = "url('" + POSTER_URL + "')";
    var img = new Image();
    img.onload = startBlobFetch;
    img.onerror = startBlobFetch;
    img.src = POSTER_URL;
    setTimeout(startBlobFetch, 4000);
    /* 밴드1 로드 램프: 시간 기반 1회 */
    loadK0 = performance.now();
    requestAnimationFrame(loadTick);
  }

  function loadTick(now) {
    var t = clamp((now - loadK0 - 300) / 1400, 0, 1);
    loadK = t * t * (3 - 2 * t);
    updateCaptions(shown);
    if (t < 1 && !reduceMq.matches) requestAnimationFrame(loadTick);
  }

  function updateCaptions(p) {
    for (var i = 0; i < BANDS.length; i++) {
      var bd = BANDS[i], el = bandEls[i];
      if (!el) continue;
      var f = Math.min(0.02, (bd.b - bd.a) / 3);
      var op = (bd.first ? 1 : smoothstep(p, bd.a, bd.a + f)) *
               (bd.last ? 1 : 1 - smoothstep(p, bd.b - f, bd.b));
      var ramp = Math.min(0.025, (bd.b - bd.a) * 0.35);
      var k = clamp((p - bd.a) / ramp, 0, 1);
      if (bd.first) k = Math.max(k, loadK);
      if (Math.abs(op - bd.op) > 0.008) {
        bd.op = op;
        el.style.opacity = op.toFixed(3);
      }
      if (Math.abs(k - bd.k) > 0.008) {
        bd.k = k;
        el.style.setProperty('--k', k.toFixed(3));
        if (bd.settle) {
          el.style.setProperty('--ks', clamp((k - 0.66) * 4, 0, 1).toFixed(3));
          el.style.setProperty('--kb', clamp((k - 0.78) * 5, 0, 1).toFixed(3));
        }
      }
    }
    /* 비율 칩: 10Hz + 변경 시에만 */
    var now = performance.now();
    if (chip && now - chipAt > 100) {
      var ratio = Math.round(15 - 12 * smoothstep(p, 0.45, 0.95));
      var txt = ratio + ':1';
      if (txt !== chipLast) { chipLast = txt; chipAt = now; chipVal.textContent = txt; }
    }
    var isSettled = p > 0.97;
    if (isSettled !== settled) {
      settled = isSettled;
      hero.classList.toggle('settled', settled);
    }
  }

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    var k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) {
      shown = target; rafId = null; lastTick = 0;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    if (videoReady) requestSeek(shown * video.duration);
    updateCaptions(shown);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }

  new IntersectionObserver(function (es) {
    heroOnScreen = es[0].isIntersecting;
    if (heroOnScreen && scrubOn) onScroll();
  }).observe(hero);

  /* ---------- 5게이트 (CSS와 문자 단위 동일) ---------- */
  /* CSS 의 정적 히어로 미디어쿼리와 글자 하나까지 같아야 한다.
     휴대폰도 스크롤 영상을 보고, 모션 최소화 설정에서만 정적 화면으로 간다. */
  var GATES = ['(prefers-reduced-motion: reduce)'];
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true });
    BANDS.forEach(function (bd) { bd.op = -1; bd.k = -1; });
    unpinFinalStates();
    updateCaptions(heroProgress());
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    if (GATES.some(function (q) { return matchMedia(q).matches; })) disableScrub();
    else enableScrub();
  }
  var MQLS = GATES.map(function (q) { return matchMedia(q); });
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else m.addListener(applyHeroMode);
  });

  /* 가로세로를 돌리면 밴드 구간도 그 화면에 맞게 다시 잡는다 */
  var portraitMql = matchMedia(PORTRAIT_Q);
  function onOrientationFlip() {
    applyBandMap();
    if (scrubOn) { updateCaptions(heroProgress()); onScroll(); }
  }
  if (portraitMql.addEventListener) portraitMql.addEventListener('change', onOrientationFlip);
  else portraitMql.addListener(onOrientationFlip);

  /* 정적 히어로 배경 (게이트 안쪽에서만 로드) */
  var staticInited = false;
  function initStaticHero() {
    if (staticInited) return; staticInited = true;
    var sh = $('.static-hero .bg');
    if (sh) sh.style.backgroundImage = "url('assets/hero-ending.jpg')";
  }
  function applyStaticMode() {
    if (GATES.some(function (q) { return matchMedia(q).matches; })) initStaticHero();
  }
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyStaticMode);
    else m.addListener(applyStaticMode);
  });

  /* ---------- 입장 안무 ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      if (el.classList.contains('rev')) {
        /* 'done' 은 구매 페이지의 완료 상자가 쓰는 이름이라 겹치면 안 된다 */
        setTimeout(function () { el.classList.add('rev-set'); }, 1600);
      }
    });
  }, { threshold: 0.25 });
  $$('.rev, .thread, .ratio-vis').forEach(function (el) { io.observe(el); });

  /* ---------- 균형 다이얼 (꾹 누르기) ---------- */
  var dialZone = $('#dialZone');
  var dialFill = $('.dial .fill');
  var dialNum = $('.dial .num');
  var holdBtn = $('.holdbtn');
  var steps = $$('.step');
  var C = 879.6; /* r=140 원둘레 */
  var holdP = 0, holding = false, holdRaf = null, holdDone = false, dialLast = '';

  function renderDial() {
    dialFill.style.strokeDashoffset = (C * (1 - holdP * 0.83)).toFixed(1);
    var ratio = Math.round(15 - 12 * holdP);
    var txt = ratio + ':1';
    if (txt !== dialLast) { dialLast = txt; dialNum.textContent = txt; }
  }
  function holdTick() {
    holdP = clamp(holdP + (holding ? 0.014 : -0.02), 0, 1);
    renderDial();
    if (holdP >= 1 && !holdDone) { completeHold(); return; }
    if ((holding && holdP < 1) || (!holding && holdP > 0)) {
      holdRaf = requestAnimationFrame(holdTick);
    } else holdRaf = null;
  }
  function completeHold() {
    holdDone = true; holding = false; holdRaf = null;
    holdP = 1; renderDial();
    dialZone.classList.add('done');
    holdBtn.textContent = '균형이 돌아왔습니다';
    steps.forEach(function (s, i) {
      setTimeout(function () { s.classList.add('lit'); }, 200 + i * 260);
    });
  }
  function startHold(e) {
    if (holdDone) return;
    e.preventDefault();
    if (reduceMq.matches) { completeHold(); return; }
    holding = true;
    if (holdRaf === null) holdRaf = requestAnimationFrame(holdTick);
  }
  function endHold() {
    holding = false;
    if (holdRaf === null && holdP > 0 && !holdDone) holdRaf = requestAnimationFrame(holdTick);
  }
  if (holdBtn) {
    holdBtn.addEventListener('pointerdown', startHold);
    addEventListener('pointerup', endHold);
    addEventListener('pointercancel', endHold);
    holdBtn.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') startHold(e);
    });
    holdBtn.addEventListener('keyup', endHold);
    renderDial();
  }

  /* ---------- 리듀스드 모션 라이브 (양방향) ---------- */
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var pinned = [];
  function pinToFinalStates() {
    $$('.rev').forEach(function (el) {
      if (!el.classList.contains('in')) { el.classList.add('in', 'rev-set'); pinned.push(el); }
    });
    $$('.thread, .ratio-vis').forEach(function (el) {
      if (!el.classList.contains('in')) { el.classList.add('in'); pinned.push(el); }
    });
    if (!holdDone) completeHold();
  }
  function unpinFinalStates() {
    pinned.forEach(function (el) { el.classList.remove('in', 'rev-set'); io.observe(el); });
    pinned = [];
  }
  function onReduceFlip(e) {
    if (e.matches) { disableScrub(); pinToFinalStates(); }
    else applyHeroMode();
  }
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', onReduceFlip);
  else reduceMq.addListener(onReduceFlip);

  /* ---------- 홍보영상: 누르면 그때 유튜브를 불러온다 ---------- */
  var facade = $('.ytfacade');
  if (facade) {
    facade.addEventListener('click', function () {
      var id = facade.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      f.title = '왜 진지노 밸런스오일을 먹어야 할까';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.setAttribute('allowfullscreen', '');
      facade.replaceWith(f);
      f.focus();
    });
  }

  /* ---------- 숨은 탭 일시정지 ---------- */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
  });

  /* ---------- 시작 ---------- */
  applyHeroMode();
  applyStaticMode();
  if (reduceMq.matches) pinToFinalStates();
  requestAnimationFrame(function () { document.body.classList.add('ready'); });
})();
