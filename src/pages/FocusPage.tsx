//Imports
import { useEffect, useState } from "react";
import TaskCard from "../Components/TaskCard";
import type { Task } from "../Data/tasks";
import type { ChecklistItem } from "../Components/Checklist";
import EditTaskPopup from "../Components/EditTaskPopup";
import {addTask, deleteTask, updateTask, getTasksByMood } from "../Data/taskStorage";
import CreateTaskPopup from "../Components/CreateTaskPopup";

//This is where:components state rendering buttons activities will live.

export default function FocusPage() {


  
  const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);
  const [focusedTasks, setFocusedTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ======================================================
  // Load Focused Tasks
  // ======================================================

  useEffect(() => {
    refreshTasks();
  }, []);

  function refreshTasks() {
  setFocusedTasks(getTasksByMood("Focused"));
}


  function handleEditTask(updatedTask: Task) {
  updateTask(updatedTask);
  refreshTasks();
}

    function handleDeleteTask(taskId: string) {

  deleteTask(taskId);
  refreshTasks();
}

function handleCreateTask(newTask: Task) {
    addTask(newTask);
    refreshTasks();
    setShowCreateTaskPopup(false);
}

function handleChecklistChange(taskId: string, items: ChecklistItem[]) {
  const targetTask = focusedTasks.find((task) => task.id === taskId);

  if (!targetTask) {
    return;
  }

  const updatedTask: Task = {
    ...targetTask,
    checklist: items,
  };

  updateTask(updatedTask);
  refreshTasks();
}

  //rendering
  return ( <div>
      <h1>Focus Page</h1>

      <p>
        This is where we concentrate on the work in front of us
        and execute with intention.
      </p>

      <hr />

      <h2>Focused Tasks</h2>

      <button onClick={() => setShowCreateTaskPopup(true)}>
        + Create New Task
      </button>

      {showCreateTaskPopup && (
        <CreateTaskPopup
          onCreate={handleCreateTask}
          onClose={() => setShowCreateTaskPopup(false)}
        />
      )}

      {/* Show focused tasks */}
      {focusedTasks.length === 0 ? (
        <p>No Focused Task Available.</p>
      ) : (
        focusedTasks.map((task) => (
          <TaskCard
            key={task.id}
            {...task}
            onEdit={() => setEditingTask(task)}
            onDelete={() => handleDeleteTask(task.id)}
            onChecklistChange={(items) =>
              handleChecklistChange(task.id, items)
            }
          />
        ))
      )}

      {editingTask && (
        <EditTaskPopup
          task={editingTask}
          onSave={(updatedTask) => {
            handleEditTask(updatedTask);
            setEditingTask(null);
          }}
          onClose={() => {
            setEditingTask(null);
            refreshTasks();
          }}
        />
      )}
    </div>
  );
}