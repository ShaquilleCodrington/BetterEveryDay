import DashboardAccordion from "../Components/DashboardAccordion";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <hr />
      <div className="section-heading">Overview</div>
      <div className="dashboard-grid">
        <DashboardAccordion
          title="Congruence"
          preview="Match your tasks to your mood."
          expandedView={[
            "Current mood: Focused",
            "3 matching tasks available",
            "Last check-in: Today",
          ]}
          pagePath="/congruence"
        />
        <DashboardAccordion
          title="Task List"
          preview="View and manage your tasks."
          expandedView={[
            "Current Task: Build TaskCard",
            "Notes: Design from sketch",
            "Implement accordion",
            "Journal Progress",
          ]}
          pagePath="/task"
        />
      </div>
      <hr />
    </div>
  );
}
