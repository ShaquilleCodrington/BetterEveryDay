import TaskCard from "../Components/TaskCard";
import { useState } from "react";
import CreateTaskPopup from "../Components/CreateTaskPopup";
import EditTaskPopup from "../Components/EditTaskPopup";
import SortControl from "../Components/SortControl";
import type { SortDirection } from "../Components/SortControl";
import { useOutletContext } from "react-router-dom";
import type { Task, TaskOutletContext } from "../Data/tasks";
import
{
    sortTasksByTitle,
    sortTasksByDueDate,
    sortTasksByPriority,
    sortTasksByStatus,
    sortTasksByCompleted,
}
from "../Data/taskSorting";

export default function TaskListPage() {

    // 2026-10-18 — Backfill createdAt and carry incomplete tasks forward on load
    // 2026-10-18 — Tasks come from the shared owner (MainLayout);
  // this page keeps only its own UI state
  const {
    tasks,
    onCreateTask,
    onEditTask,
    onDeleteTask,
    onChecklistChange,
  } = useOutletContext<TaskOutletContext>();

  const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sortField, setSortField] =
    useState("dueDate");

  const [sortDirection, setSortDirection] =
      useState<SortDirection>("asc");

  const sortFieldOptions =
  [
      { value: "title", label: "Title" },
      { value: "dueDate", label: "Due Date" },
      { value: "priority", label: "Priority" },
      { value: "status", label: "Status" },
      { value: "completed", label: "Completed" },
  ];

  function getSortedTasks()
  {
      switch (sortField)
      {
          case "title":
              return sortTasksByTitle(tasks, sortDirection);

          case "priority":
              return sortTasksByPriority(tasks, sortDirection);

          case "status":
              return sortTasksByStatus(tasks, sortDirection);

          case "completed":
              return sortTasksByCompleted(tasks, sortDirection);

          case "dueDate":
          default:
              return sortTasksByDueDate(tasks, sortDirection);
      }
  }

  const sortedTasks =
      getSortedTasks();

    function handleCreateTask(newTask: Task) {
    onCreateTask(newTask);
    setShowCreateTaskPopup(false);
  }

  function handleEditTask(updated: Task) {
    onEditTask(updated);
    setEditingTask(null);
  }


  return (
    <div>
      <div className="task-list-header">
    <h1>Task List</h1>

    <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setShowCreateTaskPopup(true)}>
          + Create New Task</button>

        <SortControl
            fields={sortFieldOptions}
            currentField={sortField}
            currentDirection={sortDirection}
            onChange={(field, direction) =>
            {
                setSortField(field);
                setSortDirection(direction);
            }}
        />
    </div>
</div>

      {showCreateTaskPopup &&
        <CreateTaskPopup onCreate={handleCreateTask}
          onClose={() => setShowCreateTaskPopup(false)} />
      }

      {editingTask &&
        <EditTaskPopup
          task={editingTask}
          onSave={handleEditTask}
          onClose={() => setEditingTask(null)}
        />
      }

      <div className="section-heading">All Tasks</div>
      <div>
        {sortedTasks.map((task) =>
          <TaskCard key={task.id}
            {...task}
            onDelete={() => onDeleteTask(task.id)}
            onEdit={() => setEditingTask(task)}
            onChecklistChange={(items) =>
              onChecklistChange(task.id, items)}
          />
        )}
      </div>
    </div>
  );
}
