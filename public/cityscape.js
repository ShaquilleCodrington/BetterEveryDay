// ============================================================
// cityscape.js  — BetterEveryDay procedural city background
// Optimised: cached moon canvas, cached tint RGB, per-frame
//            cloud tint cache, pre-parsed sky hex, cached road
//            gradients, debounced resize, tab-pause, dt cap
// ============================================================

(function () {

  const canvas = document.getElementById('city-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.style.willChange = 'transform';
  let W, H;

  const HORIZON   = 0.70;
  const FAR_BASE  = 0.58;
  const MID_BASE  = 0.65;
  const NEAR_BASE = HORIZON;

  const IS_TIMER = window.location.hash.includes('/timer');

  function isActive() {
    if (IS_TIMER) return (localStorage.getItem('timer-background') ?? 'city') === 'city';
    return (localStorage.getItem('background-mode') ?? 'city') === 'city';
  }

  // ── Visibility + loop control ──────────────────────────────────────────
  let rafId = null;

  function syncVisibility() {
    const on = isActive();
    canvas.style.display = on ? 'block' : 'none';
    readTint();

    if (on && rafId === null) {
      lastNow = performance.now();
      rafId = requestAnimationFrame(draw);
    } else if (!on && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  window.addEventListener('background-update',       syncVisibility);
  window.addEventListener('timer-background-update', syncVisibility);

  // Pause on tab hide — reset timer on restore to avoid giant dt spike
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastNow = performance.now();
  });

  // ── Mood themes ────────────────────────────────────────────────────────
  const CITY_MOODS = {
    default: {
      skyTops:   ['#08051a','#130a2e','#2e0f4a','#3a0f35','#8a2a18','#d06010','#e87820'],
      bloomColor:[230,110,20],
      cloudTints:[[178,168,218],[222,162,182],[255,162,112]],
      roadGlow:  [160,90,30],
      groundFog: [130,90,200],
    },
    Focused: {
      skyTops:   ['#03060f','#060c22','#0a1840','#0e2255','#122880','#1a3aaa','#2050d0'],
      bloomColor:[30,80,200],
      cloudTints:[[140,160,240],[160,180,255],[180,200,255]],
      roadGlow:  [40,70,180],
      groundFog: [60,100,255],
    },
    Planning: {
      skyTops:   ['#100800','#1e1000','#3a1c00','#5a2800','#8a4010','#c07020','#e8a030'],
      bloomColor:[220,130,20],
      cloudTints:[[240,200,140],[255,210,120],[255,180,80]],
      roadGlow:  [180,100,20],
      groundFog: [200,140,50],
    },
    Recharge: {
      skyTops:   ['#001008','#001a10','#002a18','#003a20','#015c30','#028040','#03aa55'],
      bloomColor:[10,160,80],
      cloudTints:[[140,220,180],[160,240,200],[100,200,160]],
      roadGlow:  [20,120,70],
      groundFog: [40,180,100],
    },
  };

  // Pre-parse all hex sky colours to [r,g,b] arrays — avoids per-frame string ops
  const MOOD_SKY_RGB = {};
  for (const [key, mood] of Object.entries(CITY_MOODS)) {
    MOOD_SKY_RGB[key] = mood.skyTops.map(hex => {
      const h = hex.replace('#','');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    });
  }

  let activeMoodKey  = localStorage.getItem('active-mood') || 'Focused';
  let prevMoodKey    = activeMoodKey;
  let currentMood    = CITY_MOODS[activeMoodKey] || CITY_MOODS.default;
  let targetMood     = currentMood;
  let moodT          = 1.0;
  const MOOD_SPEED   = 0.006;

  window.addEventListener('mood-change', () => {
    const newKey  = localStorage.getItem('active-mood') || 'Focused';
    const newMood = CITY_MOODS[newKey] || CITY_MOODS.default;
    if (newKey !== activeMoodKey) {
      prevMoodKey   = activeMoodKey;
      activeMoodKey = newKey;
      currentMood   = targetMood;
      targetMood    = newMood;
      moodT         = 0;
      readTint();
      buildLayers_fn();
      scheduleCloudCanvasRebuild();
      _skyGradientDirty  = true;
      _roadGradientDirty = true;
      _moonCanvas        = null;
    }
  });

  // ── City settings ──────────────────────────────────────────────────────
  let cityScrollSpeed = parseFloat(localStorage.getItem('city-scroll-speed') || '40');

  // ── Tint ──────────────────────────────────────────────────────────────
  let tintHue      = parseFloat(localStorage.getItem('city-tint-h') || '30');
  let tintStrength = parseFloat(localStorage.getItem('city-tint-s') || '0');

  // Cached tint RGB — only recomputed when hue/strength actually changes
  let _tintRGB     = [0,0,0];
  let _tintDirty   = true;

  // Declare cache-dirty flags here so readTint() (called below) can reference them
  let _skyGradientDirty  = true;
  let _roadGradientDirty = true;
  let _moonCanvas        = null;

  function readTint() {
    const mood = localStorage.getItem('active-mood') || 'Focused';
    const moodEnabled = mood !== 'default' && localStorage.getItem(`city-tint-${mood}-enabled`) === 'true';
    if (moodEnabled) {
      tintHue      = parseFloat(localStorage.getItem(`city-tint-${mood}-h`) || '30');
      tintStrength = parseFloat(localStorage.getItem(`city-tint-${mood}-s`) || '0');
    } else {
      tintHue      = parseFloat(localStorage.getItem('city-tint-h') || '30');
      tintStrength = parseFloat(localStorage.getItem('city-tint-s') || '0');
    }
    _tintDirty         = true;
    _skyGradientDirty  = true;
    _roadGradientDirty = true;
    const tintEl = document.getElementById('screen-tint');
    if (tintEl && isActive()) tintEl.style.opacity = '0';
  }
  readTint();

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
  }

  function tintColor(r, g, b) {
    if (tintStrength <= 0) return [r, g, b];
    if (_tintDirty) { _tintRGB = hslToRgb(tintHue, 80, 50); _tintDirty = false; }
    const [tr, tg, tb] = _tintRGB;
    // Slider still runs 0–1 (0–100%) end to end; the cap here is what
    // determines how strong the tint mix gets at full strength. Halved
    // from 0.6 -> 0.3 so max brightness/opacity is ~50% of before.
    const s = Math.min(0.3, tintStrength * 0.3);
    return [
      Math.round(r + (tr - r) * s),
      Math.round(g + (tg - g) * s),
      Math.round(b + (tb - b) * s),
    ];
  }

  // Lerp two pre-parsed RGB arrays, apply tint, return css rgb() string
  function lerpSkyRGB(rgbA, rgbB, t) {
    const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t);
    const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t);
    const b = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t);
    const [tr, tg, tb] = tintColor(r, g, b);
    return `rgb(${tr},${tg},${tb})`;
  }

  function getMoodSkyColor(idx, t) {
    const curRGBs = MOOD_SKY_RGB[prevMoodKey]   || MOOD_SKY_RGB['default'];
    const tgtRGBs = MOOD_SKY_RGB[activeMoodKey] || MOOD_SKY_RGB['default'];
    const a = curRGBs[idx] || curRGBs[curRGBs.length-1];
    const b = tgtRGBs[idx] || tgtRGBs[tgtRGBs.length-1];
    return lerpSkyRGB(a, b, t);
  }

  function getMoodBloom(t) {
    const a = currentMood.bloomColor, b = targetMood.bloomColor;
    return [
      Math.round(a[0]+(b[0]-a[0])*t),
      Math.round(a[1]+(b[1]-a[1])*t),
      Math.round(a[2]+(b[2]-a[2])*t),
    ];
  }

  // Computed once per frame, cached by moodT value
  let _cloudTintsCachedT = -1;
  let _cloudTintsCache   = null;

  function getMoodCloudTints(t) {
    if (t === _cloudTintsCachedT && _cloudTintsCache) return _cloudTintsCache;
    _cloudTintsCache = currentMood.cloudTints.map((ca, i) => {
      const cb = targetMood.cloudTints[i] || ca;
      const r = Math.round(ca[0]+(cb[0]-ca[0])*t);
      const g = Math.round(ca[1]+(cb[1]-ca[1])*t);
      const b = Math.round(ca[2]+(cb[2]-ca[2])*t);
      return tintColor(r, g, b);
    });
    _cloudTintsCachedT = t;
    return _cloudTintsCache;
  }

  function reloadCitySettings() {
    cityScrollSpeed = parseFloat(localStorage.getItem('city-scroll-speed') || '40');
    readTint();
    buildLayers_fn();
    buildCloudCanvases();
  }

  window.addEventListener('cityscape-update', reloadCitySettings);
  window.addEventListener('focus', reloadCitySettings);

  window.addEventListener('storage', (e) => {
    const cityKeys = ['city-scroll-speed','city-tint-h','city-tint-s',
                      'background-mode','timer-background'];
    if (cityKeys.includes(e.key ?? '')) {
      reloadCitySettings();
      syncVisibility();
    }
    if (e.key === 'active-mood') {
      window.dispatchEvent(new CustomEvent('mood-change'));
    }
  });

  // ── RNG ───────────────────────────────────────────────────────────────
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rng  = (a, b, r) => a + r() * (b - a);
  const irng = (a, b, r) => Math.floor(rng(a, b + 1, r));

  // ── SKY — cached gradient, only rebuilt when mood/tint changes ────────
  let _skyGradient      = null;
  let _skyGradientMoodT = -1;

  function drawSky() {
    const skyH = H * HORIZON;

    if (_skyGradientDirty || moodT !== _skyGradientMoodT) {
      const stops = [0.00,0.25,0.50,0.70,0.82,0.92,1.00];
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      stops.forEach((pos, i) => g.addColorStop(pos, getMoodSkyColor(i, moodT)));
      _skyGradient      = g;
      _skyGradientMoodT = moodT;
      if (moodT >= 1) _skyGradientDirty = false;
    }

    ctx.fillStyle = _skyGradient;
    ctx.fillRect(0, 0, W, skyH);

    const [gr, gg, gb] = tintColor(6, 4, 14);
    ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
    ctx.fillRect(0, skyH, W, H - skyH);

    // Horizon bloom
    const bloom = ctx.createRadialGradient(W*0.5, skyH, 0, W*0.5, skyH, W*0.55);
    const [br2, bg2, bb2] = getMoodBloom(moodT);
    const [tbr, tbg, tbb] = tintColor(br2, bg2, bb2);
    bloom.addColorStop(0,   `rgba(${tbr},${tbg},${tbb},0.28)`);
    bloom.addColorStop(0.5, `rgba(${tbr},${tbg},${tbb},0.08)`);
    bloom.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, skyH*0.80, W, skyH*0.20);
  }

  // ── MOON — cached offscreen canvas ────────────────────────────────────
  const MOON_X = 0.78, MOON_Y = 0.12, MOON_R = 42;

  function buildMoonCanvas() {
    const mr   = MOON_R;
    const size = mr * 3;
    const oc   = document.createElement('canvas');
    oc.width = oc.height = size * 2;
    const oc2 = oc.getContext('2d');
    const cx = size, cy = size;
    const lit = oc2.createRadialGradient(cx+mr*0.15, cy-mr*0.2, 0, cx, cy, mr);
    lit.addColorStop(0,   '#fffbee');
    lit.addColorStop(0.5, '#f0e8c8');
    lit.addColorStop(1,   '#c8bfa0');
    oc2.fillStyle = lit;
    oc2.beginPath(); oc2.arc(cx, cy, mr, 0, Math.PI*2); oc2.fill();
    oc2.globalCompositeOperation = 'destination-out';
    oc2.fillStyle = 'rgba(0,0,0,1)';
    oc2.beginPath(); oc2.arc(cx-mr*0.72, cy-mr*0.04, mr*0.90, 0, Math.PI*2); oc2.fill();
    _moonCanvas = oc;
  }

  function drawMoon() {
    if (!_moonCanvas) buildMoonCanvas();
    const mr   = MOON_R;
    const mx   = MOON_X*W, my = MOON_Y*H;
    const size = mr * 3;
    const halo = ctx.createRadialGradient(mx, my, mr*0.6, mx, my, mr*3.5);
    halo.addColorStop(0,   'rgba(215,205,175,0.18)');
    halo.addColorStop(0.5, 'rgba(195,185,150,0.06)');
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(mx, my, mr*3.5, 0, Math.PI*2); ctx.fill();
    ctx.drawImage(_moonCanvas, mx-size, my-size);
  }

  // ── STARS ─────────────────────────────────────────────────────────────
  let stars = [];
  function buildStars() {
    const r = makeRng(0xDEADBEEF);
    stars = Array.from({ length: 220 }, () => ({
      x: r(), y: r()*0.60,
      radius: rng(0.3, 1.5, r),
      alpha:  rng(0.25, 0.85, r),
      twinkle: r()*Math.PI*2,
      twinkleSpeed: rng(0.3, 1.2, r),
    }));
  }

  function drawStars(t) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < stars.length; i++) {
      const s    = stars[i];
      const fade = Math.max(0, 1 - Math.max(0, s.y-0.42)/0.18);
      const tw   = 0.72 + 0.28*Math.sin(t*s.twinkleSpeed+s.twinkle);
      ctx.globalAlpha = s.alpha*tw*fade;
      ctx.beginPath();
      ctx.arc(s.x*W, s.y*H, s.radius, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── CLOUDS ────────────────────────────────────────────────────────────
  // Perf note: clouds used to be redrawn every frame with a fresh
  // radial gradient per puff (~15 clouds × several puffs = 100+
  // gradient + arc calls per frame). That was the main source of lag
  // in the city background, especially on lower-powered machines.
  // Now each cloud is rendered once onto a small offscreen canvas,
  // and every frame we just drawImage() it — the same trick already
  // used for buildings. The cache is rebuilt (throttled) when the
  // mood/tint actually changes, not on every animation frame.
  let clouds = [];
  function buildClouds() {
    const r = makeRng(0xC10DBABE);
    clouds = [];
    function makeCloud(layer, yFrac, wMin, wMax, hMin, hMax, sMin, sMax, pMin, pMax) {
      const w = rng(wMin,wMax,r), h = rng(hMin,hMax,r);
      const nPuffs = irng(pMin,pMax,r);
      const puffs = Array.from({length:nPuffs}, () => ({
        dx: rng(-w*0.42,w*0.42,r), dy: rng(-h*0.28,h*0.28,r),
        rx: rng(w*0.22,w*0.50,r),  ry: rng(h*0.38,h*0.72,r),
      }));
      return { x:r()*W*2.2, y:yFrac*H, w, h, layer, puffs, speed:rng(sMin,sMax,r),
                canvas:null, canvasOffsetX:0, canvasOffsetY:0 };
    }
    for (let i=0;i<7;i++) clouds.push(makeCloud(0,rng(0.06,0.20,r),100,240,16,34,0.06,0.14,4,7));
    for (let i=0;i<5;i++) clouds.push(makeCloud(1,rng(0.26,0.44,r),200,420,32,64,0.15,0.28,5,9));
    for (let i=0;i<3;i++) clouds.push(makeCloud(2,rng(0.46,0.60,r),300,640,48,92,0.26,0.48,6,11));
    buildCloudCanvases();
  }

  // Bake each cloud's puffs (gradients + arcs) into its own small
  // offscreen canvas, once, using the current mood-blended tints.
  function buildCloudCanvases() {
    const tints = getMoodCloudTints(moodT);
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
      for (let j = 0; j < c.puffs.length; j++) {
        const p = c.puffs[j];
        minX = Math.min(minX, p.dx - p.rx); maxX = Math.max(maxX, p.dx + p.rx);
        minY = Math.min(minY, p.dy - p.ry); maxY = Math.max(maxY, p.dy + p.ry);
      }
      const w = Math.max(1, Math.ceil(maxX - minX));
      const h = Math.max(1, Math.ceil(maxY - minY));
      const oc  = document.createElement('canvas');
      oc.width  = w;
      oc.height = h;
      const oc2 = oc.getContext('2d');
      const [cr,cg,cb] = tints[c.layer] || tints[0];
      const ca = [0.22, 0.32, 0.44][c.layer] ?? 0.22;
      for (let j = 0; j < c.puffs.length; j++) {
        const p = c.puffs[j];
        const px = p.dx - minX, py = p.dy - minY;
        const maxR = Math.max(p.rx, p.ry);
        const g = oc2.createRadialGradient(px, py - p.ry*0.22, 0, px, py, maxR);
        g.addColorStop(0,    `rgba(${cr},${cg},${cb},${ca})`);
        g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${ca*0.5})`);
        g.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`);
        oc2.save();
        oc2.translate(px, py);
        oc2.scale(1, p.ry / p.rx);
        oc2.fillStyle = g;
        oc2.beginPath(); oc2.arc(0, 0, p.rx, 0, Math.PI*2); oc2.fill();
        oc2.restore();
      }
      c.canvas        = oc;
      c.canvasOffsetX = minX;
      c.canvasOffsetY = minY;
    }
  }

  // Throttled rebuild while a mood transition is blending cloud tints,
  // instead of rebuilding (and recreating gradients) on every frame.
  let _cloudRebuildTimer = null;
  function scheduleCloudCanvasRebuild() {
    buildCloudCanvases();
    if (_cloudRebuildTimer) return;
    _cloudRebuildTimer = setInterval(() => {
      buildCloudCanvases();
      if (moodT >= 1) {
        clearInterval(_cloudRebuildTimer);
        _cloudRebuildTimer = null;
      }
    }, 100);
  }

  function drawCloud(c, scrollX) {
    if (!c.canvas) return;
    const span = W + c.w*2;
    const x = ((c.x - scrollX*c.speed) % span + span) % span - c.w;
    ctx.drawImage(c.canvas, x + c.canvasOffsetX, c.y + c.canvasOffsetY);
  }

  function drawClouds(scrollX) {
    for (let layer = 0; layer <= 2; layer++) {
      for (let i = 0; i < clouds.length; i++) {
        if (clouds[i].layer === layer) drawCloud(clouds[i], scrollX);
      }
    }
  }

  // ── BUILDINGS ─────────────────────────────────────────────────────────
  const BUILD_LAYERS = [
    { seed:0xFA45C001, yBase:FAR_BASE,  minH:0.07, maxH:0.20, minW:20,  maxW:55,
      speed:0.14, fillBase:[18,12,38],  edgeLight:[60,40,110],
      winOpacity:0.42, winColor:[255,210,140], winSize:2, winGap:5 },
    { seed:0xD1DC17A0, yBase:MID_BASE,  minH:0.13, maxH:0.32, minW:35,  maxW:95,
      speed:0.38, fillBase:[12,8,28],   edgeLight:[80,55,140],
      winOpacity:0.55, winColor:[255,222,162], winSize:3, winGap:6 },
    { seed:0xBEEFC17A, yBase:NEAR_BASE, minH:0.22, maxH:0.50, minW:60,  maxW:150,
      speed:0.80, fillBase:[8,5,18],    edgeLight:[100,70,165],
      winOpacity:0.66, winColor:[255,238,185], winSize:4, winGap:8 },
  ];

  let builtLayers = [];

  function drawDish(cx2, bx, roofY, er, eg, eb) {
    const mastH=14, mx2=bx, baseY=roofY, topY=roofY-mastH;
    cx2.strokeStyle=`rgba(${er},${eg},${eb},0.55)`; cx2.lineWidth=1;
    cx2.beginPath(); cx2.moveTo(mx2,baseY); cx2.lineTo(mx2,topY); cx2.stroke();
    const dW=16,dH=9,lx=mx2-dW*0.5,rx=mx2+dW*0.5,ry=topY-2,cy2=ry+dH;
    cx2.strokeStyle=`rgba(${er+25},${eg+18},${eb+35},0.80)`; cx2.lineWidth=1.5;
    cx2.beginPath(); cx2.moveTo(lx,ry); cx2.quadraticCurveTo(mx2,cy2,rx,ry); cx2.stroke();
    cx2.strokeStyle=`rgba(${er},${eg},${eb},0.50)`; cx2.lineWidth=1;
    cx2.beginPath(); cx2.moveTo(lx,ry); cx2.lineTo(rx,ry); cx2.stroke();
    const focalY=ry-dH*0.7;
    cx2.beginPath(); cx2.moveTo(mx2,ry+dH*0.4); cx2.lineTo(mx2,focalY); cx2.stroke();
    cx2.fillStyle=`rgba(${er+40},${eg+30},${eb+50},0.85)`;
    cx2.beginPath(); cx2.arc(mx2,focalY,1.8,0,Math.PI*2); cx2.fill();
  }

  function drawBuilding(b, cfg, cx2, ox) {
    const [br,bg,bb] = tintColor(...cfg.fillBase);
    const [er,eg,eb] = tintColor(...cfg.edgeLight);
    const s = b.shade;
    cx2.save();
    cx2.beginPath(); cx2.rect(b.x+ox, b.yTop-60, b.w+2, b.bH+60); cx2.clip();
    cx2.fillStyle=`rgb(${br+s},${bg+s},${bb+s})`;
    if (b.shape===2) {
      const taper=Math.min(b.w*0.10,8);
      cx2.beginPath();
      cx2.moveTo(b.x+ox-taper,b.yBase); cx2.lineTo(b.x+ox+b.w+taper,b.yBase);
      cx2.lineTo(b.x+ox+b.w,b.yTop); cx2.lineTo(b.x+ox,b.yTop);
      cx2.closePath(); cx2.fill();
    } else { cx2.fillRect(b.x+ox,b.yTop,b.w,b.bH); }
    const rim=cx2.createLinearGradient(b.x+ox,0,b.x+ox+b.w,0);
    rim.addColorStop(0,    `rgba(${er},${eg},${eb},0.28)`);
    rim.addColorStop(0.07, `rgba(${er},${eg},${eb},0.07)`);
    rim.addColorStop(0.93, `rgba(${er},${eg},${eb},0.04)`);
    rim.addColorStop(1,    `rgba(${er},${eg},${eb},0.22)`);
    cx2.fillStyle=rim; cx2.fillRect(b.x+ox,b.yTop,b.w,b.bH);
    cx2.fillStyle=`rgba(${er},${eg},${eb},0.32)`; cx2.fillRect(b.x+ox,b.yTop,b.w,1.5);
    const [wr,wg,wb3]=cfg.winColor;
    const gapX=(b.w-8-b.winCols*cfg.winSize)/Math.max(1,b.winCols-1);
    const gapY=(b.bH-14-b.winRows*cfg.winSize)/Math.max(1,b.winRows-1);
    for (let col=0;col<b.winCols;col++) {
      for (let row=0;row<b.winRows;row++) {
        if (!b.windowStates[col*b.winRows+row]) continue;
        const wx=b.x+ox+4+col*(cfg.winSize+gapX);
        const wy=b.yTop+7+row*(cfg.winSize+gapY);
        const ws=cfg.winSize;
        cx2.fillStyle=`rgba(${wr},${wg},${wb3},${cfg.winOpacity})`;
        cx2.fillRect(wx,wy,ws,ws);
        cx2.strokeStyle=`rgba(${er+30},${eg+20},${eb+40},0.70)`;
        cx2.lineWidth=1; cx2.strokeRect(wx-1,wy-1,ws+2,ws+2);
      }
    }
    const parapetH=b.hasParapet?6:0;
    if (b.hasParapet) {
      cx2.fillStyle=`rgb(${br+s+6},${bg+s+4},${bb+s+9})`;
      cx2.fillRect(b.x+ox,b.yTop-parapetH,b.w,parapetH);
      cx2.fillStyle=`rgba(${er},${eg},${eb},0.28)`;
      cx2.fillRect(b.x+ox,b.yTop-parapetH,b.w,1);
    }
    const roofY=b.yTop-parapetH;
    if (b.hasAntenna) {
      const ax=b.x+ox+b.w*0.48, mH=22+(b.shade%16);
      cx2.strokeStyle=`rgba(${er},${eg},${eb},0.65)`; cx2.lineWidth=1;
      cx2.beginPath(); cx2.moveTo(ax,roofY); cx2.lineTo(ax,roofY-mH); cx2.stroke();
      cx2.beginPath(); cx2.moveTo(ax-5,roofY-mH*0.65); cx2.lineTo(ax+5,roofY-mH*0.65); cx2.stroke();
      cx2.fillStyle='rgba(255,55,55,0.92)';
      cx2.beginPath(); cx2.arc(ax,roofY-mH,1.8,0,Math.PI*2); cx2.fill();
    }
    if (b.hasDish) drawDish(cx2, b.x+ox+b.w*0.5, roofY, er, eg, eb);
    cx2.restore();
  }

  function buildLayers_fn() {
    builtLayers = BUILD_LAYERS.map(cfg => {
      const r = makeRng(cfg.seed);
      const totalWidth = W * 3;
      const buildings = [];
      let x = 0;
      while (x < totalWidth) {
        const w   = rng(cfg.minW, cfg.maxW, r);
        const bH  = rng(cfg.minH, cfg.maxH, r) * H;
        const yBase = cfg.yBase * H;
        const yTop  = yBase - bH;
        const shade = irng(0, 14, r);
        const shape = irng(0, 4, r);
        const winCols = Math.max(1, Math.floor((w-8)  / (cfg.winSize+cfg.winGap)));
        const winRows = Math.max(1, Math.floor((bH-14) / (cfg.winSize+cfg.winGap)));
        if (winCols<2||winRows<2){x+=w+rng(1,5,r);continue;}
        const windowStates = Array.from({length:winCols*winRows}, ()=>r()>0.36);
        const hasParapet = r()>0.38, hasAntenna = r()>0.82;
        const hasTank = r()>0.80, hasDish = r()>0.94;
        const stepW=w*rng(0.35,0.65,r), stepH=bH*rng(0.22,0.42,r), stepX=(w-stepW)*rng(0.1,0.9,r);
        buildings.push({x, yTop, yBase, w, bH, shade, shape,
                        winCols, winRows, windowStates,
                        hasParapet, hasAntenna, hasTank, hasDish,
                        stepW, stepH, stepX});
        x += w + rng(1,5,r);
      }

      const oc = document.createElement('canvas');
      oc.width  = totalWidth;
      oc.height = H;
      const oc2 = oc.getContext('2d');
      buildings.forEach(b => drawBuilding(b, cfg, oc2, 0));

      return { cfg, buildings, totalWidth, offscreen: oc };
    });
  }

  function drawBuildingLayer(layerData, scrollX) {
    const { cfg, totalWidth, offscreen } = layerData;
    // Signed scroll: works correctly for both positive and negative cityScrollSpeed
    const raw = scrollX * cfg.speed;
    const offset = -((raw % totalWidth) + totalWidth) % totalWidth;
    ctx.drawImage(offscreen, offset, 0);
    ctx.drawImage(offscreen, offset + totalWidth, 0);
  }

  // ── ROAD — cached gradients, rebuilt only when tint/size changes ───────
  let _roadAsphalt       = null;
  let _roadRefl          = null;
  let _roadY             = -1;

  function buildRoadGradients(roadY) {
    const [ar,ag,ab]    = tintColor(12,10,30);
    const [ar2,ag2,ab2] = tintColor(7,6,26);
    const asphalt = ctx.createLinearGradient(0,roadY,0,H);
    asphalt.addColorStop(0,`rgb(${ar},${ag},${ab})`);
    asphalt.addColorStop(1,`rgb(${ar2},${ag2},${ab2})`);

    const [rr,rg,rb] = tintColor(...(targetMood.roadGlow || [160,90,30]));
    const refl = ctx.createLinearGradient(0,roadY,0,H);
    refl.addColorStop(0,  `rgba(${rr},${rg},${rb},0.15)`);
    refl.addColorStop(0.6,`rgba(${Math.round(rr/2)},${Math.round(rg/2)},${Math.round(rb/2)},0.05)`);
    refl.addColorStop(1,  'rgba(0,0,0,0)');

    _roadAsphalt       = asphalt;
    _roadRefl          = refl;
    _roadY             = roadY;
    _roadGradientDirty = false;
  }

  function drawRoad(scrollX) {
    const roadY=H*HORIZON, roadH=H-roadY;

    if (_roadGradientDirty || roadY !== _roadY) buildRoadGradients(roadY);

    ctx.fillStyle=_roadAsphalt; ctx.fillRect(0,roadY,W,roadH);
    ctx.fillStyle='rgba(245,160,48,0.30)'; ctx.fillRect(0,roadY,W,2);
    ctx.fillStyle=_roadRefl; ctx.fillRect(0,roadY,W,roadH);

    const dashLen=38,dashGap=30,dashCycle=dashLen+dashGap;
    const phase=scrollX%dashCycle;
    ctx.strokeStyle='rgba(255,230,140,0.35)'; ctx.lineWidth=2;
    ctx.setLineDash([dashLen,dashGap]);
    ctx.lineDashOffset=phase;
    ctx.beginPath(); ctx.moveTo(0,roadY+roadH*0.40); ctx.lineTo(W,roadY+roadH*0.40); ctx.stroke();
    ctx.lineDashOffset=phase+dashCycle*0.5;
    ctx.beginPath(); ctx.moveTo(0,roadY+roadH*0.72); ctx.lineTo(W,roadY+roadH*0.72); ctx.stroke();
    ctx.setLineDash([]);

    const sidewalkH=Math.max(8,roadH*0.12);
    ctx.fillStyle='#0e0b20'; ctx.fillRect(0,H-sidewalkH,W,sidewalkH);
    const [fr,fg,fb] = tintColor(...(targetMood.groundFog || [130,90,200]));
    ctx.fillStyle=`rgba(${fr},${fg},${fb},0.18)`; ctx.fillRect(0,H-sidewalkH,W,1.5);
  }

  // ── AIRPLANES ─────────────────────────────────────────────────────────
  let planes = [], nextPlaneIn = 0;
  function spawnPlane() {
    const speed=20+Math.random()*25, dir=Math.random()>0.5?1:-1;
    const blinkPeriod=0.8+Math.random()*0.6;
    planes.push({ x:dir>0?-80:W+80, y:H*(0.05+Math.random()*0.20),
                  speed, dir, tailLen:160+Math.random()*200,
                  alpha:0.50+Math.random()*0.32, age:0,
                  maxAge:(W+160)/speed,
                  blinkPeriod, blinkPhase:Math.random()*blinkPeriod });
  }
  function updatePlanes(dt) {
    nextPlaneIn-=dt;
    if (nextPlaneIn<=0){spawnPlane();nextPlaneIn=30+Math.random()*60;}
    planes=planes.filter(p=>p.age<p.maxAge);
    // Planes move under their own power AND drift with the city scroll
    // Scrolling right boosts rightward planes and slows leftward ones
    planes.forEach(p=>{p.x+=p.dir*p.speed*dt + p.dir*cityScrollSpeed*dt*0.18;p.age+=dt;});
  }
  function drawPlanes() {
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      const fadein  = Math.min(1, p.age/3.5);
      const fadeout = Math.max(0, 1-(p.age-(p.maxAge-5))/5);
      const alpha   = p.alpha*fadein*fadeout;
      const tailX   = p.x-p.dir*p.tailLen;
      const g=ctx.createLinearGradient(p.x,p.y,tailX,p.y);
      g.addColorStop(0,  `rgba(255,255,255,${alpha*0.88})`);
      g.addColorStop(0.3,`rgba(245,240,230,${alpha*0.44})`);
      g.addColorStop(1,  'rgba(230,225,215,0)');
      ctx.strokeStyle=g; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tailX,p.y); ctx.stroke();
      const g2=ctx.createLinearGradient(p.x,p.y,tailX,p.y);
      g2.addColorStop(0,'rgba(255,255,255,'+alpha*0.13+')');
      g2.addColorStop(1,'rgba(255,255,255,0)');
      ctx.strokeStyle=g2; ctx.lineWidth=9;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tailX,p.y); ctx.stroke();
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill();
      const blinkT=(p.age+p.blinkPhase)%p.blinkPeriod;
      if (blinkT<p.blinkPeriod*0.35) {
        const lx=p.x, ly=p.y; // centered on plane dot
        const glow=ctx.createRadialGradient(lx,ly,0,lx,ly,7);
        glow.addColorStop(0,   `rgba(255,60,60,${alpha*0.9})`);
        glow.addColorStop(0.4, `rgba(255,30,30,${alpha*0.35})`);
        glow.addColorStop(1,   'rgba(255,0,0,0)');
        ctx.fillStyle=glow;
        ctx.beginPath(); ctx.arc(lx,ly,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(255,100,100,${alpha})`;
        ctx.beginPath(); ctx.arc(lx,ly,1.8,0,Math.PI*2); ctx.fill();
      }
    }
  }

  // ── RESIZE — debounced ─────────────────────────────────────────────────
  let _resizeTimer = null;
  function resize() {
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
    buildLayers_fn();
    buildClouds();
    buildStars();
    _moonCanvas        = null;
    _skyGradientDirty  = true;
    _roadGradientDirty = true;
  }
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(resize, 120);
  });
  resize();

  // ── MAIN LOOP ─────────────────────────────────────────────────────────
  let scrollX=0, t=0, lastNow=performance.now();
  const MAX_DT = 1/20;

  function draw(now) {
    const dt=Math.min((now-lastNow)/1000, MAX_DT);
    lastNow=now;
    t+=dt;

    if (moodT < 1) moodT = Math.min(1, moodT + MOOD_SPEED);

    // cityScrollSpeed is signed: positive = right, negative = left
    scrollX += cityScrollSpeed * dt;
    updatePlanes(dt);

    drawSky();
    drawMoon();
    drawStars(t);
    // Planes behind all building layers but in front of sky/clouds
    drawPlanes();
    drawClouds(scrollX);

    drawBuildingLayer(builtLayers[0], scrollX);
    const [g1r,g1g,g1b] = tintColor(6,4,14);
    ctx.fillStyle=`rgb(${g1r},${g1g},${g1b})`;
    ctx.fillRect(0, H*FAR_BASE, W, H*(1-FAR_BASE));

    drawBuildingLayer(builtLayers[1], scrollX);
    ctx.fillStyle=`rgb(${g1r},${g1g},${g1b})`;
    ctx.fillRect(0, H*MID_BASE, W, H*(1-MID_BASE));

    drawRoad(scrollX);
    drawBuildingLayer(builtLayers[2], scrollX);

    rafId = requestAnimationFrame(draw);
  }

  nextPlaneIn=20+Math.random()*35;
  syncVisibility();

})();
