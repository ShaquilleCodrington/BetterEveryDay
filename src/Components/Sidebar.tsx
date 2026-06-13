import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">BetterEveryDay</div>
      <nav className="sidebar-nav">
        <Link to="/">
          <button className="sidebar-btn">Dashboard</button>
        </Link>
        <Link to="/task">
          <button className="sidebar-btn">Task List</button>
        </Link>
        <Link to="/congruence">
          <button className="sidebar-btn">Congruence</button>
        </Link>
      </nav>
    </div>
  );
}
