import { Routes, Route, Link } from "react-router-dom";
import FocusPage from "./pages/FocusPage";
import DashboardPage from "./pages/DashboardPage";
import TaskListPage from "./pages/TaskListPage";
import Sidebar from "./Components/Sidebar";
import CongruencePage from "./pages/CongruencePage";
import Toolbar from "./Components/Toolbar";
import PlanningPage from "./pages/PlanningPage"
import RechargePage from "./pages/RechargePage";


function App(){
  return (

    
    

    <div style = {{ display: "flex"}}>

         {/* Sidebar Navigation */}
      <Sidebar />

          
          {/* Toolbar  */}
      <div style = {{ flex: 1, padding: "20px"}}>
      <Toolbar />
      
      
      {/* Location for page rendering */}
    <Routes>
      <Route path = "/" element = {<DashboardPage />} />
      <Route path = "/task" element = { <TaskListPage />} />
      <Route path = "/focus" element = {<FocusPage />} />
      <Route path ="/planning" element = { <PlanningPage />} />
      <Route path ="/Recharge" element = { <RechargePage />} />
      <Route path = "/congruence" element = {<CongruencePage />} />


    </Routes>
    </div>
    </div>
  );
}

export default App;
