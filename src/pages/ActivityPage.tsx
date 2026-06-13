import { useEffect, useState } from "react";

type ActivityPageProps = {
  activityName: string;
};

function ActivityPage({ activityName }: ActivityPageProps) {
  const storageKey = `activity-notes-${activityName}`;
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const savedNotes = localStorage.getItem(storageKey);
    setNotes(savedNotes !== null ? savedNotes : "");
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

  return (
    <div className="activity-section">
      <h1>{activityName}</h1>
      <div className="session-label">Current Session</div>

      <textarea
        className="notes-textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Log your thoughts, progress, or session notes here."
        rows={10}
      />
      <p className="autosave-label">Notes saved automatically</p>

      <div className="activity-actions">
        <button>Start New Session</button>
        <button>View Old Sessions</button>
      </div>

      <p className="placeholder-text">Timer coming soon.</p>
      <p className="placeholder-text">Session history coming soon.</p>
    </div>
  );
}

export default ActivityPage;
