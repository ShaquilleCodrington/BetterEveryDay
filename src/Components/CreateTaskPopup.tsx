import { useState } from "react";
import type { Task } from "../Data/tasks";

type CreateTaskPopupProps = {
    onClose: () => void;
    onCreate: (task: Task) => void;
};

export default function CreateTaskPopup ({ 
            onClose, onCreate, }: CreateTaskPopupProps)
             {
    
    const [ title, setTitle ] = useState("");
    const [ notes, setNotes ] = useState("");
    const [ mood, setMood ] = useState("Focused");
    const [ status, setStatus ] = useState("To Do");
    const [ priority, setPriority ] = useState("Medium");
    const [ dueDate, setDueDate ] = useState("");

    function handleSubmit() {
        const newTask = {
            id: Date.now(),
            title,
            notes,
            completed: false,
            mood,
            status,
            priority,
            dueDate,
            updatedAt: new Date().toLocaleDateString(),
        };
        onCreate(newTask);
    }

    return (

        

        <div style = {{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }}>
            
                {/* Popup Window */}
                <div style = {{ 
                width: "500px",
                backgroundColor: "#fcfcfd",
                padding: "20px",
                borderRadius: "10px"
            }}>
                <h2> Create New Task </h2>


                {/* Form Layout Container */}
                <div style = {{ display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                     }}>
               

                  {/* To change Title */}
                    <div>
                    <label> Title </label>
                    <input
                    value = { title }
                    onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <br />

                    {/* To change Title */}
                    <div>
                    <label> Mood  </label>

                    <select value = { mood }
                    onChange={(e) => setMood(e.target.value)} >
                        <option value = "Focused"> Focused </option>
                        <option value = "Planning"> Planning </option>
                        <option value = "Recharge"> Recharge </option>
                    </select>
                </div>
                <br />

                {/* To change priority */}
                <div>
                    <label> Priority </label>
                    <select value = { priority }
                    onChange={(e) => setPriority(e.target.value)} >
                        <option value = "High"> High </option>
                        <option value = "Medium"> Medium </option>
                        <option value = "Low"> Low </option>
                    </select>
                </div>
                <br />
                               
                {/* To change due date */}
                <div>
                    <label> Due Date </label>
                    <input 
                    type = "date"
                    value = { dueDate }
                    onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <br />

                 {/* To change status*/}
                <div>
                    <label> Status </label>
                   <select value = { status }
                    onChange={(e) => setStatus(e.target.value)} >
                        <option value = "Not Started"> Not Started </option>
                        <option value = "In Progress"> In Progress </option>
                        <option value = "Past Due"> Past Due </option>
                        <option value = "Completed"> Completed </option>
                    </select>
                </div>
                <br />


                {/* To change notes */}
                <div>
                    <label> Notes </label>
                    <textarea 
                     rows = { 5 }
                    value = { notes }
                    onChange={(e) => setNotes(e.target.value)} 
                    />
                </div>

                <br />

                    {/* Action Buttons */}
                <div style = {{ display: "flex", gap: "10px"}}> 
                    
                    <button onClick={handleSubmit} > Create Task </button>
                    <button onClick={onClose} > Cancel </button>
                    
                    </div>
                    </div> 
                    </div>
                    </div>
        
        
    );
    }
