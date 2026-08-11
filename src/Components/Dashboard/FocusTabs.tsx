import { useNavigate, useLocation } from "react-router-dom";


interface FocusTab
{
    id: string;
    label: string;
    path: string;
}


// Only tabs for features that actually exist right now.
// No Calendar, no Habits — those features don't exist yet.
const FOCUS_TABS: FocusTab[] =
[
    { id: "home", label: "Dashboard", path: "/" },
    { id: "task", label: "Task List", path: "/task" },
    { id: "congruence", label: "Congruence", path: "/congruence" },
    { id: "notes", label: "Notes", path: "/notebook" },
    { id: "journey", label: "Journey", path: "/journeyPreview" },
];


export default function FocusTabs()
{
    const navigate =
        useNavigate();

    const location =
        useLocation();

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap", 
                gap: "8px",
                rowGap: "8px",
                marginBottom: "20px",
            }}
        >
            {FOCUS_TABS.map((tab) =>
            {
                const isActive =
                    location.pathname === tab.path;

                return (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        style={{
                             padding: "clamp(10px, 1.6vw, 18px) clamp(16px, 4vw, 40px)",
                            fontSize: "clamp(0.85rem, 1.6vw, 1.1rem)",
                            flexShrink: 0,          
                            whiteSpace: "nowrap",
                            borderRadius: "8px 8px 0 0",
                            cursor: "pointer",
                            fontWeight: isActive ? "bold" : "normal",
                            backgroundColor: isActive
                                ? "rgba(20,12,55,0.38)"
                                : "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                             borderBottom: isActive
                                ? "1px solid transparent"
                                : "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}