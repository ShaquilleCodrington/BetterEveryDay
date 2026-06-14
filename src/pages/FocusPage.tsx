//Imports
import { useEffect, useState } from "react";
import { statesData} from "../statesData";
import  ActivityPage  from  "../pages/ActivityPage"
import  TaskCard  from "../Components/TaskCard";
import { loadTasks } from "../Data/taskStorage";
import type { Task } from "../Data/tasks";


//This is where:components state rendering buttons activities will live.

export default function FocusPage() {

  
  
  const [selectedFocus,setSelectedFocus] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);

   // ======================================================
    // Load Tasks
    // ======================================================

    useEffect(() => {

        setTasks(loadTasks());

    }, []);
    // filter focused tasks
    const focusedTasks = tasks.filter(task => task.mood === "Focused");

  const focusedState = statesData.focused;

  let currentActivities : string[] = [];

  //switch for activities
  switch (selectedFocus)
  {
      
         case "Momentum Builder":
           currentActivities = focusedState.activities.momentumBuilder;
            break;
        case "Light Focus":
          currentActivities =focusedState.activities.lightFocus;
            break;
          case "Deep Focus":
            currentActivities = focusedState.activities.deepFocus;
            break;


  }
  return (
    
    <main>

      {/* if no activity is selected show focus/activity section */}

      {!selectedActivity && (
        <>
          <h1> {focusedState.name} </h1>
          
            <ul> {focusedState.identity.map((statement) => 
            (
              <li key={statement}> {statement} </li>
            ))} 
            </ul>

          
              {/* ======================================================
                        Focused Tasks
                    ====================================================== */}
              
              <h2> focused Task </h2>

              { focusedTasks.length == 0 ? 
              ( <p> No Focused Task Avaliable. </p>) :
              ( focusedTasks.map((task) => 
              ( <TaskCard key = {task.id }
                {... task} />
              ))
              )}

              <h2> What Would You Like To Do </h2>

                <button onClick={() => setSelectedFocus("Momentum Builder")} > Momentum Builder </button>
                <button onClick={() =>setSelectedFocus("Light Focus")}> Light Focus </button>
                <button onClick = {() => setSelectedFocus("Deep Focus")} > Deep Focus </button>

                <h3> {selectedFocus} </h3>
                <div> {currentActivities.map((activity) =>
                <button key = {activity} onClick ={() => setSelectedActivity(activity)} 
                > {activity} </button>
                )}</div>
                </>
                )}
                {/* if an activity is selected show activity page */}
                {selectedActivity && (
                  <ActivityPage activityName ={selectedActivity}
                  />
                )}
            

      </main>
  );
}

