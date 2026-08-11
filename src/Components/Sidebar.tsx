import { Link } from "react-router-dom";
import Tooltip from "./Tooltip"; 
// CHANGED: import the Lucide icons used in the nav
import { Signpost, ListTodo, Sticker, NotebookTabs, Road, PanelLeft } from "lucide-react";
// CHANGED: added props so the parent (MainLayout) can control collapsed state
interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void; 
}

// CHANGED: now accepts `collapsed` prop
export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (

   <div className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
     <div className="sidebar-logo-row">
        <Tooltip text={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            className="toolbar-icon-btn"
            onClick={onToggleCollapse}
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </Tooltip>
        <Link to="/" className="sidebar-logo-link">
          {!collapsed && <div className="sidebar-logo">BetterEveryDay</div>}
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        <Link to="/">
          <button className="sidebar-btn">
            
            <Signpost size={18} className="sidebar-btn-icon" />
            {/* CHANGED: label hidden when collapsed */}
            {!collapsed && <span className="sidebar-btn-label">Dashboard</span>}
          </button>
        </Link>
        <Link to="/task">

          <button className="sidebar-btn">
            <ListTodo size={18} className="sidebar-btn-icon" />
            {!collapsed && <span className="sidebar-btn-label">Task List</span>}
          </button>
        </Link>

        <Link to="/congruence">
          <button className="sidebar-btn">
            <Sticker size={18} className="sidebar-btn-icon" />
            {!collapsed && <span className="sidebar-btn-label">Congruence</span>}
          </button>
        </Link>

        <Link to="/Notebook">
          <button className="sidebar-btn">
            <NotebookTabs size={18} className="sidebar-btn-icon" />
            {!collapsed && <span className="sidebar-btn-label">Notebook</span>}
          </button>
        </Link>

        <Link to="/Journey">
          <button className="sidebar-btn">
            <Road size={18} className="sidebar-btn-icon" />
            {!collapsed && <span className="sidebar-btn-label">Journey</span>}
          </button>
        </Link>
      </nav>

      <Link to="/help">
        <button className="sidebar-btn">
          
          <span className="sidebar-btn-icon">?</span>
          {!collapsed && <span className="sidebar-btn-label">Help</span>}
        </button>
      </Link>

      <Link to="/settings">
        <button className="sidebar-btn">
         
          <span className="sidebar-btn-icon">⚙</span>
          {!collapsed && <span className="sidebar-btn-label">Settings</span>}
        </button>
      </Link>
    </div>
  );
}