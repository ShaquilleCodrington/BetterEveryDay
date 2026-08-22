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
import type { User } from "firebase/auth";
import LoginScreen from "./Services/firebase/login";
import { subscribeToAuthState } from "./Services/firebase/auth";
import { continueAsGuest } from "./Services/firebase/connector";

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

type AuthStatus = | "loading" |"login" ;

function AuthGate() {
  const [authStatus, setAuthStatus] =
    useState<AuthStatus>("loading");

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  const [guestMode, setGuestMode] = useState(false);
   
  
  // AuthGate is now the single Firebase
  // authentication listener.
   useEffect(() => {
    return subscribeToAuthState((user) => {
      setCurrentUser(user);

      if (user) {
        setGuestMode(false);
        setAuthStatus("login");
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
   if  (!currentUser && !guestMode) {
    return (
      <LoginScreen
        onGuest={async () => {

          // ======================================================
          // 2026-08-22: Guest entry leaves currentUser as null
          // while allowing the user to enter the main application.
          // ======================================================
          await continueAsGuest();

          setGuestMode(true);
        
        }}
      />
    );
  }

   // Either Firebase authenticated the user or the user
  // explicitly chose to continue as a guest.
  return (

  <MainApplication
      
      currentUser = {currentUser}
      onLogin={() => 
        {
          setGuestMode(false);
          setAuthStatus("login");
        }} 
        />
      );
    }
        

// This contains the existing BetterEveryDay routes.
//
// The routes were moved out of App() so that AuthGate can
// control whether these routes are rendered.
function MainApplication(
  { 
    currentUser, onLogin 
  }:  { 
        currentUser: User | null; 
        onLogin: () => void 
      
      }) {
        
  return (
    <Routes>
       <Route element={
          <MainLayout
            currentUser={currentUser}
            onLogin={onLogin}
          />
        }
      >
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
function MainLayout({
  currentUser, onLogin,
}: {
  currentUser: User | null;
  onLogin: () => void;
}) {

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
        <Toolbar currentUser={currentUser} 
            onLogin={onLogin} />

        <div className="page-container">
          <Outlet  context={{ currentUser, onLogin }}/>
       
        </div>
      </div>
    </div>
  );
}


function App() {
  return <AuthGate />;
}

export default App;