import TaskCard from "../Components/TaskCard";
import { Link } from "react-router-dom";

export default function TaskListPage(){

    const tasks = [
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
    ];
    return (
        <div style = {{ padding: "20px"}} >
            <h1> Task List </h1>

      

            <div style = {{ marginTop: "20px"}}>
                {tasks.map((task) => (
                    <TaskCard key = { task.id } 
                    {...task } />
                ))}
            </div>
        </div>
    );
}