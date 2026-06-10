import { Link } from "react-router-dom";

export default function Sidebar() {
    return (
        <div style={{ width: "180px", 
        padding: "20px", 
        borderRight: "1px solid gray",
        display: "flex",
        flexDirection: "column",
        height: "100vh",}}>

            <h2> BetterEveryDay </h2>
            <div style = {{ display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-around",
                flex: 1,}}>
                    
                    <Link to = "/">
                    <button> Dashboard </button>
                    </Link>

                    <Link to = "/task">
                    <button> Task List </button>
                    </Link>

                    <Link to = "/congruence">
                    <button> Congruence </button>
                    </Link>
            
            </div>
            </div>
    );
}