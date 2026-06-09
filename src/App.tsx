import { Routes, Route } from "react-router-dom";
import FocusPage from "./pages/FocusPage";
import DashboardPage from "./pages/DashboardPage";
import TaskListPage from "./pages/TaskListPage";
import Sidebar from "./Components/Sidebar";

function App(){
  return (
    <div style = {{ display: "flex"}}>
      <Sidebar />

      <div style = {{ flex: 1,
      padding: "20px"
      }}>
    <Routes>
      <Route path = "/" element = {<DashboardPage />} />
      <Route path = "/task" element = { <TaskListPage />} />
      <Route path = "/focus" element = {<FocusPage />} />
    </Routes>
    </div>
    </div>
  );
}

export default App;
