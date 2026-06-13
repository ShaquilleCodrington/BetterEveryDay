import { useState } from "react";

type CreateTaskPopupProps = {
  onClose: () => void;
  onCreate: (task: any) => void;
};

export default function CreateTaskPopup({ onClose, onCreate }: CreateTaskPopupProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [focus, setFocus] = useState("Focused");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

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
    <div className="popup-overlay">
      <div className="glass-panel popup-window">
        <h2>Create New Task</h2>

        <div className="form-field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Focus</label>
          <select value={focus} onChange={(e) => setFocus(e.target.value)}>
            <option value="Focused">Focused</option>
            <option value="Deep Work">Deep Work</option>
            <option value="Chill">Chill</option>
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
