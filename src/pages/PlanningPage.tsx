//Imports
import { useEffect, useState } from "react";
import  TaskCard  from "../Components/TaskCard";
import type { Task } from "../Data/tasks";
import { getTasksByMood } from "../Data/taskStorage"


//This is where:components state rendering buttons activities will live.

export default function PlanningPage() {

  
  const [planningTasks, setPlanningTasks] = useState<Task[]>([]);


                    {/* ======================================================
                           Load Planning Task
                        ====================================================== */}

                useEffect(() =>
                {
                  setPlanningTasks(getTasksByMood("Planning"));
                }, []);
     

      //rendering
      return (
        
        <main>

          {/* if no activity is selected show focus/activity section */}

          
              <h1>  Planning Page </h1>
              
                <p>  This is where we anticipate challenges,
                organize our work, and stack our hand for execution.  </p>

              <hr />
                  
                  <h2> Planning Tasks </h2>

                           {/*if no focused task show   */}
                  { planningTasks.length == 0 ? 
                  ( <p> No Planning Task Avaliable. </p>) 
                  : (

                               //else show this
                   planningTasks.map((task) => 
                         ( <TaskCard key = {task.id }
                                        {... task}
                                         />
                                    ))
                  )}


                

          </main>
      );
}

