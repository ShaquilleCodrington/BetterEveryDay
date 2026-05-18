import { Routes, Route } from "react-router-dom";
import FocusPage from "./pages/FocusPage";

function App(){
  return (
    <Routes>
      <Route path="/" element={<FocusPage />} />
    </Routes>
  );
}

export default App;
