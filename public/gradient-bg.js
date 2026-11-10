// ============================================================
// gradient-bg.js
// ------------------------------------------------------------
// Simple customizable gradient background for BetterEveryDay.
//
// HOW IT WORKS:
//   1. A <div id="gradient-bg"> sits fixed behind the app,
//      same layer as the star/city canvases.
//   2. Settings (two colours + angle) are read from localStorage
//      and applied as a CSS linear-gradient.
//   3. Settings update instantly via the "gradient-update" event,
//      fired by AppearancePage when the user tweaks a control.
//   4. Mode switching (which background is active) is shared
//      with starfield.js / cityscape.js via "background-update"
//      and "timer-background-update" events, plus storage events
//      for cross-window sync (e.g. the floating timer window).
//   5. Colours (and the angle) can be overridden per-mood. When the
//      active mood changes we don't just snap to the new colours —
//      we tween the hue/saturation/lightness/angle of both stops
//      over a short animation so the background eases into the new
//      mood instead of jump-cutting. CSS can't animate between two
//      different linear-gradient() values on its own, so this is
//      done frame-by-frame in JS.
//
// BUG FIX: the timer window sets timer-background via its own
// React state, which fires CustomEvents in that same window.
// But when the gradient colours/angle change from the main
// window, those arrive only as storage events — we must call
// applyGradient() (not just syncVisibility) when gradient keys
// change so the colours actually update live.
// ============================================================

(function () {

  const el = document.getElementById('gradient-bg');
  if (!el) return;

  const IS_TIMER = window.location.hash.includes('/timer');

  function isActive() {
    if (IS_TIMER) return (localStorage.getItem('timer-background') ?? 'city') === 'gradient';
    return (localStorage.getItem('background-mode') ?? 'city') === 'gradient';
  }

  function hslStr(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // Reads the two gradient colour stops AND the angle, preferring a
  // per-mood override (set on the Appearance page) when the active mood
  // has one enabled — same pattern cityscape.js uses for its own
  // mood-based palette. The angle is part of the same override, so a
  // mood can flow at a different angle than the default gradient.
  function readGradientSettings() {
    const mood = localStorage.getItem('active-mood') || 'Focused';
    const moodEnabled = mood !== 'default' && localStorage.getItem(`gradient-mood-${mood}-enabled`) === 'true';

    const prefix = moodEnabled ? `gradient-mood-${mood}-` : 'gradient-';

    return {
      h1: parseFloat(localStorage.getItem(`${prefix}h1`) ?? '220'),
      s1: parseFloat(localStorage.getItem(`${prefix}s1`) ?? '70'),
      l1: parseFloat(localStorage.getItem(`${prefix}l1`) ?? '18'),
      h2: parseFloat(localStorage.getItem(`${prefix}h2`) ?? '280'),
      s2: parseFloat(localStorage.getItem(`${prefix}s2`) ?? '60'),
      l2: parseFloat(localStorage.getItem(`${prefix}l2`) ?? '8'),
      angle: parseFloat(localStorage.getItem(`${prefix}angle`) ?? '160'),
    };
  }

  // ── Smooth colour/angle interpolation ─────────────────────────────────────
  let currentGrad = null;   // last rendered {h1,s1,l1,h2,s2,l2,angle}
  let animFrameId  = null;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Hues are circular (0-360) — always take the shorter way around so a
  // transition from e.g. 350deg to 10deg goes forward through 360/0,
  // not backwards through 180.
  function lerpHue(a, b, t) {
    const diff = ((b - a + 540) % 360) - 180;
    return (a + diff * t + 360) % 360;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function paint(grad) {
    el.style.background = `linear-gradient(${grad.angle}deg, ${hslStr(grad.h1, grad.s1, grad.l1)}, ${hslStr(grad.h2, grad.s2, grad.l2)})`;
  }

  function stopAnimation() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // Tweens smoothly from whatever is currently painted to `target`.
  function animateTo(target, duration = 650) {
    stopAnimation();
    const start = currentGrad ?? target;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(t);
      paint({
        h1: lerpHue(start.h1, target.h1, eased),
        s1: lerp(start.s1, target.s1, eased),
        l1: lerp(start.l1, target.l1, eased),
        h2: lerpHue(start.h2, target.h2, eased),
        s2: lerp(start.s2, target.s2, eased),
        l2: lerp(start.l2, target.l2, eased),
        angle: lerp(start.angle, target.angle, eased),
      });

      if (t < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        currentGrad = target;
        animFrameId = null;
      }
    }
    animFrameId = requestAnimationFrame(step);
  }

  // Paints instantly, no easing — used for initial reveal and for live
  // slider tweaking on the Appearance page, where an eased delay would
  // feel laggy rather than direct.
  function applyGradientInstant() {
    const target = readGradientSettings();
    stopAnimation();
    paint(target);
    currentGrad = target;
  }

  // Eases into the new colours/angle — used when the active mood changes,
  // so a mood's gradient override fades in rather than jump-cutting.
  function applyGradientAnimated() {
    animateTo(readGradientSettings());
  }

  // ── Visibility control ────────────────────────────────────────────────────
  function syncVisibility() {
    const on = isActive();
    el.style.display = on ? 'block' : 'none';
    if (on) {
      applyGradientInstant();
      // Gradient mode has its own colours — make sure the screen tint
      // overlay (used by starfield/city) stays switched off.
      const tintEl = document.getElementById('screen-tint');
      if (tintEl) tintEl.style.opacity = '0';
    } else {
      stopAnimation();
    }
  }

  window.addEventListener('background-update',       syncVisibility);
  window.addEventListener('timer-background-update', syncVisibility);

  // In-window gradient colour/angle changes (from AppearancePage in same tab)
  window.addEventListener('gradient-update', () => {
    if (isActive()) applyGradientInstant();
  });

  // In-window mood changes (from CongruencePage in same tab) — smoothly
  // ease into any enabled per-mood gradient override (colours + angle).
  window.addEventListener('mood-change', () => {
    if (isActive()) applyGradientAnimated();
  });

  // Re-sync when window regains focus (cross-window, e.g. timer window)
  window.addEventListener('focus', syncVisibility);

  // Cross-tab/window sync via storage events.
  // Split into two cases so we can apply colours even if visibility hasn't changed.
  const MODE_KEYS   = new Set(['background-mode', 'timer-background']);
  const COLOUR_KEYS = new Set([
    'gradient-h1', 'gradient-s1', 'gradient-l1',
    'gradient-h2', 'gradient-s2', 'gradient-l2',
    'gradient-angle',
  ]);

  window.addEventListener('storage', (e) => {
    const k = e.key ?? '';
    if (MODE_KEYS.has(k)) {
      syncVisibility();
    } else if (k === 'active-mood') {
      // Mood changed in another window — smoothly ease into colours if a
      // per-mood override is enabled for the new mood.
      if (isActive()) applyGradientAnimated();
    } else if (COLOUR_KEYS.has(k) || k.startsWith('gradient-mood-')) {
      // Colour/angle (global or per-mood) changed; update the gradient if
      // we're currently visible AND re-run syncVisibility in case mode
      // also just became gradient
      syncVisibility();
    }
  });

  syncVisibility();

})();
