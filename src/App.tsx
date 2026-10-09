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
import { continueAsGuest, logout, useAuthConnector } from "./Services/firebase/connector";
import { autoSync } from "./Services/Snapshot/syncManager";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import FocusPage from "./pages/FocusPage";
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
import InvoicePage from "./pages/InvoicePage.tsx";
import CalendarPage from "./pages/CalendarPage";
import { createCalendarEventsFromTasks } from "./Features/Calendar/calendar";
import type { CalendarEvent } from "./Features/Calendar/calendar";
import {
  loadCalendarEvents,
  saveCalendarEvents,
} from "./Features/Calendar/calendarStorage";
import { loadTasks, saveTasks } from "./Data/taskStorage";
import type { ChecklistItem } from "./Components/Checklist";
import type { Task } from "./Data/tasks";
import "./Css/App.css";

type AuthStatus = | "loading" |"login" ;

function AuthGate() {
  const [authStatus, setAuthStatus] =
    useState<AuthStatus>("loading");

  const currentUser: User | null = useAuthConnector();


  const [guestMode, setGuestMode] = useState(false);
   
  // 2026-08-22: Central application logout action.
// This delegates authentication to the connector.
async function handleLogout(): Promise<void> {
    await logout();
}
  
  // AuthGate is now the single Firebase
  // authentication listener.
    useEffect(() => {
    if (currentUser) {
      setGuestMode(false);
      setAuthStatus("login");
      return;
    }

    // No authenticated Firebase user.
    // Guest mode may still allow the application to render.
    setAuthStatus("login");
  }, [currentUser]);

  // Firebase/auth connector has not finished determining
  // the current authentication state.
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
    
            currentUser={currentUser}
            onLogin={() => {
                setGuestMode(false);
                setAuthStatus("login");
            }}
            onLogout={handleLogout}
          />
      );
    }
        

// This contains the existing BetterEveryDay routes.
//
// The routes were moved out of App() so that AuthGate can
// control whether these routes are rendered.
function MainApplication(
  { 
    currentUser, onLogin, onLogout 
  }:  { 
        currentUser: User | null; 
        onLogin: () => void;
        onLogout: () => Promise<void>;
      
      }) {
        
  return (
    <Routes>
       <Route element={
          <MainLayout
            currentUser={currentUser}
           onLogin={onLogin}
            onLogout={onLogout}
          />
        }
      >
         <Route path="/" element={<CongruencePage />}>
           

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
        <Route path="/invoice" element={<InvoicePage />} />
        <Route path="/calendar" element={<CalendarRoute />} />
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
  currentUser, onLogin, onLogout
}: {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}) {
type SidebarState = "closed" | "collapsed" | "open";

   const [sidebarState, setSidebarState] =
     useState<SidebarState>("open");
       // 10/09/2026 — Sync when the user leaves a page. The cleanup runs when
  // the path changes (leaving the old page) and when MainLayout unmounts
  // (for example, going to the Timer page, which sits outside MainLayout).
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userId = currentUser.uid;

    return () => {
      void autoSync(userId);
    };
  }, [location.pathname, currentUser?.uid]);


function handleSidebarToggle() {
    setSidebarState((currentState) => {
        if (currentState === "closed")
         { return "collapsed"; }
        if (currentState === "collapsed")
            { return "open"; }

            return "closed"; }
            );}
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
            flex: `0 0 ${sidebarState === "closed" ? "0%"
                : sidebarState === "collapsed" ? "7%" : "13%"}`,
            minWidth: 0,
        }}>

        
    <Sidebar
        state={sidebarState}
        onToggle={handleSidebarToggle} />
      </div>

      <div className="main-content"
             style={{
            flex: "1 1 auto",
            minWidth: 0,
        }}>
        <Toolbar currentUser={currentUser} 
            onLogin={onLogin}
            onLogout={onLogout}
            onToggleSidebar={handleSidebarToggle}
             />

        <div className="page-container">
          <Outlet  context={{ currentUser, onLogin, onLogout }}/>
       
        </div>
      </div>
    </div>
  );
}
function CalendarRoute() {
  // Tasks are read when the Calendar route opens.
  const [tasks, setTasks] = useState<Task[]>(
    () => loadTasks()
  );

  // Calendar events load from their own storage key.
  const [calendarEvents, setCalendarEvents] =
    useState<CalendarEvent[]>(loadCalendarEvents);

  // Task changes made from Calendar use the same task state
  // that the Calendar page is displaying.
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Tasks with a valid due date and no event get one.
  // createCalendarEventsFromTasks returns the same array when nothing
  // is new, so this does not re-render in a loop.
  useEffect(() => {
    setCalendarEvents((currentEvents) =>
      createCalendarEventsFromTasks(
        tasks,
        currentEvents
      )
    );
  }, [tasks]);

  // Persist whenever the calendar events change.
  useEffect(() => {
    saveCalendarEvents(calendarEvents);
  }, [calendarEvents]);

  function handleDeleteTask(taskId: string) {
    setTasks((prevTasks) =>
      prevTasks.filter(
        (task) => task.id !== taskId
      )
    );
  }

  function handleEditTask(updatedTask: Task) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedTask.id
          ? updatedTask
          : task
      )
    );
  }

  function handleChecklistChange(
    taskId: string,
    items: ChecklistItem[]
  ) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: items,
            }
          : task
      )
    );
  }

  return (
    <CalendarPage
      tasks={tasks}
      calendarEvents={calendarEvents}
      onDeleteTask={handleDeleteTask}
      onEditTask={handleEditTask}
      onChecklistChange={handleChecklistChange}
    />
  );
}

function App() {
  return <AuthGate />;
}

export default App;