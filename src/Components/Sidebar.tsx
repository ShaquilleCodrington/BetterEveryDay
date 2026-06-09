import { Link } from "react-router-dom";

export default function Sidebar() {
    return (
        <div style={{ width: "220px", 
        padding: "20px", 
        borderRight: "1px solid gray" }}>

            <h2> BetterEveryDay </h2>
            <div style = {{ display: "flex", 
                flexDirection: "column", gap: "30px"}}>
                    
                    <Link to = "/">
                    <button> Dashboard </button>
                    </Link>

                    <Link to = "/task">
                    <button> Task List </button>
                    </Link>

                    <Link to = "/focus">
                    <button> Focus Mode </button>
                    </Link>
            
            </div>
            </div>
    );
}