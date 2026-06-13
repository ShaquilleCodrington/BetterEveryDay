import { Link, useNavigate } from "react-router-dom";

export default function Toolbar() {
  const navigate = useNavigate();
  return (
    <div className="toolbar">
      <Link to="/">
        <button>Dashboard</button>
      </Link>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
