import { useState } from "react";
import { statesData } from "../statesData";
import ActivityPage from "../pages/ActivityPage";

export default function FocusPage() {
  const [selectedFocus, setSelectedFocus] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");

  const focusedState = statesData.focused;
  let currentActivities: string[] = [];

  switch (selectedFocus) {
    case "Momentum Builder":
      currentActivities = focusedState.activities.momentumBuilder;
      break;
    case "Light Focus":
      currentActivities = focusedState.activities.lightFocus;
      break;
    case "Deep Focus":
      currentActivities = focusedState.activities.deepFocus;
      break;
  }

  return (
    <div>
      {!selectedActivity && (
        <>
          <h1>{focusedState.name}</h1>
          <hr />
          <ul className="identity-list">
            {focusedState.identity.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>

          <div className="section-heading">What would you like to do?</div>
          <div className="focus-mode-row">
            <button onClick={() => setSelectedFocus("Momentum Builder")}>Momentum Builder</button>
            <button onClick={() => setSelectedFocus("Light Focus")}>Light Focus</button>
            <button onClick={() => setSelectedFocus("Deep Focus")}>Deep Focus</button>
          </div>

          {selectedFocus && (
            <>
              <div className="section-heading">{selectedFocus}</div>
              <div className="activity-list">
                {currentActivities.map((activity) => (
                  <button
                    key={activity}
                    className="activity-btn"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selectedActivity && (
        <ActivityPage activityName={selectedActivity} />
      )}
    </div>
  );
}
