import TaskCard from "../Components/TaskCard";
import { Link } from "react-router-dom";

export default function DashboardPage() {
 
    

    return (
        <div style = {{ padding: "20px" }}>
            <h1> Dashboard </h1>

            {/* TaskPreview Section*/}
            <h2> Task Preview</h2>
            
           <TaskCard
        id={1}
        title="Build TaskCard"
        notes={`Design from sketch
        Implement accordion
        Test preview lines`}
        completed={false}
        focus="Focused"
        priority="High"
        dueDate="May 20"
        updatedAt="2026-05-18"
       />
       <Link to ="/task">
       <button> Task List </button>
       </Link>

       <hr style = {{ margin: "30px 0"}} />

       {/* Focus System Section */}
       <h2> Focus System </h2>
       <Link to = "/focus" >
       <button> Focus Page </button>
       </Link>
        </div>
    );
}