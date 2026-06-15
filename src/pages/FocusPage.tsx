//Imports
import { useEffect, useState } from "react";
import { statesData} from "../statesData";
import  ActivityPage  from  "../pages/ActivityPage"
import  TaskCard  from "../Components/TaskCard";
import type { Task } from "../Data/tasks";
import { getTasksByMood } from "../Data/taskStorage"


//This is where:components state rendering buttons activities will live.

export default function FocusPage() {

  
  const focusedState = statesData.focused;
  const [selectedFocus,setSelectedFocus] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [focusedTasks, setFocusedTasks] = useState<Task[]>([]);



      // ======================================================
        // Load Focused Tasks
        // ======================================================

        useEffect(() => {

            setFocusedTasks(getTasksByMood(focusedState.name));

        }, [focusedState.name]);


   

      
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

      //rendering
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

              <hr />
                  {/* ======================================================
                            Focused Tasks
                        ====================================================== */}
                  
                  <h2> Focused Tasks </h2>

                           {/*if no focused task show   */}
                  { focusedTasks.length == 0 ? 
                  ( <p> No Focused Task Avaliable. </p>) :

                               //else show this
                  ( focusedTasks.map((task) => 
                         ( <TaskCard key = {task.id }
                                        {... task}
                               
                                         />
                                    ))
                  )}


                     {/* focus modes   */}
                  <h2> What Would You Like To Do </h2>

                    <button onClick={() => setSelectedFocus("Momentum Builder")} > Momentum Builder </button>
                    <button onClick={() =>setSelectedFocus("Light Focus")}> Light Focus </button>
                    <button onClick = {() => setSelectedFocus("Deep Focus")} > Deep Focus </button>

                  <h3> {selectedFocus} </h3>
                                   {/* show all activities  */}
                    <div> {currentActivities.map((activity) =>
                    <button key = {activity} onClick ={() => setSelectedActivity(activity)} 
                    > {activity} </button>
                    )}
                    </div>

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

