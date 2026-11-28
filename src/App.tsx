// ======================================================
// App.tsx
// ------------------------------------------------------
// Application root and authentication gate.
//
// 2026-11-14 — Top-level routing:
//      "/"            -> website LandingPage (public, no auth)
//      everything else -> AuthGate -> MainApplication
//      (Congruence now lives only at /congruence.)
//
// Research is not a route: MainLayout wraps the page area in
// ResearchWorkspace and passes ResearchPage in as the pane.
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

import { lazy, Suspense, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import LoginScreen from "./Services/firebase/login";
import {
  continueAsGuest,
  logout,
  useAuthConnector,
} from "./Services/firebase/connector";
import { autoSync } from "./Services/Snapshot/syncManager";
import {
  Routes,
  Route,
  Outlet,
  useLocation,
  useOutletContext,
} from "react-router-dom";

import Sidebar from "./Components/Sidebar";
import Toolbar from "./Components/Toolbar";

// InvoicePage is loaded at startup because it has its own stylesheet.
// Loading it later would change the order of the app's styles.
import InvoicePage from "./pages/InvoicePage.tsx";

// Research
import { ResearchWorkspace } from "./Features/research/ResearchWorkspace.tsx";

import "../website/src/styles/index.css";
import "../website/src/styles/app.css";

import { createCalendarEventsFromTasks } from "./Features/Calendar/calendar";
import type { CalendarEvent } from "./Features/Calendar/calendar";
import {
  loadCalendarEvents,
  saveCalendarEvents,
} from "./Features/Calendar/calendarStorage";
import { loadTasks, saveTasks } from "./Data/taskStorage";
import type { ChecklistItem } from "./Components/Checklist";

// 2026-10-18 — Task lifecycle helpers and shared context type
import type { Task, TaskOutletContext } from "./Data/tasks";
import {
  applyChecklistChange,
  refreshTaskLifecycle,
} from "./Data/tasks";

import "./Css/App.css";
import { initializeDefaults } from "./Data/defaultContent.ts";

// Pages are loaded the first time they are opened (code splitting).
const FocusPage = lazy(() => import("./pages/FocusPage"));
const TaskListPage = lazy(() => import("./pages/TaskListPage"));
const CongruencePage = lazy(() => import("./pages/CongruencePage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const RechargePage = lazy(() => import("./pages/RechargePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AppearancePage = lazy(() => import("./pages/AppearancePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const GeneralSettingsPage = lazy(() => import("./pages/GeneralSettingsPage"));
const TimerPage = lazy(() => import("./pages/TimerPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const JourneyPage = lazy(() => import("./pages/JourneyPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const JourneyPreview = lazy(() => import("./Features/journey/Utils/JourneyPreview"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const DeletedPage = lazy(() => import("./pages/DeletedPage"));
const ResearchPage = lazy(() => import("./pages/ResearchPage"));

// 2026-11-14 — The landing page is JavaScript maintained in the website submodule.
const LandingPage = lazy(
  // @ts-expect-error The submodule does not provide a TypeScript declaration for this JSX module.
  () => import("../website/src/pages/LandingPage.jsx")
);

type AuthStatus = "loading" | "login";

function App() {
  const location = useLocation();

  // Show the website at the domain root.
  // App pages continue through the existing auth gate.
  if (location.pathname === "/") {
    return (
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    );
  }

  return <AuthGate />;
}

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
  if (!currentUser && !guestMode) {
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
function MainApplication({
  currentUser,
  onLogin,
  onLogout,
}: {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <Routes>
      <Route
        element={
          <MainLayout
            currentUser={currentUser}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        }
      >
        {/* The journey preview has its own route. */}
        <Route
          path="/journeyPreview"
          element={<JourneyPreview />}
        />

        <Route path="/task" element={<TaskListPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/recharge" element={<RechargePage />} />
        <Route path="/congruence" element={<CongruencePage />} />
        <Route path="/invoice" element={<InvoicePage />} />
        <Route path="/calendar" element={<CalendarRoute />} />

        <Route
          path="/feedback"
          element={
            currentUser ? (
              <FeedbackPage userId={currentUser.uid} />
            ) : (
              <div>Sign in to access Community Feedback.</div>
            )
          }
        />

        <Route path="/settings/deleted" element={<DeletedPage />} />
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
      <Route
        path="/timer"
        element={
          <Suspense fallback={null}>
            <TimerPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

// This only renders after AuthGate allows the user into
// MainApplication.
function MainLayout({
  currentUser,
  onLogin,
  onLogout,
}: {
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}) {
  type SidebarState = "closed" | "collapsed" | "open";

  const [sidebarState, setSidebarState] =
    useState<SidebarState>("open");

  // Sync when the user leaves a page. Cleanup runs when the
  // path changes and when MainLayout unmounts.
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

  // Single source of truth for tasks.
  // Default starter content runs before tasks are read.
  const [tasks, setTasks] = useState<Task[]>(() => {
    initializeDefaults(currentUser?.uid ?? null);
    return refreshTaskLifecycle(loadTasks());
  });

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function handleCreateTask(newTask: Task) {
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  }

  function handleEditTask(updatedTask: Task) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  }

  function handleDeleteTask(taskId: string) {
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.id !== taskId
      )
    );
  }

  function handleChecklistChange(
    taskId: string,
    items: ChecklistItem[],
  ) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? applyChecklistChange(task, items)
          : task
      )
    );
  }

  function handleSidebarToggle() {
    setSidebarState((currentState) => {
      if (currentState === "closed") return "collapsed";
      if (currentState === "collapsed") return "open";
      return "closed";
    });
  }

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* Sidebar remains outside the Research split. */}
      <div
        className="sidebar-wrap"
        style={{
          flex: `0 0 ${
            sidebarState === "closed"
              ? "0%"
              : sidebarState === "collapsed"
                ? "7%"
                : "13%"
          }`,
          minWidth: 0,
        }}
      >
        <Sidebar
          state={sidebarState}
          onToggle={handleSidebarToggle}
        />
      </div>

      {/* Research splits the main application surface, not the sidebar. */}
      <ResearchWorkspace
        pane={
          <Suspense fallback={null}>
            <ResearchPage />
          </Suspense>
        }
      >
        <div
          className="main-content"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            height: "100%",
          }}
        >
          <Toolbar
            currentUser={currentUser}
            onLogin={onLogin}
            onLogout={onLogout}
            onToggleSidebar={handleSidebarToggle}
          />

          <div className="page-container">
            {/* Keeps the sidebar and toolbar on screen while a page loads. */}
            <Suspense fallback={null}>
              <Outlet
                context={{
                  currentUser,
                  onLogin,
                  onLogout,
                  tasks,
                  onCreateTask: handleCreateTask,
                  onEditTask: handleEditTask,
                  onDeleteTask: handleDeleteTask,
                  onChecklistChange: handleChecklistChange,
                }}
              />
            </Suspense>
          </div>
        </div>
      </ResearchWorkspace>
    </div>
  );
}

function CalendarRoute() {
  // Tasks come from MainLayout; the calendar keeps no task state.
  const {
    tasks,
    onCreateTask,
    onEditTask,
    onDeleteTask,
    onChecklistChange,
  } = useOutletContext<TaskOutletContext>();

  const [calendarEvents, setCalendarEvents] =
    useState<CalendarEvent[]>(loadCalendarEvents);

  // Tasks with a valid due date and no event get one.
  useEffect(() => {
    setCalendarEvents((currentEvents) =>
      createCalendarEventsFromTasks(tasks, currentEvents)
    );
  }, [tasks]);

  // Persist whenever calendar events change.
  useEffect(() => {
    saveCalendarEvents(calendarEvents);
  }, [calendarEvents]);

  return (
    <CalendarPage
      tasks={tasks}
      calendarEvents={calendarEvents}
      onCreateTask={onCreateTask}
      onDeleteTask={onDeleteTask}
      onEditTask={onEditTask}
      onChecklistChange={onChecklistChange}
    />
  );
}


export default App;