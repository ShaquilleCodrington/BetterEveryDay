import { useState } from "react";
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


function MainLayout()
{

   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return(
    <div className="app-shell">
    <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="main-content">
        <Toolbar />

        <div className="page-container">
          <Outlet/>
       
        </div>
      </div>
    </div>
  );
}


function App() {
  return (
 
          <Routes>

              {/* Main application */}
          <Route element={ <MainLayout />} >
            <Route path="/" element={<DashboardPage />}>
              <Route index element={<div>Home coming soon.</div>} />
              <Route path="journeyPreview" element={<JourneyPreview />} />
            </Route>

            <Route path="/task" element={<TaskListPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/recharge" element={<RechargePage />} />
            <Route path="/congruence" element={<CongruencePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/appearance" element={<AppearancePage />} />
            <Route path="/settings/notifications" element={<NotificationsPage />} />
            <Route path="/settings/general" element={<GeneralSettingsPage />} />
            <Route path="/notebook" element={<NotesPage />} />
            <Route path="/journey" element={<JourneyPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

         
       <Route path="/timer" element= { <TimerPage />} />
       </Routes>
      
    
  );
}

export default App;
