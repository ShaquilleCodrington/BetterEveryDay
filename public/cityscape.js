// 2026-11-13: NEW FILE - condensed cityscape for the landing page hero.
// Removed from the app version: timer-page logic, localStorage settings,
// tint system, mood-change transitions, and storage/focus listeners.
// The landing page has no controls for any of those, so they were dead weight.

(function () {
  const canvas = document.getElementById('city-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  let W, H;

  // ── Settings (change these two to retune) ─────────────────────────────
  const MOOD         = 'default'; // 'default' | 'Focused' | 'Planning' | 'Recharge'
  const SCROLL_SPEED = 10;        // pixels/sec, positive = right, negative = left

  const HORIZON   = 0.70;
  const FAR_BASE  = 0.58;
  const MID_BASE  = 0.65;
  const NEAR_BASE = HORIZON;
  const GROUND    = 'rgb(6,4,14)';

  // ── Mood palettes ─────────────────────────────────────────────────────
  const MOODS = {
    default: {
      skyTops:    ['#08051a','#130a2e','#2e0f4a','#3a0f35','#8a2a18','#d06010','#e87820'],
      bloomColor: [230,110,20],
      cloudTints: [[178,168,218],[222,162,182],[255,162,112]],
      roadGlow:   [160,90,30],
      groundFog:  [130,90,200],
    },
    Focused: {
      skyTops:    ['#03060f','#060c22','#0a1840','#0e2255','#122880','#1a3aaa','#2050d0'],
      bloomColor: [30,80,200],
      cloudTints: [[140,160,240],[160,180,255],[180,200,255]],
      roadGlow:   [40,70,180],
      groundFog:  [60,100,255],
    },
    Planning: {
      skyTops:    ['#100800','#1e1000','#3a1c00','#5a2800','#8a4010','#c07020','#e8a030'],
      bloomColor: [220,130,20],
      cloudTints: [[240,200,140],[255,210,120],[255,180,80]],
      roadGlow:   [180,100,20],
      groundFog:  [200,140,50],
    },
    Recharge: {
      skyTops:    ['#001008','#001a10','#002a18','#003a20','#015c30','#028040','#03aa55'],
      bloomColor: [10,160,80],
      cloudTints: [[140,220,180],[160,240,200],[100,200,160]],
      roadGlow:   [20,120,70],
      groundFog:  [40,180,100],
    },
  };
  const mood = MOODS[MOOD] || MOODS.default;

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

  // ── Cached gradients (depend on canvas size, rebuilt in resize) ───────
  let skyGradient, bloomGradient, haloGradient, roadAsphalt, roadRefl;

  function buildGradients() {
    const skyH = H * HORIZON;

    skyGradient = ctx.createLinearGradient(0, 0, 0, skyH);
    [0, 0.25, 0.5, 0.7, 0.82, 0.92, 1].forEach((pos, i) =>
      skyGradient.addColorStop(pos, mood.skyTops[i]));

    const [br, bg, bb] = mood.bloomColor;
    bloomGradient = ctx.createRadialGradient(W * 0.5, skyH, 0, W * 0.5, skyH, W * 0.55);
    bloomGradient.addColorStop(0,   `rgba(${br},${bg},${bb},0.28)`);
    bloomGradient.addColorStop(0.5, `rgba(${br},${bg},${bb},0.08)`);
    bloomGradient.addColorStop(1,   'rgba(0,0,0,0)');

    const mx = MOON_X * W, my = MOON_Y * H;
    haloGradient = ctx.createRadialGradient(mx, my, MOON_R * 0.6, mx, my, MOON_R * 3.5);
    haloGradient.addColorStop(0,   'rgba(215,205,175,0.18)');
    haloGradient.addColorStop(0.5, 'rgba(195,185,150,0.06)');
    haloGradient.addColorStop(1,   'rgba(0,0,0,0)');

    const roadY = H * HORIZON;
    roadAsphalt = ctx.createLinearGradient(0, roadY, 0, H);
    roadAsphalt.addColorStop(0, 'rgb(12,10,30)');
    roadAsphalt.addColorStop(1, 'rgb(7,6,26)');

    const [rr, rg, rb] = mood.roadGlow;
    roadRefl = ctx.createLinearGradient(0, roadY, 0, H);
    roadRefl.addColorStop(0,   `rgba(${rr},${rg},${rb},0.15)`);
    roadRefl.addColorStop(0.6, `rgba(${rr >> 1},${rg >> 1},${rb >> 1},0.05)`);
    roadRefl.addColorStop(1,   'rgba(0,0,0,0)');
  }

  // ── Sky ───────────────────────────────────────────────────────────────
  function drawSky() {
    const skyH = H * HORIZON;
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, W, skyH);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, skyH, W, H - skyH);
    ctx.fillStyle = bloomGradient;
    ctx.fillRect(0, skyH * 0.80, W, skyH * 0.20);
  }

  // ── Moon (drawn once to an offscreen canvas) ──────────────────────────
  const MOON_X = 0.78, MOON_Y = 0.12, MOON_R = 42;
  let moonCanvas = null;

  function buildMoonCanvas() {
    const mr = MOON_R, size = mr * 3;
    const oc = document.createElement('canvas');
    oc.width = oc.height = size * 2;
    const c = oc.getContext('2d');
    const lit = c.createRadialGradient(size + mr * 0.15, size - mr * 0.2, 0, size, size, mr);
    lit.addColorStop(0,   '#fffbee');
    lit.addColorStop(0.5, '#f0e8c8');
    lit.addColorStop(1,   '#c8bfa0');
    c.fillStyle = lit;
    c.beginPath(); c.arc(size, size, mr, 0, Math.PI * 2); c.fill();
    // Cut a circle out of the lit disc to make the crescent
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(size - mr * 0.72, size - mr * 0.04, mr * 0.90, 0, Math.PI * 2); c.fill();
    moonCanvas = oc;
  }

  function drawMoon() {
    if (!moonCanvas) buildMoonCanvas();
    const mx = MOON_X * W, my = MOON_Y * H, size = MOON_R * 3;
    ctx.fillStyle = haloGradient;
    ctx.beginPath(); ctx.arc(mx, my, MOON_R * 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(moonCanvas, mx - size, my - size);
  }

  // ── Stars ─────────────────────────────────────────────────────────────
  let stars = [];

  function buildStars() {
    const r = makeRng(0xDEADBEEF);
    stars = Array.from({ length: 220 }, () => ({
      x: r(), y: r() * 0.60,
      radius: rng(0.3, 1.5, r),
      alpha: rng(0.25, 0.85, r),
      twinkle: r() * Math.PI * 2,
      twinkleSpeed: rng(0.3, 1.2, r),
    }));
  }

  function drawStars(t) {
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      const fade = Math.max(0, 1 - Math.max(0, s.y - 0.42) / 0.18);
      const tw = 0.72 + 0.28 * Math.sin(t * s.twinkleSpeed + s.twinkle);
      ctx.globalAlpha = s.alpha * tw * fade;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Clouds (each baked once to its own small canvas) ──────────────────
  let clouds = [];

  function makeCloud(r, layer, yFrac, wMin, wMax, hMin, hMax, sMin, sMax, pMin, pMax) {
    const w = rng(wMin, wMax, r), h = rng(hMin, hMax, r);
    const puffs = Array.from({ length: irng(pMin, pMax, r) }, () => ({
      dx: rng(-w * 0.42, w * 0.42, r), dy: rng(-h * 0.28, h * 0.28, r),
      rx: rng(w * 0.22, w * 0.50, r),  ry: rng(h * 0.38, h * 0.72, r),
    }));
    return { x: r() * W * 2.2, y: yFrac * H, w, h, layer, puffs, speed: rng(sMin, sMax, r) };
  }

  function bakeCloud(c) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of c.puffs) {
      minX = Math.min(minX, p.dx - p.rx); maxX = Math.max(maxX, p.dx + p.rx);
      minY = Math.min(minY, p.dy - p.ry); maxY = Math.max(maxY, p.dy + p.ry);
    }
    const oc = document.createElement('canvas');
    oc.width  = Math.max(1, Math.ceil(maxX - minX));
    oc.height = Math.max(1, Math.ceil(maxY - minY));
    const c2 = oc.getContext('2d');
    const [cr, cg, cb] = mood.cloudTints[c.layer];
    const ca = [0.22, 0.32, 0.44][c.layer];
    for (const p of c.puffs) {
      const px = p.dx - minX, py = p.dy - minY;
      const g = c2.createRadialGradient(px, py - p.ry * 0.22, 0, px, py, Math.max(p.rx, p.ry));
      g.addColorStop(0,    `rgba(${cr},${cg},${cb},${ca})`);
      g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${ca * 0.5})`);
      g.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`);
      c2.save();
      c2.translate(px, py);
      c2.scale(1, p.ry / p.rx);
      c2.fillStyle = g;
      c2.beginPath(); c2.arc(0, 0, p.rx, 0, Math.PI * 2); c2.fill();
      c2.restore();
    }
    c.canvas = oc; c.offX = minX; c.offY = minY;
  }

  function buildClouds() {
    const r = makeRng(0xC10DBABE);
    clouds = [];
    // Pushed in layer order (0 far, 1 mid, 2 near) so drawing in order layers them correctly
    for (let i = 0; i < 7; i++) clouds.push(makeCloud(r, 0, rng(0.06, 0.20, r), 100, 240, 16, 34, 0.06, 0.14, 4, 7));
    for (let i = 0; i < 5; i++) clouds.push(makeCloud(r, 1, rng(0.26, 0.44, r), 200, 420, 32, 64, 0.15, 0.28, 5, 9));
    for (let i = 0; i < 3; i++) clouds.push(makeCloud(r, 2, rng(0.46, 0.60, r), 300, 640, 48, 92, 0.26, 0.48, 6, 11));
    clouds.forEach(bakeCloud);
  }

  function drawClouds(scrollX) {
    for (const c of clouds) {
      const span = W + c.w * 2;
      const x = ((c.x - scrollX * c.speed) % span + span) % span - c.w;
      ctx.drawImage(c.canvas, x + c.offX, c.y + c.offY);
    }
  }

  // ── Buildings ─────────────────────────────────────────────────────────
  const LAYERS = [
    { seed:0xFA45C001, yBase:FAR_BASE,  minH:0.07, maxH:0.20, minW:20, maxW:55,
      speed:0.14, fillBase:[18,12,38], edgeLight:[60,40,110],
      winOpacity:0.42, winColor:[255,210,140], winSize:2, winGap:5 },
    { seed:0xD1DC17A0, yBase:MID_BASE,  minH:0.13, maxH:0.32, minW:35, maxW:95,
      speed:0.38, fillBase:[12,8,28],  edgeLight:[80,55,140],
      winOpacity:0.55, winColor:[255,222,162], winSize:3, winGap:6 },
    { seed:0xBEEFC17A, yBase:NEAR_BASE, minH:0.22, maxH:0.50, minW:60, maxW:150,
      speed:0.80, fillBase:[8,5,18],   edgeLight:[100,70,165],
      winOpacity:0.66, winColor:[255,238,185], winSize:4, winGap:8 },
  ];
  let builtLayers = [];

  function drawDish(c, bx, roofY, er, eg, eb) {
    const topY = roofY - 14, dW = 16, dH = 9;
    const lx = bx - dW / 2, rx = bx + dW / 2, ry = topY - 2, focalY = ry - dH * 0.7;
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${er},${eg},${eb},0.55)`;
    c.beginPath(); c.moveTo(bx, roofY); c.lineTo(bx, topY); c.stroke();
    c.strokeStyle = `rgba(${er + 25},${eg + 18},${eb + 35},0.80)`; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(lx, ry); c.quadraticCurveTo(bx, ry + dH, rx, ry); c.stroke();
    c.strokeStyle = `rgba(${er},${eg},${eb},0.50)`; c.lineWidth = 1;
    c.beginPath(); c.moveTo(lx, ry); c.lineTo(rx, ry); c.stroke();
    c.beginPath(); c.moveTo(bx, ry + dH * 0.4); c.lineTo(bx, focalY); c.stroke();
    c.fillStyle = `rgba(${er + 40},${eg + 30},${eb + 50},0.85)`;
    c.beginPath(); c.arc(bx, focalY, 1.8, 0, Math.PI * 2); c.fill();
  }

  function drawBuilding(b, cfg, c) {
    const [br, bg, bb] = cfg.fillBase;
    const [er, eg, eb] = cfg.edgeLight;
    const [wr, wg, wb] = cfg.winColor;
    const s = b.shade;

    c.save();
    c.beginPath(); c.rect(b.x, b.yTop - 60, b.w + 2, b.bH + 60); c.clip();

    // Body (shape 2 is slightly tapered)
    c.fillStyle = `rgb(${br + s},${bg + s},${bb + s})`;
    if (b.shape === 2) {
      const taper = Math.min(b.w * 0.10, 8);
      c.beginPath();
      c.moveTo(b.x - taper, b.yBase); c.lineTo(b.x + b.w + taper, b.yBase);
      c.lineTo(b.x + b.w, b.yTop);    c.lineTo(b.x, b.yTop);
      c.closePath(); c.fill();
    } else {
      c.fillRect(b.x, b.yTop, b.w, b.bH);
    }

    // Edge rim light and roofline
    const rim = c.createLinearGradient(b.x, 0, b.x + b.w, 0);
    rim.addColorStop(0,    `rgba(${er},${eg},${eb},0.28)`);
    rim.addColorStop(0.07, `rgba(${er},${eg},${eb},0.07)`);
    rim.addColorStop(0.93, `rgba(${er},${eg},${eb},0.04)`);
    rim.addColorStop(1,    `rgba(${er},${eg},${eb},0.22)`);
    c.fillStyle = rim; c.fillRect(b.x, b.yTop, b.w, b.bH);
    c.fillStyle = `rgba(${er},${eg},${eb},0.32)`; c.fillRect(b.x, b.yTop, b.w, 1.5);

    // Windows
    const ws = cfg.winSize;
    const gapX = (b.w - 8  - b.winCols * ws) / Math.max(1, b.winCols - 1);
    const gapY = (b.bH - 14 - b.winRows * ws) / Math.max(1, b.winRows - 1);
    for (let col = 0; col < b.winCols; col++) {
      for (let row = 0; row < b.winRows; row++) {
        if (!b.windowStates[col * b.winRows + row]) continue;
        const wx = b.x + 4 + col * (ws + gapX);
        const wy = b.yTop + 7 + row * (ws + gapY);
        c.fillStyle = `rgba(${wr},${wg},${wb},${cfg.winOpacity})`;
        c.fillRect(wx, wy, ws, ws);
        c.strokeStyle = `rgba(${er + 30},${eg + 20},${eb + 40},0.70)`;
        c.lineWidth = 1; c.strokeRect(wx - 1, wy - 1, ws + 2, ws + 2);
      }
    }

    // Parapet
    const parapetH = b.hasParapet ? 6 : 0;
    if (b.hasParapet) {
      c.fillStyle = `rgb(${br + s + 6},${bg + s + 4},${bb + s + 9})`;
      c.fillRect(b.x, b.yTop - parapetH, b.w, parapetH);
      c.fillStyle = `rgba(${er},${eg},${eb},0.28)`;
      c.fillRect(b.x, b.yTop - parapetH, b.w, 1);
    }
    const roofY = b.yTop - parapetH;

    // Antenna with red beacon
    if (b.hasAntenna) {
      const ax = b.x + b.w * 0.48, mH = 22 + (b.shade % 16);
      c.strokeStyle = `rgba(${er},${eg},${eb},0.65)`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ax, roofY); c.lineTo(ax, roofY - mH); c.stroke();
      c.beginPath(); c.moveTo(ax - 5, roofY - mH * 0.65); c.lineTo(ax + 5, roofY - mH * 0.65); c.stroke();
      c.fillStyle = 'rgba(255,55,55,0.92)';
      c.beginPath(); c.arc(ax, roofY - mH, 1.8, 0, Math.PI * 2); c.fill();
    }

    if (b.hasDish) drawDish(c, b.x + b.w * 0.5, roofY, er, eg, eb);
    c.restore();
  }

  function buildBuildingLayers() {
    builtLayers = LAYERS.map(cfg => {
      const r = makeRng(cfg.seed);
      const totalWidth = W * 3;
      const buildings = [];
      let x = 0;
      while (x < totalWidth) {
        const w = rng(cfg.minW, cfg.maxW, r);
        const bH = rng(cfg.minH, cfg.maxH, r) * H;
        const yBase = cfg.yBase * H;
        const shade = irng(0, 14, r);
        const shape = irng(0, 4, r);
        const winCols = Math.max(1, Math.floor((w - 8)  / (cfg.winSize + cfg.winGap)));
        const winRows = Math.max(1, Math.floor((bH - 14) / (cfg.winSize + cfg.winGap)));
        if (winCols < 2 || winRows < 2) { x += w + rng(1, 5, r); continue; }
        const windowStates = Array.from({ length: winCols * winRows }, () => r() > 0.36);
        const hasParapet = r() > 0.38, hasAntenna = r() > 0.82;
        r(); // unused "water tank" roll, kept so the city layout matches the app
        const hasDish = r() > 0.94;
        r(); r(); r(); // unused "step" rolls, same reason
        buildings.push({ x, yTop: yBase - bH, yBase, w, bH, shade, shape,
                         winCols, winRows, windowStates, hasParapet, hasAntenna, hasDish });
        x += w + rng(1, 5, r);
      }

      // Bake the whole strip of buildings once
      const offscreen = document.createElement('canvas');
      offscreen.width = totalWidth;
      offscreen.height = H;
      const c = offscreen.getContext('2d');
      buildings.forEach(b => drawBuilding(b, cfg, c));
      return { cfg, totalWidth, offscreen };
    });
  }

  function drawBuildingLayer({ cfg, totalWidth, offscreen }, scrollX) {
    const raw = scrollX * cfg.speed;
    const offset = -((raw % totalWidth) + totalWidth) % totalWidth;
    ctx.drawImage(offscreen, offset, 0);
    ctx.drawImage(offscreen, offset + totalWidth, 0);
  }

  // ── Road ──────────────────────────────────────────────────────────────
  function drawRoad(scrollX) {
    const roadY = H * HORIZON, roadH = H - roadY;

    ctx.fillStyle = roadAsphalt; ctx.fillRect(0, roadY, W, roadH);
    ctx.fillStyle = 'rgba(245,160,48,0.30)'; ctx.fillRect(0, roadY, W, 2);
    ctx.fillStyle = roadRefl; ctx.fillRect(0, roadY, W, roadH);

    // Two rows of lane dashes that scroll with the city
    const dashLen = 38, dashGap = 30, dashCycle = dashLen + dashGap;
    const phase = scrollX % dashCycle;
    ctx.strokeStyle = 'rgba(255,230,140,0.35)'; ctx.lineWidth = 2;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.lineDashOffset = phase;
    ctx.beginPath(); ctx.moveTo(0, roadY + roadH * 0.40); ctx.lineTo(W, roadY + roadH * 0.40); ctx.stroke();
    ctx.lineDashOffset = phase + dashCycle * 0.5;
    ctx.beginPath(); ctx.moveTo(0, roadY + roadH * 0.72); ctx.lineTo(W, roadY + roadH * 0.72); ctx.stroke();
    ctx.setLineDash([]);

    // Sidewalk strip with a faint fog line
    const sidewalkH = Math.max(8, roadH * 0.12);
    ctx.fillStyle = '#0e0b20'; ctx.fillRect(0, H - sidewalkH, W, sidewalkH);
    const [fr, fg, fb] = mood.groundFog;
    ctx.fillStyle = `rgba(${fr},${fg},${fb},0.18)`; ctx.fillRect(0, H - sidewalkH, W, 1.5);
  }

  // ── Airplanes ─────────────────────────────────────────────────────────
  let planes = [], nextPlaneIn = 20 + Math.random() * 35;

  function spawnPlane() {
    const speed = 20 + Math.random() * 25, dir = Math.random() > 0.5 ? 1 : -1;
    const blinkPeriod = 0.8 + Math.random() * 0.6;
    planes.push({
      x: dir > 0 ? -80 : W + 80, y: H * (0.05 + Math.random() * 0.20),
      speed, dir, tailLen: 160 + Math.random() * 200,
      alpha: 0.50 + Math.random() * 0.32, age: 0,
      maxAge: (W + 160) / speed,
      blinkPeriod, blinkPhase: Math.random() * blinkPeriod,
    });
  }

  function updatePlanes(dt) {
    nextPlaneIn -= dt;
    if (nextPlaneIn <= 0) { spawnPlane(); nextPlaneIn = 30 + Math.random() * 60; }
    planes = planes.filter(p => p.age < p.maxAge);
    // Planes fly on their own AND drift slightly with the city scroll
    planes.forEach(p => { p.x += p.dir * p.speed * dt + p.dir * SCROLL_SPEED * dt * 0.18; p.age += dt; });
  }

  function drawPlanes() {
    for (const p of planes) {
      const fadein  = Math.min(1, p.age / 3.5);
      const fadeout = Math.max(0, 1 - (p.age - (p.maxAge - 5)) / 5);
      const alpha   = p.alpha * fadein * fadeout;
      const tailX   = p.x - p.dir * p.tailLen;

      // Contrail: a thin bright line plus a wide faint glow
      const g = ctx.createLinearGradient(p.x, p.y, tailX, p.y);
      g.addColorStop(0,   `rgba(255,255,255,${alpha * 0.88})`);
      g.addColorStop(0.3, `rgba(245,240,230,${alpha * 0.44})`);
      g.addColorStop(1,   'rgba(230,225,215,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tailX, p.y); ctx.stroke();

      const g2 = ctx.createLinearGradient(p.x, p.y, tailX, p.y);
      g2.addColorStop(0, `rgba(255,255,255,${alpha * 0.13})`);
      g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g2; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tailX, p.y); ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();

      // Blinking red light
      if ((p.age + p.blinkPhase) % p.blinkPeriod < p.blinkPeriod * 0.35) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        glow.addColorStop(0,   `rgba(255,60,60,${alpha * 0.9})`);
        glow.addColorStop(0.4, `rgba(255,30,30,${alpha * 0.35})`);
        glow.addColorStop(1,   'rgba(255,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,100,100,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── Resize (sized to the hero container, debounced) ───────────────────
  let resizeTimer = null;

  function resize() {
    const box = canvas.parentElement;
    W = canvas.width  = box.clientWidth;
    H = canvas.height = box.clientHeight;
    buildGradients();
    buildBuildingLayers();
    buildClouds();
    buildStars();
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  // ── Main loop ─────────────────────────────────────────────────────────
  let scrollX = 0, t = 0, lastNow = performance.now();
  const MAX_DT = 1 / 20; // cap so a long pause doesn't cause a giant jump

  // Reset the clock when the tab comes back so dt doesn't spike
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastNow = performance.now();
  });

  function draw(now) {
    const dt = Math.min((now - lastNow) / 1000, MAX_DT);
    lastNow = now;
    t += dt;
    scrollX += SCROLL_SPEED * dt;
    updatePlanes(dt);

    drawSky();
    drawMoon();
    drawStars(t);
    drawPlanes();
    drawClouds(scrollX);

    // Far layer, then a ground fill so it blends into the next layer
    drawBuildingLayer(builtLayers[0], scrollX);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, H * FAR_BASE, W, H * (1 - FAR_BASE));

    drawBuildingLayer(builtLayers[1], scrollX);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, H * MID_BASE, W, H * (1 - MID_BASE));

    drawRoad(scrollX);
    drawBuildingLayer(builtLayers[2], scrollX);

    requestAnimationFrame(draw);
  }

  resize();
  requestAnimationFrame(draw);
})();