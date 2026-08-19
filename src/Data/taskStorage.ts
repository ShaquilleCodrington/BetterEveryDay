// ======================================================
// taskStorage.ts
// ------------------------------------------------------
// Central location for reading and writing task data.
//
// Every page (Focus, Planning, Recharge, Congruence,
// Dashboard, Task List) should use these functions
// instead of calling localStorage directly.
// ======================================================
import { sortTasksByDueDate } from "./taskSorting";
import type { Task } from "./tasks";

{/* Storage Key */}
const STORAGE_KEY = "tasks";

//Repairs older Tasks so every Task has an explicit
//userId field.
export function repairTask(task: Task): Task {
    return {
        ...task,
        userId: task.userId ?? null,
    };
}

{/* Loads Tasks from localStorage */}
export function loadTasks(): Task[] {

    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) {
        return [];
    }

    const tasks: Task[] = JSON.parse(savedTasks);
// ==================================================
    // 2026-08-18 — State Convergence
    // --------------------------------------------------
    // Repair existing Tasks so older localStorage data
    // receives the new userId field.
    //
    // This keeps the Task model backward compatible:
    // older Tasks become userId: null instead of being
    // treated as invalid or requiring migration.
    // ==================================================

    const seenIds = new Set<string>();
    let needsRepair = false;

    const repairedTasks = tasks.map((task) => {

        let repairedTask = task;

        // ----------------------------------------------
        // Repair missing or duplicate Task IDs
        // ----------------------------------------------

        if (!task.id || seenIds.has(task.id)) {
            needsRepair = true;

            repairedTask = {
                ...repairedTask,
                id: crypto.randomUUID(),
            };
        }

        seenIds.add(repairedTask.id);

        // ----------------------------------------------
        // Repair missing userId
        // ----------------------------------------------

        if (repairedTask.userId === undefined) {
            needsRepair = true;

            repairedTask = repairTask(repairedTask);
        }

        return repairedTask;
    });


    // ==================================================
    // Persist repairs immediately.
    //
    // This means once an older Task is loaded, the
    // local copy is upgraded and future reads already
    // contain userId.
    // ==================================================

    if (needsRepair) {
        saveTasks(repairedTasks);
    }

    return repairedTasks;
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

export function deleteTask(taskId: string): void
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

///helper functions

//get mood specfic task
export function getTasksByMood(mood: string): Task[]
{
    return loadTasks().filter(task => task.mood === mood);
}

//get number of mood specfic task
export function getTaskCountByMood( mood: string ): number
{
    return getTasksByMood(mood).length;
}

/**
 * Returns a new array sorted by due date.
 * Tasks without a due date are placed at the end.
 */




/**
 * Returns the top N upcoming tasks sorted by due date.
 * Defaults to the first task.
 */

export function getUpcomingTasks(
    task: Task[],
    count: number = 1,
    includeCompleted: boolean = false
): Task[] {

    const filtered = 
        includeCompleted ? task : task.filter(task => !task.completed);

        return sortTasksByDueDate(filtered).slice(0, count);
}

/**
 * Returns the title of the next upcoming task.
 * Returns a default message if no tasks exist.
 */

export function getUpcomingTaskTitle(
    task: Task[],
    ): string
    {
        const nextTask =  getUpcomingTasks(task,)[0];
        return nextTask ? nextTask.title : "No Upcomming Task";

    }


