

        {/*Imports */}
import TaskCard from "../Components/TaskCard";
import { useEffect, useState } from "react";
import CreateTaskPopup from "../Components/CreateTaskPopup";
import { defaultTask} from "../Data/tasks";
import type { Task } from "../Data/tasks";
import { loadTasks, saveTasks } from "../Data/taskStorage";


export default function TaskListPage(){


                 {/* Function to create new task  */}
            const [ tasks, setTask ] = useState<Task[]>(() => 
            {
                const savedTasks = loadTasks();

                    if (savedTasks.length >0) 
                {
                        return (savedTasks);
                }

                    return defaultTask;
            });


                    // ======================================================
                    // Save Tasks Whenever They Change
                    // 
                useEffect(() => 
                {
                    saveTasks(tasks);
                }, [tasks]);


                {/* Function to display tack creation pop up */}
            const [ showCreateTaskPopup, setShowCreateTaskPopup ] = useState(false);

                        {/* Function handler for task creation */}
                    function handleCreateTask(newTask: Task) 
                    {
                        
                            {/* Overrides array with new array of task */}
                        setTask((prevTasks) => [newTask, ...prevTasks]);

                            
                             {/* hides pop up */}
                        setShowCreateTaskPopup(false);
                    }

                    

                    {/* Function to create new task  */}
                    function handleDeleteTask(taskId: number)
                    {

                       
                        //refresh {age
                        setTask(prevTask => 
                                    prevTask.filter(task => task.id !== taskId));    
                    }
                 

    return (

                    <div style = {{ padding: "20px"}} >

                            <h1> Task List </h1>

                             {/* new task button */}
                            <button onClick={() => setShowCreateTaskPopup(true)} >
                                + Create New Task </button>
                    
                                         {/* show pop up */}
                                { showCreateTaskPopup && 
                                <CreateTaskPopup onCreate={handleCreateTask}
                                onClose={() => setShowCreateTaskPopup(false)} />
                                }

                                    <div style = {{ marginTop: "20px"}}>

                                                  {/* Show all task */}
                                        {   tasks.map((task) =>
                                        (
                                            <TaskCard key = { task.id } 
                                            {...task }
                                            onDelete = {() => handleDeleteTask(task.id)} 
                                            />
                                        ))
                                        }
                                    </div>
                    </div>
    );
}