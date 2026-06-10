import { Link, useNavigate } from "react-router-dom";

export default function Toolbar() {

    const navigate = useNavigate();
return (
    
    <div style = {{ display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    padding: "10px 0",}}>
       

        {/* Dashboard Button */}
      <Link to = "/">
        <button> Dashboard </button>
        </Link>

        {/* Back Button */}
        <button onClick={() => navigate(-1)}> Back

        </button>
       

        </div>

);
}
