import type { ChecklistItem } from "../Components/Checklist";
import {
  createCalendarDate,
  isValidCalendarDate,
} from "../Features/Calendar/calendar";

export type Task = {

    id: string;
    userId: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    
    title: string;
    notes: string;
    completed: boolean;
    mood: string;
    status: string;
    priority: string;
    dueDate: string;
    checklist: ChecklistItem[];
};


// 2026-10-18 — Task lifecycle: completion, reopening, carry-forward, backfill

// Complete only when there is at least one filled-in item and all of them
// are checked. Zero items (or only blank rows) is never complete.
export const isChecklistComplete = (checklist: ChecklistItem[]): boolean => {
  const filledItems = checklist.filter((item) => item.text.trim() !== "");

  return filledItems.length > 0 && filledItems.every((item) => item.checked);
};

// Call from the checklist change handler instead of only replacing the
// checklist. It acts only when the checklist flips between complete and
// not complete, so a manual "Completed" is left alone otherwise.
export const applyChecklistChange = (
  task: Task,
  checklist: ChecklistItem[]
): Task => {
  const wasComplete = isChecklistComplete(task.checklist);
  const isComplete = isChecklistComplete(checklist);
  const now = new Date().toISOString();

  if (!wasComplete && isComplete && !task.completed) {
    return {
      ...task,
      checklist,
      completed: true,
      status: "Completed",
      completedAt: now,
      updatedAt: now,
    };
  }

  if (wasComplete && !isComplete && task.completed) {
    return {
      ...task,
      checklist,
      completed: false,
      status: "In Progress",
      completedAt: null,
      updatedAt: now,
    };
  }

  return { ...task, checklist, updatedAt: now };
};

// Safe to run any number of times: returns the same object when nothing
// needs to change. Does not touch updatedAt, so a silent date move can't
// override a real edit.
export const carryTaskForward = (
  task: Task,
  today: string = createCalendarDate(new Date())
): Task => {
  if (task.completed) {
    return task;
  }

  if (!isValidCalendarDate(task.dueDate)) {
    return { ...task, dueDate: today };
  }

  if (task.dueDate >= today) {
    return task;
  }

  return { ...task, dueDate: today, status: "Past Due" };
};

// Older tasks may lack createdAt / completedAt. No reliable history exists,
// so createdAt becomes now and completedAt becomes null.
export const backfillTask = (task: Task): Task => {
  if (task.createdAt && task.completedAt !== undefined) {
    return task;
  }

  return {
    ...task,
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt ?? null,
  };
};

// Run this wherever tasks are loaded: after local load and after cloud
// merge. It returns the same array if nothing changed, so you can skip setTasks.
export const refreshTaskLifecycle = (tasks: Task[]): Task[] => {
  const refreshedTasks = tasks.map((task) =>
    carryTaskForward(backfillTask(task))
  );

  return refreshedTasks.some((task, index) => task !== tasks[index])
    ? refreshedTasks
    : tasks;
};

// 2026-10-18 — The single shared task owner (MainLayout) hands this to every page
export type TaskOutletContext = {
  tasks: Task[];
  onCreateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onChecklistChange: (taskId: string, items: ChecklistItem[]) => void;
};