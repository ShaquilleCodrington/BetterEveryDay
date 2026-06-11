import TaskCard from "../Components/TaskCard";
import { useState } from "react";
import CreateTaskPopup from "../Components/CreateTaskPopup";

export default function TaskListPage(){


      {/* Function to create new task  */}
    const [ tasks, setTask ]  = useState([
        {
            id: 1,
            title: "Build TaskCard",
            notes: `Design from sketch
            Implement accordion
            Test preview lines
            Works great`,
            completed: false,
            focus: "Focused",
            priority: "High",
            dueDate: "May 20",
            updatedAt: "2026-05-18",
        },
        {
            id: 2,
            title: "Refactor Layout System",
            notes: `Convert components to modular structure
            Improve spacing system
            Clean up styles`,
            completed: true,
            focus: "Deep Work",
            priority: "Medium",
            dueDate: "May 22",
            updatedAt: "2026-05-17",
        },
    ]);

    {/* Function to display tack creation pop up */}
    const [ showCreateTaskPopup, setShowCreateTaskPopup ] = useState(false);

         {/* Function handler for task creation */}
         function handleCreateTask(newTask: any) {
            setTask((prevTasks) => [newTask, ...prevTasks]);
            setShowCreateTaskPopup(false);
         }

    return (

        <div style = {{ padding: "20px"}} >
            <h1> Task List </h1>

            <button onClick={() => setShowCreateTaskPopup(true)} >
                + Create New Task </button>
      
        { showCreateTaskPopup && 
        <CreateTaskPopup onCreate={handleCreateTask}
         onClose={() => setShowCreateTaskPopup(false)} />
        }

            <div style = {{ marginTop: "20px"}}>
                {   tasks.map((task) =>
                 (
                    <TaskCard key = { task.id } 
                    {...task } />
                ))
                }
            </div>
        </div>
    );
}