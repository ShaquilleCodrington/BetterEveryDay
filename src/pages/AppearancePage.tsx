import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ── Generic setting hook ──────────────────────────────────────────────────
function useSetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  useEffect(() => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent("starfield-update"));
  }, [key, value]);
  return [value, setValue] as const;
}

// ── Tint setting hook (fires starfield-update so tint updates live) ───────
function useTintSetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  const set = useCallback((v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new CustomEvent("starfield-update"));
  }, [key]);
  return [value, set] as const;
}

// ── Gradient setting hook (fires gradient-update so the gradient bg updates live) ─
function useGradientSetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  const set = useCallback((v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new CustomEvent("gradient-update"));
  }, [key]);
  return [value, set] as const;
}

// ── Mood config (must match stateCards in CongruencePage) ─────────────────
const MOODS = [
  { key: "Focused",  label: "Focused",  accent: "rgba(100,160,255,0.8)" },
  { key: "Planning", label: "Planning", accent: "rgba(255,180,60,0.8)"  },
  { key: "Recharge", label: "Recharge", accent: "rgba(60,220,160,0.8)" },
];

// ── Colour wheel (hue ring SVG) ───────────────────────────────────────────
function HueRing({ hue, onChange, size = 160 }: {
  hue: number;
  onChange: (h: number) => void;
  size?: number;
}) {
  const cx = size / 2;
  const outerR = size / 2;
  const innerR = outerR * 0.62;

  function handleInteraction(e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) {
    const svg = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - (svg.left + cx);
    const dy = clientY - (svg.top + cx);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < innerR * 0.8 || dist > outerR + 10) return;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    onChange(Math.round(angle) % 360);
  }

  // Draw 360 conic gradient segments as SVG arcs
  const segments = 60;
  const paths: string[] = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * 360;
    const a2 = ((i + 1) / segments) * 360;
    const toRad = (d: number) => (d - 90) * (Math.PI / 180);
    const x1o = cx + outerR * Math.cos(toRad(a1));
    const y1o = cx + outerR * Math.sin(toRad(a1));
    const x2o = cx + outerR * Math.cos(toRad(a2));
    const y2o = cx + outerR * Math.sin(toRad(a2));
    const x1i = cx + innerR * Math.cos(toRad(a1));
    const y1i = cx + innerR * Math.sin(toRad(a1));
    const x2i = cx + innerR * Math.cos(toRad(a2));
    const y2i = cx + innerR * Math.sin(toRad(a2));
    const h = (a1 + a2) / 2;
    paths.push(
      `<path d="M${x1o},${y1o} A${outerR},${outerR} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 0,0 ${x1i},${y1i} Z" fill="hsl(${h},90%,55%)" />`
    );
  }

  // Selector handle
  const selRad = (hue - 90) * (Math.PI / 180);
  const handleR = (outerR + innerR) / 2;
  const hx = cx + handleR * Math.cos(selRad);
  const hy = cx + handleR * Math.sin(selRad);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ cursor: "crosshair", userSelect: "none", touchAction: "none" }}
      onMouseDown={handleInteraction}
      onMouseMove={e => { if (e.buttons === 1) handleInteraction(e); }}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      dangerouslySetInnerHTML={{
        __html:
          paths.join("") +
          // inner mask circle (transparent hole)
          `<circle cx="${cx}" cy="${cx}" r="${innerR * 0.98}" fill="transparent" />` +
          // selector dot
          `<circle cx="${hx}" cy="${hy}" r="7" fill="hsl(${hue},90%,60%)" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 0 4px rgba(0,0,0,0.6))" />`,
      }}
    />
  );
}

// ── Per-mood tint section ─────────────────────────────────────────────────
function MoodTintRow({ moodKey, label, accent }: {
  moodKey: string;
  label: string;
  accent: string;
}) {
  const [enabled, setEnabled] = useTintSetting(`tint-${moodKey}-enabled`, "false");
  const [hue,     setHue]     = useTintSetting(`tint-${moodKey}-h`,       "200");
  const [strength, setStrength] = useTintSetting(`tint-${moodKey}-s`,     "0.5");

  const isOn = enabled === "true";

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${isOn ? accent : "rgba(255,255,255,0.08)"}`,
      transition: "border-color 0.3s",
      marginBottom: "10px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isOn ? "14px" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: accent, display: "inline-block",
          }} />
          <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>{label}</p>
        </div>
        <label style={{ cursor: "pointer", flexShrink: 0 }}>
          <input type="checkbox" checked={isOn} onChange={e => setEnabled(String(e.target.checked))} style={{ display: "none" }} />
          <span style={{
            display: "inline-flex", alignItems: "center",
            width: "40px", height: "22px", borderRadius: "11px",
            background: isOn ? "rgba(120,160,255,0.7)" : "rgba(255,255,255,0.12)",
            transition: "background 0.2s", position: "relative",
          }}>
            <span style={{
              position: "absolute", width: "18px", height: "18px", borderRadius: "50%",
              background: "#fff", transition: "transform 0.2s",
              transform: isOn ? "translateX(19px)" : "translateX(2px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </span>
        </label>
      </div>

      {isOn && (
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <HueRing hue={parseInt(hue)} onChange={h => setHue(String(h))} size={130} />
          <div style={{ flex: 1, minWidth: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strength</p>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(parseFloat(strength) * 100)}%</p>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={strength}
              onChange={e => setStrength(e.target.value)}
              style={{ width: "100%", accentColor: `hsl(${hue}, 80%, 55%)` }}
            />
            {/* Hue preview swatch */}
            <div style={{
              marginTop: "12px", height: "28px", borderRadius: "6px",
              background: `hsl(${hue}, 80%, 50%)`,
              opacity: Math.min(0.35, parseFloat(strength) * 0.35) * 3 + 0.15,
              border: "1px solid rgba(255,255,255,0.1)",
            }} />
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              Hue {hue}°
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Background mode hook ──────────────────────────────────────────────────
function useBackgroundMode() {
  const [mode, setMode] = useState(() => localStorage.getItem("background-mode") ?? "city");
  const set = useCallback((v: string) => {
    setMode(v);
    localStorage.setItem("background-mode", v);
    window.dispatchEvent(new CustomEvent("background-update"));
    window.dispatchEvent(new CustomEvent("starfield-update"));
  }, []);
  return [mode, set] as const;
}

// ── City setting hook (fires cityscape-update) ────────────────────────────
function useCitySetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  const set = useCallback((v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new CustomEvent("cityscape-update"));
  }, [key]);
  return [value, set] as const;
}

// ── Per-mood city tint section ────────────────────────────────────────────
// Fires cityscape-update so the canvas rebuilds with the new mood active
function useCityMoodTint(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  const set = useCallback((v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new CustomEvent("cityscape-update"));
  }, [key]);
  return [value, set] as const;
}

function CityMoodRow({ moodKey, label, accent }: {
  moodKey: string;
  label: string;
  accent: string;
}) {
  const [enabled, setEnabled] = useCityMoodTint(`city-tint-${moodKey}-enabled`, "false");
  const [hue,     setHue]     = useCityMoodTint(`city-tint-${moodKey}-h`,       "200");
  const [strength, setStrength] = useCityMoodTint(`city-tint-${moodKey}-s`,     "0.5");

  const isOn = enabled === "true";

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${isOn ? accent : "rgba(255,255,255,0.08)"}`,
      transition: "border-color 0.3s",
      marginBottom: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isOn ? "14px" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: accent, display: "inline-block",
          }} />
          <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>{label}</p>
        </div>
        <label style={{ cursor: "pointer", flexShrink: 0 }}>
          <input type="checkbox" checked={isOn} onChange={e => setEnabled(String(e.target.checked))} style={{ display: "none" }} />
          <span style={{
            display: "inline-flex", alignItems: "center",
            width: "40px", height: "22px", borderRadius: "11px",
            background: isOn ? "rgba(255,140,60,0.7)" : "rgba(255,255,255,0.12)",
            transition: "background 0.2s", position: "relative",
          }}>
            <span style={{
              position: "absolute", width: "18px", height: "18px", borderRadius: "50%",
              background: "#fff", transition: "transform 0.2s",
              transform: isOn ? "translateX(19px)" : "translateX(2px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </span>
        </label>
      </div>

      {isOn && (
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <HueRing hue={parseInt(hue)} onChange={h => setHue(String(h))} size={130} />
          <div style={{ flex: 1, minWidth: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strength</p>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(parseFloat(strength) * 100)}%</p>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={strength}
              onChange={e => setStrength(e.target.value)}
              style={{ width: "100%", accentColor: `hsl(${hue}, 80%, 55%)` }}
            />
            <div style={{
              marginTop: "12px", height: "28px", borderRadius: "6px",
              background: `hsl(${hue}, 80%, 50%)`,
              opacity: Math.min(0.35, parseFloat(strength) * 0.35) * 3 + 0.15,
              border: "1px solid rgba(255,255,255,0.1)",
            }} />
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              Hue {hue}°
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gradient colour stop row (hue ring + lightness slider) ───────────────
function GradientStopRow({ label, hue, lightness, saturation, onHue, onLightness }: {
  label: string;
  hue: number;
  lightness: number;
  saturation: number;
  onHue: (h: number) => void;
  onLightness: (l: number) => void;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </p>
      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <HueRing hue={hue} onChange={onHue} size={130} />
        <div style={{ flex: 1, minWidth: "120px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Lightness</p>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(lightness)}%</p>
          </div>
          <input
            type="range" min="0" max="100" step="1"
            value={lightness}
            onChange={e => onLightness(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: `hsl(${hue}, ${saturation}%, 55%)` }}
          />
          <div style={{
            marginTop: "12px", height: "28px", borderRadius: "6px",
            background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            border: "1px solid rgba(255,255,255,0.1)",
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Per-mood gradient colour section ──────────────────────────────────────
// Fires gradient-update so the gradient background picks up the change live
function useGradientMoodSetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? defaultValue);
  const set = useCallback((v: string) => {
    setValue(v);
    localStorage.setItem(key, v);
    window.dispatchEvent(new CustomEvent("gradient-update"));
  }, [key]);
  return [value, set] as const;
}

function GradientMoodRow({ moodKey, label, accent }: {
  moodKey: string;
  label: string;
  accent: string;
}) {
  const [enabled, setEnabled] = useGradientMoodSetting(`gradient-mood-${moodKey}-enabled`, "false");
  const [h1, setH1] = useGradientMoodSetting(`gradient-mood-${moodKey}-h1`, "220");
  const [s1] = useGradientMoodSetting(`gradient-mood-${moodKey}-s1`, "70");
  const [l1, setL1] = useGradientMoodSetting(`gradient-mood-${moodKey}-l1`, "18");
  const [h2, setH2] = useGradientMoodSetting(`gradient-mood-${moodKey}-h2`, "280");
  const [s2] = useGradientMoodSetting(`gradient-mood-${moodKey}-s2`, "60");
  const [l2, setL2] = useGradientMoodSetting(`gradient-mood-${moodKey}-l2`, "8");
  const [angle, setAngle] = useGradientMoodSetting(`gradient-mood-${moodKey}-angle`, "160");

  const isOn = enabled === "true";
  const gh1 = parseInt(h1), gs1 = parseFloat(s1), gl1 = parseFloat(l1);
  const gh2 = parseInt(h2), gs2 = parseFloat(s2), gl2 = parseFloat(l2);
  const gAngle = parseFloat(angle);

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${isOn ? accent : "rgba(255,255,255,0.08)"}`,
      transition: "border-color 0.3s",
      marginBottom: "10px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isOn ? "14px" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: accent, display: "inline-block",
          }} />
          <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>{label}</p>
        </div>
        <label style={{ cursor: "pointer", flexShrink: 0 }}>
          <input type="checkbox" checked={isOn} onChange={e => setEnabled(String(e.target.checked))} style={{ display: "none" }} />
          <span style={{
            display: "inline-flex", alignItems: "center",
            width: "40px", height: "22px", borderRadius: "11px",
            background: isOn ? "rgba(170,120,255,0.7)" : "rgba(255,255,255,0.12)",
            transition: "background 0.2s", position: "relative",
          }}>
            <span style={{
              position: "absolute", width: "18px", height: "18px", borderRadius: "50%",
              background: "#fff", transition: "transform 0.2s",
              transform: isOn ? "translateX(19px)" : "translateX(2px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </span>
        </label>
      </div>

      {isOn && (
        <>
          <GradientStopRow
            label="Colour 1"
            hue={gh1} lightness={gl1} saturation={gs1}
            onHue={h => setH1(String(h))}
            onLightness={l => setL1(String(l))}
          />
          <GradientStopRow
            label="Colour 2"
            hue={gh2} lightness={gl2} saturation={gs2}
            onHue={h => setH2(String(h))}
            onLightness={l => setL2(String(l))}
          />

          {/* Angle override */}
          <p style={{ margin: "0 0 6px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Angle
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(gAngle)}°</p>
          </div>
          <input
            type="range" min="0" max="360" step="1"
            value={angle}
            onChange={e => setAngle(e.target.value)}
            style={{ width: "100%", accentColor: "rgba(170,120,255,0.9)", marginBottom: "12px" }}
          />

          {/* Preview */}
          <div style={{
            height: "28px", borderRadius: "6px",
            background: `linear-gradient(${gAngle}deg, hsl(${gh1}, ${gs1}%, ${gl1}%), hsl(${gh2}, ${gs2}%, ${gl2}%))`,
            border: "1px solid rgba(255,255,255,0.1)",
          }} />
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AppearancePage() {
  const navigate = useNavigate();

  // Background mode
  const [bgMode, setBgMode] = useBackgroundMode();

  // Starfield settings
  const [scroll,      setScroll]      = useSetting("star-scroll",       "false");
  const [mouseLook,   setMouseLook]   = useSetting("star-mouselook",    "true");
  const [scrollSpeed, setScrollSpeed] = useSetting("star-scroll-speed", "40");

  // Default tint settings
  const [defaultHue,      setDefaultHue]      = useTintSetting("tint-default-h", "220");
  const [defaultStrength, setDefaultStrength] = useTintSetting("tint-default-s", "0");

  // City settings
  const [cityScrollSpeed, setCityScrollSpeed] = useCitySetting("city-scroll-speed", "40");
  const [cityTintHue,     setCityTintHue]     = useCitySetting("city-tint-h", "30");
  const [cityTintStr,     setCityTintStr]     = useCitySetting("city-tint-s", "0");

  // Gradient settings
  const [gradH1,    setGradH1]    = useGradientSetting("gradient-h1", "220");
  const [gradS1]    = useGradientSetting("gradient-s1", "70");
  const [gradL1,    setGradL1]    = useGradientSetting("gradient-l1", "18");
  const [gradH2,    setGradH2]    = useGradientSetting("gradient-h2", "280");
  const [gradS2]    = useGradientSetting("gradient-s2", "60");
  const [gradL2,    setGradL2]    = useGradientSetting("gradient-l2", "8");
  const [gradAngle, setGradAngle] = useGradientSetting("gradient-angle", "160");

  const scrollOn    = scroll === "true";
  const mouseLookOn = mouseLook === "true";
  const dHue = parseInt(defaultHue);
  const dStr = parseFloat(defaultStrength);
  const cHue = parseInt(cityTintHue);
  const cStr = parseFloat(cityTintStr);
  const gH1 = parseInt(gradH1);
  const gS1 = parseFloat(gradS1);
  const gL1 = parseFloat(gradL1);
  const gH2 = parseInt(gradH2);
  const gS2 = parseFloat(gradS2);
  const gL2 = parseFloat(gradL2);
  const gAngle = parseFloat(gradAngle);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate("/settings")}
        style={{
          background: "transparent", border: "none",
          color: "rgba(160,190,255,0.7)", fontSize: "13px",
          cursor: "pointer", padding: "0 0 18px 0",
          display: "flex", alignItems: "center", gap: "6px", boxShadow: "none",
        }}
      >
        ‹ Back to Settings
      </button>

      <h1>Appearance</h1>

      {/* ── Background Mode panel ───────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: "20px", marginTop: "20px", maxWidth: "500px" }}>
        <h2>Background</h2>
        <hr />
        <p style={{ margin: "0 0 14px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          Choose the animated background for the app.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Starfield option */}
          <label style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
            background: bgMode === "starfield" ? "rgba(120,160,255,0.10)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${bgMode === "starfield" ? "rgba(120,160,255,0.45)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 0.25s",
          }}>
            <input
              type="radio" name="bgMode" value="starfield"
              checked={bgMode === "starfield"}
              onChange={() => setBgMode("starfield")}
              style={{ display: "none" }}
            />
            {/* Starfield mini preview */}
            <div style={{
              width: "52px", height: "34px", borderRadius: "6px", flexShrink: 0,
              background: "linear-gradient(160deg, #07041a 0%, #120830 60%, #1a0d35 100%)",
              border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden", position: "relative",
            }}>
              {[...Array(14)].map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  width: i % 4 === 0 ? "2px" : "1px", height: i % 4 === 0 ? "2px" : "1px",
                  borderRadius: "50%", background: "rgba(255,255,255,0.85)",
                  left: `${(i * 29 + 7) % 90}%`, top: `${(i * 37 + 11) % 80}%`,
                }} />
              ))}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(220,235,255,0.9)", fontWeight: 500 }}>Starfield</p>
            </div>
            {bgMode === "starfield" && (
              <div style={{
                marginLeft: "auto", width: "7px", height: "7px", borderRadius: "50%",
                background: "rgba(120,160,255,0.9)", boxShadow: "0 0 6px rgba(120,160,255,0.7)",
              }} />
            )}
          </label>

          {/* City Scrolling option */}
          <label style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
            background: bgMode === "city" ? "rgba(255,140,60,0.10)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${bgMode === "city" ? "rgba(255,140,60,0.45)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 0.25s",
          }}>
            <input
              type="radio" name="bgMode" value="city"
              checked={bgMode === "city"}
              onChange={() => setBgMode("city")}
              style={{ display: "none" }}
            />
            {/* City mini preview */}
            <div style={{
              width: "52px", height: "34px", borderRadius: "6px", flexShrink: 0,
              background: "linear-gradient(180deg, #0d0820 0%, #3d1a5c 55%, #c4562a 85%, #f0a855 100%)",
              border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden", position: "relative",
            }}>
              {/* Silhouette buildings */}
              {[
                { left:"4%",  width:"14%", height:"50%", bottom:0 },
                { left:"18%", width:"10%", height:"38%", bottom:0 },
                { left:"28%", width:"18%", height:"60%", bottom:0 },
                { left:"46%", width:"12%", height:"42%", bottom:0 },
                { left:"58%", width:"16%", height:"55%", bottom:0 },
                { left:"74%", width:"10%", height:"35%", bottom:0 },
                { left:"84%", width:"14%", height:"48%", bottom:0 },
              ].map((b, i) => (
                <div key={i} style={{
                  position: "absolute", background: "rgba(8,5,18,0.95)",
                  ...b, bottom: 0,
                }} />
              ))}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(220,235,255,0.9)", fontWeight: 500 }}>City Scrolling</p>
            </div>
            {bgMode === "city" && (
              <div style={{
                marginLeft: "auto", width: "7px", height: "7px", borderRadius: "50%",
                background: "rgba(255,140,60,0.9)", boxShadow: "0 0 6px rgba(255,140,60,0.7)",
              }} />
            )}
          </label>

          {/* Gradient option */}
          <label style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
            background: bgMode === "gradient" ? "rgba(170,120,255,0.10)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${bgMode === "gradient" ? "rgba(170,120,255,0.45)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 0.25s",
          }}>
            <input
              type="radio" name="bgMode" value="gradient"
              checked={bgMode === "gradient"}
              onChange={() => setBgMode("gradient")}
              style={{ display: "none" }}
            />
            {/* Gradient mini preview */}
            <div style={{
              width: "52px", height: "34px", borderRadius: "6px", flexShrink: 0,
              background: `linear-gradient(${gAngle}deg, hsl(${gH1}, ${gS1}%, ${gL1}%), hsl(${gH2}, ${gS2}%, ${gL2}%))`,
              border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden", position: "relative",
            }} />
            <div>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(220,235,255,0.9)", fontWeight: 500 }}>Gradient</p>
            </div>
            {bgMode === "gradient" && (
              <div style={{
                marginLeft: "auto", width: "7px", height: "7px", borderRadius: "50%",
                background: "rgba(170,120,255,0.9)", boxShadow: "0 0 6px rgba(170,120,255,0.7)",
              }} />
            )}
          </label>
        </div>
      </div>

      {/* ── Starfield panel — only shown in Starfield mode ───────────── */}
      <div className="glass-panel" style={{ padding: "20px", marginTop: "16px", maxWidth: "500px", display: bgMode === "starfield" ? undefined : "none" }}>
        <h2>Starfield</h2>
        <hr />

        <ToggleRow
          label="Mouse Look"
          description="Stars shift with your cursor position"
          checked={mouseLookOn}
          onChange={v => setMouseLook(String(v))}
        />
        <div style={{ height: "14px" }} />
        <ToggleRow
          label="Auto-Scroll"
          description="Stars slowly drift across the background"
          checked={scrollOn}
          onChange={v => setScroll(String(v))}
        />

        {scrollOn && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Scroll Speed
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>
                {parseFloat(scrollSpeed) > 0
                  ? `→ ${parseFloat(scrollSpeed).toFixed(0)} px/s`
                  : parseFloat(scrollSpeed) < 0
                    ? `← ${Math.abs(parseFloat(scrollSpeed)).toFixed(0)} px/s`
                    : "0 px/s"}
              </p>
            </div>
            <input
              type="range" min="-120" max="120" step="1"
              value={scrollSpeed}
              onChange={e => setScrollSpeed(e.target.value)}
              style={{ width: "100%", accentColor: "rgba(120,160,255,0.9)" }}
            />
          </div>
        )}
      </div>

      {/* ── Screen Color panel ───────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: "20px", marginTop: "16px", maxWidth: "500px", display: bgMode === "starfield" ? undefined : "none" }}>
        <h2>Screen Color</h2>
        <hr />
        <p style={{ margin: "0 0 16px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          Overlay a colour tint on the screen. Set a global default, or customize per mood.
        </p>

        {/* Default tint */}
        <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Default
        </p>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", marginBottom: "24px" }}>
          <HueRing hue={dHue} onChange={h => setDefaultHue(String(h))} size={140} />
          <div style={{ flex: 1, minWidth: "130px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strength</p>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(dStr * 100)}%</p>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={defaultStrength}
              onChange={e => setDefaultStrength(e.target.value)}
              style={{ width: "100%", accentColor: `hsl(${dHue}, 80%, 55%)` }}
            />
            <div style={{
              marginTop: "12px", height: "28px", borderRadius: "6px",
              background: `hsl(${dHue}, 80%, 50%)`,
              opacity: Math.min(0.35, dStr * 0.35) * 3 + 0.15,
              border: "1px solid rgba(255,255,255,0.1)",
            }} />
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              {dStr === 0 ? "Off" : `Hue ${dHue}°`}
            </p>
          </div>
        </div>

        {/* Per-mood tints */}
        <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Per Mood Override
        </p>
        {MOODS.map(m => (
          <MoodTintRow key={m.key} moodKey={m.key} label={m.label} accent={m.accent} />
        ))}
      </div>

      {/* ── City Scrolling settings panel ────────────────────────────── */}
      <div className="glass-panel" style={{ padding: "20px", marginTop: "16px", maxWidth: "500px", display: bgMode === "city" ? undefined : "none" }}>
        <h2>City Scrolling</h2>
        <hr />

        {/* Scroll speed */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Scroll Speed
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>
              {parseFloat(cityScrollSpeed) > 0
                ? `→ ${parseFloat(cityScrollSpeed).toFixed(0)} px/s`
                : parseFloat(cityScrollSpeed) < 0
                  ? `← ${Math.abs(parseFloat(cityScrollSpeed)).toFixed(0)} px/s`
                  : "0 px/s"}
            </p>
          </div>
          <input
            type="range" min="-120" max="120" step="1"
            value={cityScrollSpeed}
            onChange={e => setCityScrollSpeed(e.target.value)}
            style={{ width: "100%", accentColor: "rgba(255,140,60,0.9)" }}
          />
        </div>

        {/* City mood color overrides */}
        <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Mood Color Overrides
        </p>
        <p style={{ margin: "0 0 12px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          Override the city palette when a mood is active.
        </p>
        {MOODS.map(m => (
          <CityMoodRow key={m.key} moodKey={m.key} label={m.label} accent={m.accent} />
        ))}

        {/* City screen tint */}
        <p style={{ margin: "16px 0 12px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Screen Color
        </p>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <HueRing hue={cHue} onChange={h => setCityTintHue(String(h))} size={140} />
          <div style={{ flex: 1, minWidth: "130px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Strength</p>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(cStr * 100)}%</p>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={cityTintStr}
              onChange={e => setCityTintStr(e.target.value)}
              style={{ width: "100%", accentColor: `hsl(${cHue}, 80%, 55%)` }}
            />
            <div style={{
              marginTop: "12px", height: "28px", borderRadius: "6px",
              background: `hsl(${cHue}, 80%, 50%)`,
              opacity: Math.min(0.35, cStr * 0.35) * 3 + 0.15,
              border: "1px solid rgba(255,255,255,0.1)",
            }} />
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              {cStr === 0 ? "Off" : `Hue ${cHue}°`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Gradient settings panel — only shown in Gradient mode ───────── */}
      <div className="glass-panel" style={{ padding: "20px", marginTop: "16px", maxWidth: "500px", display: bgMode === "gradient" ? undefined : "none" }}>
        <h2>Gradient</h2>
        <hr />
        <p style={{ margin: "0 0 16px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          A simple two-colour gradient background. Pick the colours and the angle it flows at.
        </p>

        <GradientStopRow
          label="Colour 1"
          hue={gH1} lightness={gL1} saturation={gS1}
          onHue={h => setGradH1(String(h))}
          onLightness={l => setGradL1(String(l))}
        />
        <GradientStopRow
          label="Colour 2"
          hue={gH2} lightness={gL2} saturation={gS2}
          onHue={h => setGradH2(String(h))}
          onLightness={l => setGradL2(String(l))}
        />

        {/* Angle */}
        <p style={{ margin: "0 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Angle
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(180,205,255,0.6)" }} />
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(200,220,255,0.8)" }}>{Math.round(gAngle)}°</p>
        </div>
        <input
          type="range" min="0" max="360" step="1"
          value={gradAngle}
          onChange={e => setGradAngle(e.target.value)}
          style={{ width: "100%", accentColor: "rgba(170,120,255,0.9)" }}
        />

        {/* Preview */}
        <div style={{
          marginTop: "16px", height: "60px", borderRadius: "8px",
          background: `linear-gradient(${gAngle}deg, hsl(${gH1}, ${gS1}%, ${gL1}%), hsl(${gH2}, ${gS2}%, ${gL2}%))`,
          border: "1px solid rgba(255,255,255,0.1)",
        }} />

        {/* Gradient mood color overrides */}
        <p style={{ margin: "20px 0 10px", fontSize: "11px", color: "rgba(180,205,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Mood Color Overrides
        </p>
        <p style={{ margin: "0 0 12px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          Override the gradient colours when a mood is active.
        </p>
        {MOODS.map(m => (
          <GradientMoodRow key={m.key} moodKey={m.key} label={m.label} accent={m.accent} />
        ))}
      </div>
    </div>
  );
}

// ── Reusable toggle row ───────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <p style={{ margin: 0, color: "rgba(220,235,255,0.9)", fontSize: "13px" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{description}</p>
      </div>
      <label style={{ cursor: "pointer", flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: "none" }} />
        <span style={{
          display: "inline-flex", alignItems: "center",
          width: "44px", height: "24px", borderRadius: "12px",
          background: checked ? "rgba(120,160,255,0.7)" : "rgba(255,255,255,0.12)",
          transition: "background 0.2s", position: "relative",
        }}>
          <span style={{
            position: "absolute", width: "20px", height: "20px", borderRadius: "50%",
            background: "#fff", transition: "transform 0.2s",
            transform: checked ? "translateX(20px)" : "translateX(2px)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }} />
        </span>
      </label>
    </div>
  );
}
