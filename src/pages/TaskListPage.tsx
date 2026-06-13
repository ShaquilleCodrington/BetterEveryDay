import TaskCard from "../Components/TaskCard";
import { useState } from "react";
import CreateTaskPopup from "../Components/CreateTaskPopup";

export default function TaskListPage() {
  const [tasks, setTask] = useState([
    {
      id: 1,
      title: "Build TaskCard",
      notes: `Design from sketch\n            Implement accordion\n            Test preview lines\n            Works great`,
      completed: false,
      focus: "Focused",
      priority: "High",
      dueDate: "May 20",
      updatedAt: "2026-05-18",
    },
    {
      id: 2,
      title: "Refactor Layout System",
      notes: `Convert components to modular structure\n            Improve spacing system\n            Clean up styles`,
      completed: true,
      focus: "Deep Work",
      priority: "Medium",
      dueDate: "May 22",
      updatedAt: "2026-05-17",
    },
  ]);

  const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);

  function handleCreateTask(newTask: any) {
    setTask((prev) => [newTask, ...prev]);
    setShowCreateTaskPopup(false);
  }

  return (
    <div>
      <div className="task-list-header">
        <h1>Task List</h1>
        <button onClick={() => setShowCreateTaskPopup(true)}>+ New Task</button>
      </div>

      {showCreateTaskPopup && (
        <CreateTaskPopup
          onCreate={handleCreateTask}
          onClose={() => setShowCreateTaskPopup(false)}
        />
      )}

      <div className="section-heading">All Tasks</div>
      <div>
        {tasks.map((task) => (
          <TaskCard key={task.id} {...task} />
        ))}
      </div>
    </div>
  );
}
