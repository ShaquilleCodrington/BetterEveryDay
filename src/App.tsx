// ======================================================
// App.tsx
// ------------------------------------------------------
// Application root and authentication gate.
//
// Authentication has two responsibilities here:
//
// 1. AuthGate
//    Decides whether the user should see:
//      - Loading
//      - Login
//      - Main application
//
// 2. useAuthConnector
//    Keeps Firebase Auth identity synchronized with:
//      Profile.uid
//
// Firebase identity:
//      authenticated user -> Profile.uid = Firebase UID
//      guest              -> Profile.uid = null
//
// The authentication gate does NOT handle:
//      - Firestore
//      - data migration
//      - ownership
//      - synchronization
//      - snapshots
//
// Those are future systems.
//
// ======================================================

import { useEffect, useState } from "react";
import LoginScreen from "./Services/firebase/login";
import { subscribeToAuthState } from "./Services/firebase/auth";
import { useAuthConnector, continueAsGuest } from "./Services/firebase/connector";

import { Routes, Route, Outlet } from "react-router-dom";
import FocusPage from "./pages/FocusPage";
import DashboardPage from "./pages/DashboardPage";
import TaskListPage from "./pages/TaskListPage";
import Sidebar from "./Components/Sidebar";
import CongruencePage from "./pages/CongruencePage";
import Toolbar from "./Components/Toolbar";
import PlanningPage from "./pages/PlanningPage";
import RechargePage from "./pages/RechargePage";
import SettingsPage from "./pages/SettingsPage";
import AppearancePage from "./pages/AppearancePage";
import NotificationsPage from "./pages/NotificationsPage";
import GeneralSettingsPage from "./pages/GeneralSettingsPage";
import TimerPage from "./pages/TimerPage";
import NotesPage from "./pages/NotesPage";
import JourneyPage from "./pages/JourneyPage";
import ProfilePage from "./pages/ProfilePage";
import HelpPage from "./pages/HelpPage";
import JourneyPreview from "./Features/journey/Utils/JourneyPreview";
import "./Css/App.css";

type AuthStatus = | "loading" |"login" | "guest" | "authenticated";

function AuthGate() {
  const [authStatus, setAuthStatus] =
    useState<AuthStatus>("loading");

    // Keeps Profile.uid synchronized with Firebase Auth.
  useAuthConnector();

  
  // Determines whether the application should show
  // authentication or the main application.
   useEffect(() => {
    return subscribeToAuthState((user) => {
      if (user) {
        setAuthStatus("authenticated");
      } else {
        setAuthStatus("login");
      }
    });
  }, []);

  // Firebase has not finished checking for an existing session.
  if (authStatus === "loading") {
    return <div>Loading...</div>;
  }

  // Firebase says there is no authenticated user.
  // The user can either authenticate or explicitly continue as a guest.
   if (authStatus === "login") {
    return (
      <LoginScreen
        onGuest={async () => {

          // Explicit guest path.
          //
          // This does NOT create a Firebase user.
          // It simply ensures Profile.uid remains null.
          await continueAsGuest();

          // Now BetterEveryDay knows that the user has
          // intentionally chosen to enter as a guest.
          setAuthStatus("guest");
        }}
      />
    );
  }

   // Either Firebase authenticated the user or the user
  // explicitly chose to continue as a guest.
  return <MainApplication onLogin={() => setAuthStatus("login")}/>;
}

// This contains the existing BetterEveryDay routes.
//
// The routes were moved out of App() so that AuthGate can
// control whether these routes are rendered.
function MainApplication({ onLogin }: { onLogin: () => void }) {
  return (
    <Routes>
      <Route element={<MainLayout onLogin={onLogin} />}>
        <Route path="/" element={<DashboardPage />}>
          <Route
            index
            element={<div>Home coming soon.</div>}
          />

          <Route
            path="journeyPreview"
            element={<JourneyPreview />}
          />
        </Route>

        <Route path="/task" element={<TaskListPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/recharge" element={<RechargePage />} />
        <Route path="/congruence" element={<CongruencePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/settings/appearance"
          element={<AppearancePage />}
        />
        <Route
          path="/settings/notifications"
          element={<NotificationsPage />}
        />
        <Route
          path="/settings/general"
          element={<GeneralSettingsPage />}
        />
        <Route path="/notebook" element={<NotesPage />} />
        <Route path="/journey" element={<JourneyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
      </Route>

      {/* Timer is intentionally outside MainLayout */}
      <Route path="/timer" element={<TimerPage />} />
    </Routes>
  );
}

// This only renders after AuthGate allows the user into
// MainApplication.
function MainLayout({ onLogin }: { onLogin: () => void }) {
{

   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return(
    <div className="app-shell"
     style={{
        display: "flex",
        width: "100%",
        minWidth: 0,
    }}
    >
       <div
        style={{
            flex: `0 0 ${sidebarCollapsed ? "8%" : "13%"}`,
            minWidth: 0,
        }}>

        
    <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      </div>

      <div className="main-content"
             style={{
            flex: "1 1 auto",
            minWidth: 0,
        }}>
        <Toolbar onLogin={onLogin} />

        <div className="page-container">
          <Outlet  context={{ onLogin }}/>
       
        </div>
      </div>
    </div>
  );
}

}
function App() {
  return <AuthGate />;
}

export default App;