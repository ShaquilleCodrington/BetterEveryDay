import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProfile } from "../Data/profileStorage";
import ContextHelpButton from "./ContextHelpButton";
import Tooltip from "./Tooltip";
import { sync } from "../Services/Snapshot/syncManager";
import type { User } from "firebase/auth";
// ── Default person icon shown when no profile photo has been set ─────────
function DefaultAvatarIcon() {
  return (
    <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="rgba(200,220,255,0.6)" strokeWidth="1.6" />
      <path
        d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"
        stroke="rgba(200,220,255,0.6)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Profile button: circular avatar (photo or default icon), links to /profile ─
function ProfileButton() {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      getProfile().then((profile) => {
        if (!cancelled) setPhoto(profile.photo);
      });
    }

    refresh();
    window.addEventListener("profile-update", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-update", refresh);
    };
  }, []);

  return (
    <Tooltip text="Profile">
      <Link to="/profile" aria-label="Profile">
        <button
          className="toolbar-profile-btn"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <DefaultAvatarIcon />
          )}
        </button>
      </Link>
    </Tooltip>
  );
}
// CHANGED: reverted — Toolbar no longer needs collapsed/onToggleSidebar props
export default function Toolbar({
     currentUser, onLogin, onLogout,  
    }: {
   currentUser: User | null;
   onLogin: () => void;
   onLogout: () => Promise<void>;
      })
    {

  const navigate = useNavigate();
  
  // Run Continuity synchronization and reconciliation.
async function handleSync() {
  if (!currentUser) {
    return;
  }

  try {
    const resolvedSnapshot = await sync(currentUser.uid);

    if (!resolvedSnapshot) {
      return;
    }

    window.dispatchEvent(
      new Event("continuity-sync-complete")
    );
  }
  catch (error) {
    console.error(
      "Continuity sync failed:",
      error
    );
  }
}

   async function handleLogout() {
    await onLogout();
  }

  return (
    <div className="toolbar">

      
      {/* Profile button */}
      <ProfileButton />

      {/* back button */}
      <Tooltip text="Go back to the previous page">
        <button onClick={() => navigate(-1)}>Back</button>
      </Tooltip>

      {/* Dashboard Button */}
      <Tooltip text="Jump to your dashboard">
        <Link to="/">
          <button>Dashboard</button>
        </Link>
      </Tooltip>

      {/* Timer button — now sits next to Dashboard */}
      <Tooltip text="Open the floating countdown timer">
        <button onClick={() => window.electron.openTimer()}>
          Timer
        </button>
      </Tooltip>

       {/* Logout remains persistent beside the Help control. */}
     
      <div
  style={{
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  {currentUser && (
    <Tooltip text="Synchronize your data across devices">
  <button type="button" onClick={handleSync}>
    Sync
  </button>
</Tooltip>
  )}

  {currentUser ? (
    <button type="button" onClick={handleLogout}>
      Logout
    </button>
  ) : (
    <button type="button" onClick={onLogin}>
      Login
    </button>
  )}
</div>

      {/* Help stays pinned to the right edge on its own */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
        <ContextHelpButton />
      </div>
    </div>

  );
}