import { useState } from "react";
import type { Task } from "../Data/tasks";
import { createPortal } from "react-dom";

type EditTaskPopupProps = {
  task: Task;
  onClose: () => void;
  onSave: (updated: Task) => void;
};

export default function EditTaskPopup({ task, onClose, onSave }: EditTaskPopupProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [mood, setMood] = useState(task.mood);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate);

   function handleSave() {
    // 2026-10-18 — Manual completion also records/clears completedAt
    const now = new Date().toISOString();
    const isNowCompleted = status === "Completed";

    onSave({
      ...task,
      title,
      notes,
      mood,
      status,
      priority,
      dueDate,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? task.completedAt ?? now : null,
      updatedAt: now,
    });
  }

  return createPortal(
    <div className="popup-overlay">
      <div className="glass-panel popup-window">
        <h2>Edit Task</h2>

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
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}