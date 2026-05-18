//imports
import {useEffect, useState} from "react"

//custom type
type ActivityPageProps = { 
  activityName: string;
  onBack: () => void;
};

//function def
function ActivityPage({ activityName, onBack }: ActivityPageProps) {
 
  const storageKey = `activity-notes-${activityName}`;

  const [notes, setNotes] = useState("");

  // Load notes when the activity page opens
  useEffect(() => {
    const savedNotes = localStorage.getItem(storageKey);

    console.log("Loading from:", storageKey, savedNotes);

    if (savedNotes !== null) {
      setNotes(savedNotes);
    } else {
      setNotes("");
    }
  }, [storageKey]);

  // Save notes every time user types
  useEffect(() => {
    console.log("Saving to:", storageKey, notes);

    localStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

//return statement
return (
  <section>
    <button onClick={onBack}> Back </button>

    <h2> {activityName} </h2>
    <h3> Current Session </h3>

    <textarea
              value = {notes}
              onChange = {(event) => setNotes(event.target.value)}
              placeholder = "Log your thoughts, progress, or session notes here."
              rows ={10}
              cols = {40} />

       <p> Notes Saved Automatically </p>

       <button>Start New Session</button>
      <button>View Old Sessions</button>

      <p>Timer will go here later.</p>
      <p>Old session history will go here later.</p>
    </section>

);

}

//export 
export default ActivityPage;