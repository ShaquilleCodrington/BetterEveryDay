import { useState } from "react";
import type { Task } from "../Data/tasks";
import { useAuthConnector } from "../Services/firebase/connector";

type CreateTaskPopupProps = {
  onClose: () => void;
  onCreate: (task: Task) => void;

};export default function CreateTaskPopup({ onClose, onCreate }: CreateTaskPopupProps) 
{ const  currentUser  = useAuthConnector();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("Focused");
  const [status, setStatus] = useState("Not Started");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

function handleSubmit() {
   // ====================================================== // 2026-08-18 — State Convergence // ------------------------------------------------------ //
   //  Establish Task ownership at the creation boundary. 
   // // Guest-created Tasks use null. 
   // // Authenticated Tasks use the Firebase user's UID. 
   // // ======================================================

   const userId = currentUser?.uid ?? null; 
   const now = new Date().toISOString();

   const newTask: Task = {
    id: crypto.randomUUID(),
    userId,
    title,
    notes,
    completed: false,
    mood,
    status,
    priority,
    dueDate,
    createdAt: now,
    completedAt: null,
    updatedAt: now,
    checklist: [],
  };
    onCreate(newTask);
  }

  return (
    <div className="popup-overlay">
      <div className="glass-panel popup-window">
        <h2>Create New Task</h2>

        <div className="form-field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Mood</label>
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="Focused">Focused</option>
            <option value="Planning">Planning</option>
            <option value="Recharge">Recharge</option>
          </select>
        </div>

        <div className="form-field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="form-field">
          <label>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Past Due">Past Due</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="form-field">
          <label>Notes</label>
          <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="popup-actions">
          <button className="btn-primary" onClick={handleSubmit}>Create Task</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
