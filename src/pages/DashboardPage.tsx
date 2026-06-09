
import DashboardAccordion from "../Components/DashboardAccordion";

export default function DashboardPage() {
 
    

    return (
        <div style = {{ padding: "20px"}}>
        
        
            <h1> Dashboard </h1>

        {/* Line to separate sections*/}
        <hr style = {{ margin: "30px 0"}} />

        <div style = {{ display: "flex",
        justifyContent: "space-between" }}>
            <DashboardAccordion 
            title = "Congruence"
            preview = "Match your Task to your MOOD."
            expandedView = {[  "Current mood: Focused",
            "3 matching tasks available",
            "Last check-in: Today",]} 
        
            pagePath = "/focus"/> 

           <DashboardAccordion 
            title = "Task List"
            preview = "View and manage your tasks"
            expandedView = {[  "Current Task: Build TaskCard",
             "notes: Design from sketch",
            " Implement accordion",
            " Journal Progress "]} 
        
             pagePath = "/task"/> 

           
            
           
        </div>

       <hr style = {{ margin: "30px 0"}} />

       
        </div>
    );
}