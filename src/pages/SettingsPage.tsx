import { useNavigate } from "react-router-dom";

const settingsCategories = [
  {
    title: "General",
    description: "Deletion confirmations and other general preferences",
    path: "/settings/general",
    icon: "⚙️",
  },
  {
    title: "Appearance",
    description: "Starfield, themes and display options",
    path: "/settings/appearance",
    icon: "✦",
  },
  {
    title: "Notifications",
    description: "Notification preferences",
    path: "/settings/notifications",
    icon: "🔔",
  },
  {
    title: "Deleted",
    description: "Restore deleted items and daily snapshots",
    path: "/settings/deleted",
    icon: "🗑️",
  },
  {
    title: "Profile Settings",
    description: "Name, titles, photo and bio",
    path: "/profile",
    icon: "👤",
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Settings</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px", maxWidth: "500px" }}>
        {settingsCategories.map((cat) => (
          <div
            key={cat.title}
            className="glass-panel"
            onClick={() => cat.path && navigate(cat.path)}
            style={{
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: cat.path ? "pointer" : "default",
              opacity: cat.path ? 1 : 0.5,
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "18px" }}>{cat.icon}</span>
              <div>
                <p style={{ margin: 0, color: "rgba(220,235,255,0.95)", fontSize: "13px", fontWeight: 600 }}>
                  {cat.title}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {cat.description}
                </p>
              </div>
            </div>
            {cat.path && (
              <span style={{ color: "rgba(160,190,255,0.5)", fontSize: "16px" }}>›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
