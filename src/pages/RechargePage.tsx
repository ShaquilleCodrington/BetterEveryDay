//Imports
import { useEffect, useState } from "react";
import  TaskCard  from "../Components/TaskCard";
import type { Task } from "../Data/tasks";
import { getTasksByMood } from "../Data/taskStorage"


//This is where:components state rendering buttons activities will live.

export default function RechargePage() {

  
  const [rechargeTasks, setRechargeTasks] = useState<Task[]>([]);


                    {/* ======================================================
                           Load Planning Task
                        ====================================================== */}

                useEffect(() =>
                {
                  setRechargeTasks(getTasksByMood("Recharge"));
                }, []);
     

      //rendering
      return (
        
        <main>

          {/* if no activity is selected show focus/activity section */}

          
              <h1>  Recharge Page </h1>
              
                <p>  This is where we Take a moment, brethe and grow from what 
                    we've learned.  </p>

              <hr />
                  
                  <h2> Recharge Tasks </h2>

                           {/*if no focused task show   */}
                  { rechargeTasks.length == 0 ? 
                  ( <p> No Planning Task Avaliable. </p>) 
                  : (

                               //else show this
                   rechargeTasks.map((task) => 
                         ( <TaskCard key = {task.id }
                                        {... task}
                                         />
                                    ))
                  )}


                

          </main>
      );
}

