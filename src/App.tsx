import { Routes, Route } from "react-router-dom";
import FocusPage from "./pages/FocusPage";
import DashboardPage from "./pages/DashboardPage";
import TaskListPage from "./pages/TaskListPage";

function App(){
  return (
    <Routes>
      <Route path = "/" element = {<DashboardPage />} />
      <Route path = "/task" element = { <TaskListPage />} />
      <Route path = "/focus" element = {<FocusPage />} />
    </Routes>
  );
}

export default App;
