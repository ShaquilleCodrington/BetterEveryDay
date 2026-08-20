import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PROFILE, getProfile, saveProfile } from "../Data/profileStorage";
import type { ProfileData } from "../Data/profileStorage";
import { loadTasks } from "../Data/taskStorage";
import { useNavigate } from "react-router-dom";
import { useAuthConnector } from "../Services/firebase/connector";
import { useOutletContext } from "react-router-dom";
import { logout } from "../Services/firebase/auth";
// ── Default avatar icon shown when no photo has been set ──────────────────
function DefaultAvatarIcon() {
  return (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="rgba(200,220,255,0.45)" strokeWidth="1.6" />
      <path
        d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"
        stroke="rgba(200,220,255,0.45)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Avatar (photo or default icon), with edit-mode change/remove controls ─
function Avatar({
  photo,
  editing,
  onChangePhoto,
  onRemovePhoto,
}: {
  photo: string;
  editing: boolean;
  onChangePhoto: (dataUrl: string) => void;
  onRemovePhoto: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChangePhoto(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column",
       alignItems: "center", gap: "14px" }}>
      <div
        style={{
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border-panel)",
          boxShadow: "0 0 0 5px rgba(120,160,255,0.08), var(--shadow-panel)",
          flexShrink: 0,
        }}
      >
        {photo ? (
          <img src={photo} alt="Profile" style={{ width: "100%", 
              height: "100%", objectFit: "cover" }} />
        ) : (
          <DefaultAvatarIcon />
        )}
      </div>

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", 
          gap: "8px", width: "100%" }}>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            style={{ display: "none" }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            ✎ Change Photo
          </button>
          {photo && (
            <button type="button" onClick={onRemovePhoto}>
              Remove Photo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable chip list for secondary titles ────────────────────────────────
function TitleChips({
  titles,
  editing,
  onAdd,
  onRemove,
}: {
  titles: string[];
  editing: boolean;
  onAdd: (title: string) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", 
          gap: "8px" }}>
        {titles.map((title, i) => (
          <span
            key={`${title}-${i}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              fontSize: "11px",
              letterSpacing: "0.04em",
              color: "rgba(210,228,255,0.85)",
              background: "rgba(120,160,255,0.14)",
              border: "1px solid rgba(160,190,255,0.30)",
              borderRadius: "20px",
            }}
          >
            {title}
            {editing && (
              <span
                onClick={() => onRemove(i)}
                style={{ cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1 }}
              >
                ✕
              </span>
            )}
          </span>
        ))}
        {!editing && titles.length === 0 && (
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>No additional titles</span>
        )}
      </div>

      {editing && (
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <input
            placeholder="Add a title, badge, or role…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button type="button" onClick={submit} style={{ flexShrink: 0 }}>
            + Add
          </button>
        </div>
      )}
    </div>
  );
}

// ── Task preference statistics ─────────────────────────────────────────────
// Reads task "mood" values (Focused / Planning / Recharge / etc., set on
// each task via CreateTaskPopup) and shows which state the user tends to
// work in most, as a simple set of bars — same accent colours as the
// Congruence page's mood cards, so it reads as "the same thing" elsewhere.
const MOOD_COLORS: Record<string, string> = {
  Focused:  "rgba(100, 160, 255, 0.75)",
  Planning: "rgba(255, 180, 60, 0.75)",
  Recharge: "rgba(60, 220, 160, 0.75)",
};
const DEFAULT_MOOD_COLOR = "rgba(200, 210, 230, 0.5)";
const MOOD_ORDER = ["Focused", "Planning", "Recharge"];

function TaskPreferences() {
  const counts = useMemo(() => {
    const tasks = loadTasks();
    const tally = new Map<string, number>();

    for (const task of tasks) {
      const mood = task.mood || "Unspecified";
      tally.set(mood, (tally.get(mood) ?? 0) + 1);
    }

    // Canonical moods first (even at zero), then anything unexpected.
    const moods = [
      ...MOOD_ORDER,
      ...[...tally.keys()].filter((m) => !MOOD_ORDER.includes(m)),
    ];

    const total = tasks.length;
    const rows = moods
      .map((mood) => ({ mood, count: tally.get(mood) ?? 0 }))
      .filter((row) => total === 0 || row.count > 0 || MOOD_ORDER.includes(row.mood));

    const topCount = Math.max(0, ...rows.map((r) => r.count));
    const preferred = topCount > 0 ? rows.find((r) => r.count === topCount)?.mood : null;

    return { rows, total, preferred };
  }, []);

  return (
    <div className="glass-panel" style={{ padding: "28px", marginTop: "24px", maxWidth: "700px" }}>
      <h2 style={{ marginBottom: "4px" }}>Task Preferences</h2>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>
        {counts.total === 0
          ? "Create a few tasks to see which state you gravitate toward."
          : counts.preferred
          ? `You spend the most time in ${counts.preferred} mode.`
          : "How your tasks are split across each state."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {counts.rows.map(({ mood, count }) => {
          const pct = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0;
          const color = MOOD_COLORS[mood] ?? DEFAULT_MOOD_COLOR;
          const isPreferred = mood === counts.preferred;

          return (
            <div key={mood}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: isPreferred ? 700 : 500,
                    color: isPreferred ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {mood}
                  {isPreferred && (
                    <span style={{ marginLeft: "8px", fontSize: "10px", color, letterSpacing: "0.04em" }}>
                      ★ MOST PICKED
                    </span>
                  )}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                  {count} task{count === 1 ? "" : "s"} · {pct}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: "6px",
                    background: color,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { onLogin } = useOutletContext<{ onLogin: () => void }>();
  const currentUser = useAuthConnector();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(DEFAULT_PROFILE);

  useEffect(() => {
    let cancelled = false;
    getProfile().then((loaded) => {
      if (cancelled) return;
      setProfile(loaded);
      setDraft(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

   useEffect(() => {
  if (!currentUser) {
    setEditing(false);
  }
}, [currentUser]);


  function startEditing() {
    setDraft(profile);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(profile);
    setEditing(false);
  }

  async function handleSave() {
    await saveProfile(draft);
    setProfile(draft);
    setEditing(false);
  }

  // CHANGED TODAY: Logging out while editing saves the current draft first.
  // This prevents Profile changes from being lost when Logout is selected.
  async function handleLogout() {
    if (editing) {
      await saveProfile(draft);
      setProfile(draft);
      setEditing(false);
    }

    await logout();
  }

  const active = editing ? draft : profile;

 
  if (loading) {
     return (
      <div>
        <div className="task-list-header">
          <h1>Profile</h1>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "28px",
            marginTop: "24px",
            maxWidth: "700px",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.4)" }}>
            Loading profile…
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* CHANGED TODAY: Profile header is now authentication-aware.
          Guest users only see Login.
          Authenticated users see Edit Profile and Logout.
          While editing, Logout remains available and saves the draft first. */}
      <div className="task-list-header">
        <h1>Profile</h1>

        {!currentUser ? (
          <button
            type="button"
            onClick={onLogin}
          >
            Login
          </button>
        ) : editing ? (
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              className="btn-primary"
              onClick={handleSave}
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={cancelEditing}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={startEditing}
            >
              ✎ Edit Profile
            </button>

            <button
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <div
        className="glass-panel"
        style={{
          padding: "28px",
          marginTop: "24px",
          maxWidth: "700px",
          display: "flex",
          gap: "32px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <Avatar
          photo={active.photo}
          editing={editing}
          onChangePhoto={(dataUrl) =>
            setDraft((d) => ({
              ...d,
              photo: dataUrl,
            }))
          }
          onRemovePhoto={() =>
            setDraft((d) => ({
              ...d,
              photo: "",
            }))
          }
        />

        <div
          style={{
            flex: 1,
            minWidth: "260px",
          }}
        >
          {/* Name */}
          {editing ? (
            <div
              className="form-field"
              style={{ marginBottom: "12px" }}
            >
              <label>Name</label>

              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    name: e.target.value,
                  }))
                }
                placeholder="Your name"
                style={{ fontSize: "18px" }}
              />
            </div>
          ) : (
            <h1 style={{ marginBottom: "4px" }}>
              {profile.name || (
                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  Unnamed
                </span>
              )}
            </h1>
          )}

          {/* Primary title */}
          {editing ? (
            <div
              className="form-field"
              style={{ marginBottom: "4px" }}
            >
              <label>Title</label>

              <input
                value={draft.primaryTitle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    primaryTitle: e.target.value,
                  }))
                }
                placeholder="e.g. Team Lead"
              />
            </div>
          ) : (
            profile.primaryTitle && (
              <p
                style={{
                  color: "rgba(160,190,255,0.85)",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  marginBottom: "6px",
                }}
              >
                {profile.primaryTitle}
              </p>
            )
          )}

          {/* Secondary titles */}
          <TitleChips
            titles={active.titles}
            editing={editing}
            onAdd={(title) =>
              setDraft((d) => ({
                ...d,
                titles: [...d.titles, title],
              }))
            }
            onRemove={(i) =>
              setDraft((d) => ({
                ...d,
                titles: d.titles.filter(
                  (_, idx) => idx !== i,
                ),
              }))
            }
          />

          <hr style={{ margin: "18px 0" }} />

          {/* Bio */}
          <label
            style={{
              display: "block",
              marginBottom: "6px",
            }}
          >
            Bio
          </label>

          {editing ? (
            <textarea
              rows={5}
              value={draft.bio}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  bio: e.target.value,
                }))
              }
              placeholder="Write a little about yourself…"
            />
          ) : (
            <p
              style={{
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.65)",
                fontStyle: profile.bio
                  ? "italic"
                  : "normal",
              }}
            >
              {profile.bio ? (
                `"${profile.bio}"`
              ) : (
                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontStyle: "normal",
                  }}
                >
                  No bio yet.
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <TaskPreferences />
    </div>
  );
}