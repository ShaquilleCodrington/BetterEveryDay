// ============================================================
// starfield.js
// ------------------------------------------------------------
// Animated parallax star background for BetterEveryDay.
//
// HOW IT WORKS:
//   1. A <canvas id="star-canvas"> sits fixed behind the app.
//   2. Stars are split into 6 depth layers — far stars move
//      slowly, close stars move fast, creating parallax depth.
//   3. Cosmic mist blobs add nebula-like colour in the BG.
//   4. Settings (scroll, mouse-look) are read from localStorage
//      and updated instantly via a "starfield-update" event.
//   5. Mood themes are read from localStorage key "active-mood"
//      and updated via a "mood-change" event fired by
//      CongruencePage when the user selects a mood.
//      Each mood has its own:
//        - background colour
//        - star colour palette
//        - mist tint colours
//        - twinkle speed (calm vs energetic)
//        - star density / brightness multiplier
// ============================================================

(function () {

  // ── Canvas setup ────────────────────────────────────────────────────────
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  // ── Determine if this window is the timer window ─────────────────────────
  const IS_TIMER = window.location.hash.includes('/timer');

  // ── Active check ─────────────────────────────────────────────────────────
  function isActive() {
    if (IS_TIMER) {
      return (localStorage.getItem('timer-background') ?? 'starfield') === 'starfield';
    }
    return (localStorage.getItem('background-mode') ?? 'starfield') === 'starfield';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const rng  = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function hexToRGB(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  // Linearly interpolate between two [r,g,b] arrays by factor t (0–1)
  function lerpRGB(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function lerpValue(a, b, t) { return a + (b - a) * t; }

  // ── Mood theme definitions ───────────────────────────────────────────────
  const MOOD_THEMES = {

    default: {
      bg:         [4, 4, 26],
      stars:      [
        '#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
        '#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
        '#e8f0ff','#e8f0ff','#e8f0ff','#e8f0ff',
        '#cce0ff','#cce0ff','#b8d4ff',
        '#681EFF','#4e13c7','#533395',
      ],
      mist: [[50, 20, 150], [70, 25, 180], [30, 50, 170], [90, 20, 140], [40, 30, 190]],
      twinkleMin: 0.3,
      twinkleMax: 1.2,
      alphaBoost: 1.0,
    },

    Focused: {
      bg:         [3, 6, 24],
      stars:      [
        '#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
        '#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
        '#e8f0ff','#e8f0ff','#e8f0ff','#e8f0ff',
        '#cce0ff','#cce0ff','#cce0ff',
        '#b8d4ff','#b8d4ff','#a0c8ff',
      ],
      mist:       [[20,40,160],[10,30,140],[30,60,180],[15,50,155],[25,45,170]],
      twinkleMin: 0.6,
      twinkleMax: 1.8,
      alphaBoost: 1.15,
    },

    Planning: {
      bg:         [9, 6, 24],
      stars:      [
        '#ffffff','#ffffff','#ffffff','#ffffff',
        '#fffef0','#fffef0','#fffef0',
        '#fff8d0','#fff8d0','#fff8d0',
        '#fff5c0','#f2ffc0','#f6ffc0',
        '#ffd090','#ffd090','#ffb870',
        '#70518f','#9449a0','#723b49',
      ],
      mist:       [[120,60,10],[140,50,5],[100,70,15],[130,45,8],[110,65,12]],
      twinkleMin: 0.2,
      twinkleMax: 0.7,
      alphaBoost: 0.95,
    },

    Recharge: {
      bg:         [2, 10, 20],
      stars:      [
        '#ffffff','#ffffff','#ffffff','#ffffff',
        '#e0fff5','#e0fff5','#e0fff5',
        '#c0ffe8','#c0ffe8','#c0ffe8',
        '#72b79a','#95c6b2',
        '#80ffcc','#80ffcc',
        '#7af5c2','#64fab9',
        '#b8ffec','#d0fff8',
      ],
      mist:       [[0,100,80],[10,120,90],[0,80,100],[5,110,85],[15,95,75]],
      twinkleMin: 0.15,
      twinkleMax: 0.5,
      alphaBoost: 0.85,
    },
  };

  // ── Active theme state ───────────────────────────────────────────────────
  let activeMoodKey = localStorage.getItem('active-mood') || 'Focused';
  let currentTheme  = MOOD_THEMES[activeMoodKey] || MOOD_THEMES.default;
  let targetTheme   = currentTheme;
  let themeT        = 1.0;
  const THEME_SPEED = 0.008;

  window.addEventListener('mood-change', () => {
    const newMoodKey = localStorage.getItem('active-mood') || 'Focused';
    const newTheme   = MOOD_THEMES[newMoodKey] || MOOD_THEMES.default;
    if (newMoodKey !== activeMoodKey) {
      activeMoodKey = newMoodKey;
      currentTheme  = targetTheme;
      targetTheme   = newTheme;
      themeT        = 0;
      stars      = makeStars();
      cosmicMist = makeCosmicMist();
    }
    setTimeout(applyScreenTint, 50);
  });

  function getThemeBg() {
    return lerpRGB(currentTheme.bg, targetTheme.bg, themeT);
  }

  // ── User settings ─────────────────────────────────────────────────────────
  // scrollSpeed is in px/s (same unit as cityscape).
  // Positive = rightward, negative = leftward.
  // Stored in localStorage as 'star-scroll-speed'.
  let optScroll    = localStorage.getItem('star-scroll')    === 'true';
  let optMouseLook = localStorage.getItem('star-mouselook') !== 'false';
  let scrollSpeed  = parseFloat(localStorage.getItem('star-scroll-speed') || '40');
  let scrollX      = 0;

  function reloadSettings() {
    optScroll    = localStorage.getItem('star-scroll')    === 'true';
    optMouseLook = localStorage.getItem('star-mouselook') !== 'false';
    scrollSpeed  = parseFloat(localStorage.getItem('star-scroll-speed') || '40');
    if (!optScroll) scrollX = 0;
    applyScreenTint();
  }

  window.addEventListener('starfield-update', reloadSettings);

  // Re-read settings when the window regains focus (cross-window sync for timer)
  window.addEventListener('focus', reloadSettings);

  // Also sync via storage events (fires in other tabs when localStorage changes)
  window.addEventListener('storage', (e) => {
    const starKeys = ['star-scroll','star-mouselook','star-scroll-speed',
                      'tint-default-h','tint-default-s','active-mood',
                      'background-mode','timer-background'];
    const moodKeys = ['Focused','Planning','Recharge'].flatMap(m =>
      [`tint-${m}-enabled`,`tint-${m}-h`,`tint-${m}-s`]);
    if ([...starKeys, ...moodKeys].includes(e.key ?? '')) {
      reloadSettings();
      syncVisibility();
      // If mood changed in another tab, trigger mood-change event locally
      if (e.key === 'active-mood') {
        window.dispatchEvent(new CustomEvent('mood-change'));
      }
    }
  });

  // ── Screen tint overlay ───────────────────────────────────────────────────
  function applyScreenTint() {
    const tintEl = document.getElementById('screen-tint');
    if (!tintEl) return;

    if (!isActive()) {
      tintEl.style.opacity = '0';
      return;
    }

    const mood        = localStorage.getItem('active-mood') || 'Focused';
    const moodEnabled = localStorage.getItem(`tint-${mood}-enabled`) === 'true';

    let hue, strength;
    if (moodEnabled && mood !== 'default') {
      hue      = parseFloat(localStorage.getItem(`tint-${mood}-h`) || '0');
      strength = parseFloat(localStorage.getItem(`tint-${mood}-s`) || '0');
    } else {
      hue      = parseFloat(localStorage.getItem('tint-default-h') || '0');
      strength = parseFloat(localStorage.getItem('tint-default-s') || '0');
    }

    if (strength <= 0) {
      tintEl.style.opacity = '0';
    } else {
      tintEl.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
      // Slider still runs 0–1 (0–100%) end to end; the cap here is what
      // determines how strong the tint gets at full strength. Halved
      // from 0.35 -> 0.175 so max brightness/opacity is ~50% of before.
      tintEl.style.opacity          = String(Math.min(0.175, strength * 0.175));
    }
  }
  applyScreenTint();

  // ── Star layer config ─────────────────────────────────────────────────────
  const LAYERS = [
    { count: 280, minR: 0.3, maxR: 0.7, speed: 0.4, alpha: 0.35 },
    { count: 180, minR: 0.5, maxR: 1.0, speed: 1.0, alpha: 0.55 },
    { count: 100, minR: 0.8, maxR: 1.5, speed: 1.8, alpha: 0.72 },
    { count: 55,  minR: 1.2, maxR: 2.2, speed: 3.0, alpha: 0.85 },
    { count: 22,  minR: 1.8, maxR: 3.0, speed: 5.0, alpha: 0.95 },
    { count:  8,  minR: 2.5, maxR: 4.0, speed: 8.0, alpha: 1.0  },
  ];

  function makeStars() {
    const theme = targetTheme;
    return LAYERS.map(l =>
      Array.from({ length: l.count }, () => {
        const rgb = hexToRGB(pick(theme.stars));
        return {
          x:            rng(0, 1),
          y:            rng(0, 1),
          r:            rng(l.minR, l.maxR),
          colorFrom:    rgb,
          alpha:        rng(l.alpha * 0.7, l.alpha),
          twinkle:      rng(0, Math.PI * 2),
          twinkleSpeed: rng(theme.twinkleMin, theme.twinkleMax),
          speed:        l.speed,
        };
      })
    );
  }

  function makeCosmicMist() {
    const theme = targetTheme;
    return Array.from({ length: 4 }, () => ({
      x:     rng(0, 1),
      y:     rng(0, 1),
      rx:    rng(350, 600),
      ry:    rng(200, 320),
      color: pick(theme.mist),
      a:     rng(0.022, 0.048),
      speed: rng(0.04, 0.10),
    }));
  }

  // ── Declare stars/cosmicMist before resize() is called ───────────────────
  let stars      = makeStars();
  let cosmicMist = makeCosmicMist();

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars      = makeStars();
    cosmicMist = makeCosmicMist();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Visibility control ────────────────────────────────────────────────────
  function syncVisibility() {
    const on = isActive();
    canvas.style.display = on ? 'block' : 'none';
    applyScreenTint();
  }
  window.addEventListener('background-update',       syncVisibility);
  window.addEventListener('timer-background-update', syncVisibility);
  syncVisibility();

  // ── Mouse parallax ────────────────────────────────────────────────────────
  let mx = 0, my = 0, smx = 0, smy = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Black Hole ────────────────────────────────────────────────────────────
  // A singularity that grows as the timer counts down. Adapted from the
  // standalone blackhole.js prototype to share this file's ctx/t/rng.
  //
  //   - Position: centered on the timer screen (no mouse-follow here).
  //   - Scale:    driven by countdown progress — bigger as time runs out.
  //   - Lensing:  stars near the hole are displaced/swallowed for the
  //               gravitational-lens look; particles + accretion disk render
  //               on top.
  let optBlackHole = false;

  let bhX = 0, bhY = 0;
  let bhTargetX = 0, bhTargetY = 0;
  let bhActive     = false;
  let bhSpawning   = false;
  let bhDespawning = false;
  let bhScale      = 0; // 0→1 visual scale, driven by timer progress

  const BH_STRENGTH   = 26000;
  const BH_RADIUS     = 40;
  const BH_INNER_MASK = 36;
  const BH_LENS_OUTER = 560;
  const BH_SMOOTH     = 0.09;
  const BH_MIN_SCALE  = 0.18; // smallest the hole gets once the timer starts
  const BH_MAX_GROW   = 1.6;  // extra scale multiplier reached at 0:00

  // The ring system's ORIENTATION is fixed (Interstellar-style tilt) — it
  // never spins around like a record. Only a slow angular "flow phase"
  // sweeps brightness around the rings (Doppler-beaming / light-warp look),
  // plus a gentle wobble in the tilt for a living, breathing feel.
  const BH_TILT       = -0.36;  // fixed disk tilt, radians
  const BH_FLOW_SPEED = 0.22;   // speed of the brightness sweep — not a spin
  let   bhFlowPhase   = 0;
  let   bhWobble      = 0;

  // Layered, separated rings (instead of one solid spinning disk) —
  // closer to the reference art's lavender/white "Saturn ring" look.
  // Each is drawn as a static, partial arc; only its colour sweeps.
  const BH_RINGS = [
    { rMul: 2.35, squash: 0.300, width: 0.15, alpha: 0.70 },
    { rMul: 2.95, squash: 0.305, width: 0.11, alpha: 0.55 },
    { rMul: 3.55, squash: 0.310, width: 0.085,alpha: 0.42 },
    { rMul: 4.25, squash: 0.315, width: 0.07, alpha: 0.32 },
    { rMul: 5.00, squash: 0.320, width: 0.055,alpha: 0.22 },
  ];

  // Particles — faint star-like motes that fade in out at the edge of the
  // lens, spiral inward along the disk's tilted plane, and fade out as
  // they're swallowed at the event horizon. (Replaces the old polar jets.)
  const bhParticles = [];
  const BH_PARTICLE_COUNT = 70;

  function spawnBHParticle() {
    return {
      angle:     rng(0, Math.PI * 2),
      dist:      0, // set from startDist below; kept for clarity
      startDist: rng(BH_LENS_OUTER * 0.45, BH_LENS_OUTER * 0.95),
      age:       0,
      life:      rng(2.6, 4.4),
      maxAlpha:  rng(0.45, 0.9),
      r:         rng(0.6, 1.8),
      hue:       rng(255, 285),
      spin:      rng(0.2, 0.6) * (Math.random() < 0.5 ? 1 : -1),
    };
  }

  function tickBHParticles(dt) {
    if (bhActive && bhScale > 0.35 && optBlackHoleParticlesOn) {
      const toSpawn = Math.floor(rng(0, 2));
      for (let i = 0; i < toSpawn; i++) {
        if (bhParticles.length < BH_PARTICLE_COUNT) bhParticles.push(spawnBHParticle());
      }
    }

    const innerCut = BH_RADIUS * bhScale * 1.08;
    const cosT = Math.cos(BH_TILT), sinT = Math.sin(BH_TILT);

    for (let i = bhParticles.length - 1; i >= 0; i--) {
      const p = bhParticles[i];
      p.age += dt;
      const tn = Math.min(1, p.age / p.life);

      // Accelerating infall — slow drift at first, fast plunge near the end.
      const dist = p.startDist * Math.pow(1 - tn, 1.7);
      p.angle += p.spin * dt * (1 + (1 - tn) * 0.5);

      if (p.age >= p.life || dist <= innerCut) { bhParticles.splice(i, 1); continue; }

      // Fade in, hold, then fade out right as it's swallowed.
      let alphaT;
      if (tn < 0.15)      alphaT = tn / 0.15;
      else if (tn > 0.82) alphaT = Math.max(0, 1 - (tn - 0.82) / 0.18);
      else                alphaT = 1;

      // Flatten onto, and tilt to match, the same plane the rings sit on.
      const lx = Math.cos(p.angle) * dist;
      const ly = Math.sin(p.angle) * dist * 0.55;
      const px = bhX + (lx * cosT - ly * sinT);
      const py = bhY + (lx * sinT + ly * cosT);

      ctx.save();
      ctx.globalAlpha = alphaT * p.maxAlpha * bhScale;
      ctx.fillStyle = `hsl(${p.hue}, 55%, 90%)`;
      ctx.beginPath();
      ctx.arc(px, py, p.r * (0.6 + tn * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Given a star's real screen position, returns the lensed (apparent)
  // position, or hidden:true if it's been swallowed by the event horizon.
  function lensedPosition(px, py) {
    if (!optBlackHole || bhScale < 0.01) return { x: px, y: py, hidden: false };

    const dx = px - bhX;
    const dy = py - bhY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

    if (dist < BH_INNER_MASK * bhScale) return { x: px, y: py, hidden: true };
    if (dist > BH_LENS_OUTER) return { x: px, y: py, hidden: false };

    const strength = BH_STRENGTH * bhScale;
    const falloff  = Math.max(0, 1 - dist / BH_LENS_OUTER);
    const deflect  = (strength / (dist * dist)) * falloff * falloff;

    const nx = dx / dist;
    const ny = dy / dist;

    // A slow ripple riding on top of the bend gives the lensing a living,
    // "warping" feel rather than a fixed static displacement.
    const ripple = 1 + 0.22 * Math.sin(t * 1.4 - dist * 0.05);

    const swirlStrength = deflect * 0.55 * ripple;
    const tx = -ny;
    const ty =  nx;

    const ringBoost = dist < BH_RADIUS * 3.4 * bhScale
      ? (1 + (BH_RADIUS * 3.4 * bhScale - dist) / (BH_RADIUS * 2.2 * bhScale)) * 2.8
      : 1;

    const totalDeflect = deflect * ringBoost * ripple;

    return {
      x: px + nx * totalDeflect + tx * swirlStrength,
      y: py + ny * totalDeflect + ty * swirlStrength,
      hidden: false,
    };
  }

  function drawBlackHole(dt) {
    if (!optBlackHole && bhScale < 0.01) return;

    if (bhTimerRunning) tickBHProgress();

    bhX += (bhTargetX - bhX) * BH_SMOOTH * (1 + (1 - bhScale) * 2);
    bhY += (bhTargetY - bhY) * BH_SMOOTH * (1 + (1 - bhScale) * 2);

    // Scale animation: spawn/despawn in, then track timer progress while active.
    if (bhSpawning) {
      bhScale = Math.min(bhTargetScale(), bhScale + dt * 1.8);
      if (bhScale >= bhTargetScale() - 0.001) bhSpawning = false;
    } else if (bhDespawning) {
      bhScale = Math.max(0, bhScale - dt * 2.2);
      if (bhScale <= 0) { bhScale = 0; bhDespawning = false; }
    } else if (bhActive) {
      // Smoothly track the growth target as the timer ticks down.
      bhScale += (bhTargetScale() - bhScale) * Math.min(1, dt * 2);
    }

    if (bhScale < 0.005) return;

    // The rings never fully rotate — only the light-flow phase advances,
    // sweeping brightness around the fixed ring geometry (Doppler-beaming
    // style), plus a small organic wobble in the tilt.
    bhFlowPhase += BH_FLOW_SPEED * dt;
    bhWobble = Math.sin(t * 0.15) * 0.025;

    const s    = bhScale;
    const sa   = Math.min(1, s); // clamp for alpha math
    const r    = BH_RADIUS * s;
    const cx   = bhX, cy = bhY;
    const tilt = BH_TILT + bhWobble;

    // ── Outer ambient lensing glow ──────────────────────────────────────
    ctx.save();
    const lensGlow = ctx.createRadialGradient(cx, cy, r * 1.1, cx, cy, BH_LENS_OUTER * 0.78 * s);
    lensGlow.addColorStop(0,    `rgba(235,225,255,${0.16 * sa})`);
    lensGlow.addColorStop(0.35, `rgba(195,175,235,${0.09 * sa})`);
    lensGlow.addColorStop(0.7,  `rgba(140,115,190,${0.04 * sa})`);
    lensGlow.addColorStop(1,    `rgba(90,75,140,0)`);
    ctx.fillStyle = lensGlow;
    ctx.beginPath(); ctx.arc(cx, cy, BH_LENS_OUTER * 0.78 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Event horizon — solid, with a faint ambient-lit rim ─────────────
    ctx.save();
    const sphereGrad = ctx.createRadialGradient(
      cx - r * 0.18, cy - r * 0.18, r * 0.05,
      cx, cy, r * 1.04
    );
    sphereGrad.addColorStop(0,    `rgba(22,16,36,${sa})`);
    sphereGrad.addColorStop(0.55, `rgba(10,7,21,${sa})`);
    sphereGrad.addColorStop(1,    `rgba(2,1,8,${sa})`);
    ctx.fillStyle = sphereGrad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Photon ring — thin bright Einstein ring hugging the horizon.
    //    Brightness no longer pulses unevenly — kept steady so it reads as
    //    consistent, ambient rim light rather than a one-sided highlight. ──
    ctx.save();
    ctx.strokeStyle = `rgba(235,225,255,${0.42 * sa})`;
    ctx.lineWidth = 1.7 * s;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.20 * sa})`;
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // ── Collar glow — a soft, even halo bridging the gap between the
    //    sphere's edge and where the rings fade in. Purely additive ambient
    //    light sitting outside the sphere (never overlaps it), so the rings
    //    feel like they're melting out of the planet rather than just
    //    appearing out of empty space. ───────────────────────────────────
    ctx.save();
    const collarGlow = ctx.createRadialGradient(cx, cy, r * 1.0, cx, cy, r * 1.9);
    collarGlow.addColorStop(0,    `rgba(225,210,255,0)`);
    collarGlow.addColorStop(0.3,  `rgba(225,210,255,${0.10 * sa})`);
    collarGlow.addColorStop(0.6,  `rgba(200,185,240,${0.05 * sa})`);
    collarGlow.addColorStop(1,    `rgba(200,185,240,0)`);
    ctx.fillStyle = collarGlow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Layered "Saturn ring" arcs — each ring is built point-by-point in
    //    screen space, and only the segments that fall OUTSIDE the sphere's
    //    radius are ever added to the path. This guarantees the stroke can
    //    never visually cross the planet — it doesn't rely on ctx.clip(),
    //    so there's no risk of a clip region silently failing to apply.
    //    Near that boundary, segments fade smoothly in (alpha ramps 0→1)
    //    rather than cutting off abruptly, so each ring reads as gently
    //    emerging from behind the planet instead of snapping into view.
    //    The far-side half is simply never drawn, and the near-side half
    //    passes in front, reading as one ring that wraps naturally over
    //    the top. Only the brightness sweep (conic gradient driven by
    //    bhFlowPhase) animates, never the shape. ─────────────────────────
    BH_RINGS.forEach(ring => drawBHRing(cx, cy, r, tilt, ring, sa));

    tickBHParticles(dt);

    ctx.save();
    const warpGrad = ctx.createRadialGradient(cx, cy, r * 1.7, cx, cy, BH_LENS_OUTER * 0.62 * s);
    warpGrad.addColorStop(0,   `rgba(150,120,220,${0.06 * sa})`);
    warpGrad.addColorStop(0.4, `rgba(90,70,160,${0.035 * sa})`);
    warpGrad.addColorStop(1,   `rgba(40,30,90,0)`);
    ctx.fillStyle = warpGrad;
    ctx.beginPath(); ctx.arc(cx, cy, BH_LENS_OUTER * 0.62 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Draws one ring of the layered ring system. Builds the ellipse in
  // SCREEN space point-by-point (tilt + squash applied by hand, since
  // rotation preserves distance-from-center this is just trig, no ctx
  // transform needed). Points inside `hardSafeDist` are NEVER added to
  // the path — that's the hard geometric guarantee that the stroke can't
  // render over the planet. Points between `hardSafeDist` and the end of
  // the fade band are drawn with a smoothstep-eased alpha ramp (0 → 1),
  // so the ring visually melts out of the sphere rather than snapping
  // into view. A soft shadow blur adds a gentle glow for a fancier,
  // less flat look.
  // Performance note: this used to stroke each of the ~220 segments
  // individually (so the fade-in alpha could vary smoothly), with
  // shadowBlur turned on for a glow. That's ~220 stroke() calls per ring
  // ×5 rings = ~1100 draw calls/frame, and shadowBlur is one of the most
  // expensive canvas operations — paying it on every single tiny segment
  // made it dramatically worse. That combination was the main source of
  // animation lag.
  //
  // Instead: quantize the fade-in alpha into BUCKETS discrete tiers, walk
  // the point set once per tier to build a single Path2D covering every
  // segment at-or-above that tier (handling gaps via moveTo), and stroke
  // it once. That's at most BUCKETS stroke() calls per pass instead of
  // ~220. The old shadowBlur glow is faked with a second, wider/fainter
  // pass underneath the crisp core pass — no shadowBlur needed at all.
  // Total: 10 buckets × 2 passes × 5 rings = ~100 draw calls/frame.
  const RING_ALPHA_BUCKETS = 10;

  function drawBHRing(cx, cy, r, tilt, ring, sa) {
    const radius      = r * ring.rMul;
    const lineWidth    = Math.max(0.6, r * ring.width);
    const hardSafeDist = r + lineWidth * 0.5 + 1; // never draw inside this — guarantees no overlap
    const fadeWidth     = Math.max(lineWidth * 2.5, r * 0.22); // distance over which alpha ramps in
    const segments      = 220;
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

    // Softened, more even brightness sweep — narrower contrast between the
    // brightest and dimmest point on the ring, so no single spot reads as
    // dramatically over- or under-lit relative to the rest.
    let strokeStyle;
    try {
      const a = ring.alpha * sa;
      const grad = ctx.createConicGradient(bhFlowPhase, cx, cy);
      grad.addColorStop(0.00, `hsla(266, 48%, 87%, ${a})`);
      grad.addColorStop(0.16, `hsla(264, 45%, 80%, ${a * 0.92})`);
      grad.addColorStop(0.38, `hsla(260, 40%, 70%, ${a * 0.82})`);
      grad.addColorStop(0.55, `hsla(257, 36%, 60%, ${a * 0.72})`);
      grad.addColorStop(0.72, `hsla(260, 40%, 70%, ${a * 0.82})`);
      grad.addColorStop(0.90, `hsla(264, 45%, 81%, ${a * 0.92})`);
      grad.addColorStop(1.00, `hsla(266, 48%, 87%, ${a})`);
      strokeStyle = grad;
    } catch {
      // Fallback for environments without conic-gradient support.
      strokeStyle = `hsla(262, 45%, 76%, ${ring.alpha * sa * 0.8})`;
    }

    // Precompute the point set once, bucketing each point's fade-in alpha
    // into one of RING_ALPHA_BUCKETS tiers. Bucket 0 = inside hardSafeDist,
    // i.e. never drawn — same hard geometric guarantee as before.
    const pts = new Array(segments + 1);
    for (let i = 0; i <= segments; i++) {
      const a  = (i / segments) * Math.PI * 2;
      const lx = radius * Math.cos(a);
      const ly = radius * ring.squash * Math.sin(a);
      const sx = cx + (lx * cosT - ly * sinT);
      const sy = cy + (lx * sinT + ly * cosT);
      const dist = Math.hypot(sx - cx, sy - cy);

      let bucket = 0;
      if (dist >= hardSafeDist) {
        const fadeT = Math.min(1, (dist - hardSafeDist) / fadeWidth);
        const eased = fadeT * fadeT * (3 - 2 * fadeT); // smoothstep
        bucket = eased <= 0.01 ? 0 : Math.max(1, Math.round(eased * RING_ALPHA_BUCKETS));
      }
      pts[i] = { x: sx, y: sy, bucket };
    }

    // Two batched passes fake the old shadowBlur glow: a wide, faint
    // "halo" pass underneath a slim, full-strength "core" pass — both
    // plain strokes, no shadowBlur.
    const passes = [
      { widthMul: 2.4, alphaMul: 0.28 }, // halo
      { widthMul: 1.0, alphaMul: 1.0 },  // core
    ];

    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const pass of passes) {
      ctx.lineWidth = lineWidth * pass.widthMul;

      for (let bucket = 1; bucket <= RING_ALPHA_BUCKETS; bucket++) {
        const path = new Path2D();
        let open = false;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (p.bucket >= bucket) {
            if (!open) { path.moveTo(p.x, p.y); open = true; }
            else path.lineTo(p.x, p.y);
          } else {
            open = false;
          }
        }

        ctx.globalAlpha = (bucket / RING_ALPHA_BUCKETS) * pass.alphaMul;
        ctx.stroke(path);
      }
    }
    ctx.restore();
  }

  function activateBlackHole() {
    bhSpawning   = true;
    bhDespawning = false;
    bhActive     = true;
  }

  function deactivateBlackHole() {
    bhDespawning = true;
    bhSpawning   = false;
    bhActive     = false;
  }

  // ── Timer black hole bridge (only relevant on the timer window) ─────────
  // The timer countdown reports its progress (0 = just started, 1 = done)
  // via localStorage + a "timer-progress" event so it works across windows.
  let optBlackHoleEnabled = localStorage.getItem('timer-blackhole') !== 'false';
  let optBlackHoleParticlesOn  = localStorage.getItem('timer-blackhole-particles') !== 'false';
  let bhTimerRunning      = false;
  let bhTimerProgress     = 0; // 0..1, last authoritative value from the timer tick

  // Progress arrives from the timer in discrete once-a-second ticks. Rather
  // than feed that stair-stepped value straight into the scale target (which
  // makes the hole visibly lurch each second), replay the known change
  // between the last two ticks smoothly, frame by frame, over the interval.
  let bhDisplayProgress     = 0; // continuously-animated progress used for rendering
  let bhProgressStart       = 0; // progress value at the start of the current interval
  let bhProgressEnd         = 0; // progress value we're interpolating toward
  let bhProgressTickStart   = 0; // timestamp this interval began
  let bhProgressTickLength  = 1; // how long the previous interval took (seconds)
  let bhLastProgressTime    = 0; // timestamp of the last authoritative update

  function bhTargetScale() {
    if (!bhTimerRunning) return 0;
    return BH_MIN_SCALE + bhDisplayProgress * BH_MAX_GROW;
  }

  // Called every frame. Fills in the gap between the last two known ticks
  // by walking a fraction of the way from start to end, based on how much
  // of that interval's real time has actually elapsed.
  function tickBHProgress() {
    const now = performance.now() / 1000;
    const elapsed = now - bhProgressTickStart;
    const frac = Math.min(1, elapsed / bhProgressTickLength);
    bhDisplayProgress = bhProgressStart + (bhProgressEnd - bhProgressStart) * frac;
  }

  function reloadBHSettings() {
    optBlackHoleEnabled = localStorage.getItem('timer-blackhole') !== 'false';
    optBlackHoleParticlesOn  = localStorage.getItem('timer-blackhole-particles') !== 'false';
  }

  function applyTimerProgress(running, progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    const now = performance.now() / 1000;

    // Start a new interpolation leg: from wherever we currently are
    // displaying, toward this freshly-received true value, over however
    // long the previous interval actually took (falls back to 1s on the
    // very first tick, when there's no prior interval to measure).
    bhProgressStart      = bhDisplayProgress;
    bhProgressEnd         = clamped;
    bhProgressTickLength  = bhLastProgressTime > 0 ? Math.max(0.01, now - bhLastProgressTime) : 1;
    bhProgressTickStart   = now;
    bhLastProgressTime    = now;

    bhTimerRunning  = running;
    bhTimerProgress = clamped;

    if (!IS_TIMER || !optBlackHoleEnabled) {
      if (bhActive) deactivateBlackHole();
      return;
    }

    optBlackHole = true;

    // Center the black hole on the timer screen.
    bhTargetX = window.innerWidth  / 2;
    bhTargetY = window.innerHeight / 2;

    if (running && !bhActive) {
      activateBlackHole();
    } else if (!running && bhActive) {
      deactivateBlackHole();
    }
  }

  window.addEventListener('timer-progress', e => {
    const detail = e.detail || {};
    applyTimerProgress(!!detail.running, Number(detail.progress) || 0);
  });

  // Cross-window sync: TimerPage writes these on every tick.
  window.addEventListener('storage', e => {
    if (e.key === 'timer-running' || e.key === 'timer-progress-value') {
      const running  = localStorage.getItem('timer-running') === 'true';
      const progress = parseFloat(localStorage.getItem('timer-progress-value') || '0');
      applyTimerProgress(running, progress);
    }
    if (e.key === 'timer-blackhole' || e.key === 'timer-blackhole-particles') {
      reloadBHSettings();
    }
  });
  window.addEventListener('timer-blackhole-update', reloadBHSettings);

  // On the timer window, pick up whatever state is already in localStorage
  // (covers the case where the window opens mid-countdown).
  if (IS_TIMER) {
    applyTimerProgress(
      localStorage.getItem('timer-running') === 'true',
      parseFloat(localStorage.getItem('timer-progress-value') || '0')
    );
  }

  // ── Main draw loop ────────────────────────────────────────────────────────
  // scrollSpeed (px/s) is converted to a normalised per-frame delta
  // by dividing by W, keeping the existing wrapping math intact.
  let t   = 0;
  const DT = 0.016; // fixed timestep (~60fps), matches original

  function draw() {
    t += DT;

    if (themeT < 1) themeT = Math.min(1, themeT + THEME_SPEED);

    // Scroll / mouse-look
    if (optScroll) {
      scrollX += (scrollSpeed * DT) / W; // px/s → normalised units
      smx += (0 - smx) * 0.05;
      smy += ((optMouseLook ? my : 0) - smy) * 0.05;
    } else {
      smx += ((optMouseLook ? mx : 0) - smx) * 0.05;
      smy += ((optMouseLook ? my : 0) - smy) * 0.05;
    }

    // Background
    const [br, bg, bb] = getThemeBg();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(0, 0, W, H);

    // Cosmic mist
    const alphaBoost = lerpValue(currentTheme.alphaBoost, targetTheme.alphaBoost, themeT);
    cosmicMist.forEach(n => {
      const ox = smx * n.speed * W * 0.10 - scrollX * n.speed * W;
      const oy = smy * n.speed * H * 0.10;
      const cx = n.x * W + ox;
      const cy = n.y * H + oy;
      const [r, g, b] = n.color;
      const mistAlpha = n.a * alphaBoost;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, n.rx);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${mistAlpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${mistAlpha * 0.3})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.save();
      ctx.scale(1, n.ry / n.rx);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy * (n.rx / n.ry), n.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Stars
    stars.forEach(layer => {
      layer.forEach(s => {
        const ox = smx * s.speed * W * 0.04 - scrollX * s.speed * W;
        const oy = smy * s.speed * H * 0.04;
        let px = ((s.x * W + ox) % W + W) % W;
        let py = ((s.y * H + oy) % H + H) % H;

        if (optBlackHole) {
          const lensed = lensedPosition(px, py);
          if (lensed.hidden) return;
          px = lensed.x;
          py = lensed.y;
        }

        const tw = 0.75 + 0.25 * Math.sin(t * s.twinkleSpeed + s.twinkle);

        ctx.globalAlpha = Math.min(1, s.alpha * tw * alphaBoost);
        const [r, g, b] = s.colorFrom;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * Math.min(2.0, tw), 0, Math.PI * 2);
        ctx.fill();

        if (s.r > 2.0) {
          ctx.globalAlpha = Math.min(0.6, s.alpha * tw * 0.2 * alphaBoost);
          ctx.beginPath();
          ctx.arc(px, py, s.r * Math.min(3.5, tw * 2.5), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    ctx.globalAlpha = 1;

    // Black hole renders on top of the stars (timer screen only)
    drawBlackHole(DT);

    requestAnimationFrame(draw);
  }

  draw();

})();
