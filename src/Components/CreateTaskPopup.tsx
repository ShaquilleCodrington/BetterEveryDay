import { useState } from "react";

type CreateTaskPopupProps = {
    onClose: () => void;
    onCreate: (task: any) => void;
};

export default function CreateTaskPopup ({ 
            onClose, onCreate, }: CreateTaskPopupProps)
             {
    
    const [ title, setTitle ] = useState("");
    const [ notes, setNotes ] = useState("");
    const [ focus, setFocus ] = useState("Focused");
    const [ priority, setPriority ] = useState("Medium");
    const [ dueDate, setDueDate ] = useState("");

    function handleSubmit() {
        const newTask = {
            id: Date.now(),
            title,
            notes,
            completed: false,
            focus,
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
                    <label> Focus  </label>

                    <select value = { focus }
                    onChange={(e) => setFocus(e.target.value)} >
                        <option value = "Focused"> Focused </option>
                        <option value = "Deep Work"> Deep Work </option>
                        <option value = "Chill"> Chill </option>
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
