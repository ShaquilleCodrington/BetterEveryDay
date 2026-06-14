// ======================================================
// taskStorage.ts
// ------------------------------------------------------
// Central location for reading and writing task data.
//
// Every page (Focus, Planning, Recharge, Congruence,
// Dashboard, Task List) should use these functions
// instead of calling localStorage directly.
// ======================================================

import type { Task } from "./tasks";

{/* Storage Key */}
const STORAGE_KEY = "tasks";

{/* Loads Tasks from localStorage */}
export function loadTasks(): Task[] {

    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) {
        return [];
    }
    return JSON.parse(savedTasks);
}


{/* Saves task */}

export function saveTasks(tasks: Task[]): void 
{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}


{/* // Loads the current tasks,
// appends the new task,
// then saves everything.*/}

export function addTask(newTask: Task): void
{
    const tasks = loadTasks();
    tasks.push(newTask);
    saveTasks(tasks);
}

{/* / Update Task
// ------------------------------------------------------
// Finds a task by ID and replaces it.*/}

export function updateTask(updatedTask: Task): void
{
    const tasks = loadTasks();

    const updatedTasks = tasks.map( 
               task => task.id === updatedTask.id ? updatedTask : task
    );

    saveTasks(updatedTasks);
}

{/* Delete Task
// ------------------------------------------------------
// Removes a task by ID.*/}

export function deleteTask(taskId: number): void
{
    const tasks = loadTasks();

    const updatedTasks = tasks.filter(task => task.id !== taskId);

    saveTasks(updatedTasks);
}

{/* Clear All Tasks */}

export function clearTasks(): void
{
    localStorage.removeItem(STORAGE_KEY);
}
