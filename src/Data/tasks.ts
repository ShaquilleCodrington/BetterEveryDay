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

// 2026-11-05 — A task counts as done if ANY of the three signals says so:
// the completed flag, the "Completed" status, or an all-checked checklist.
// This keeps old/stale data (flag and status disagreeing) from letting a
// finished task keep moving forward.
export const isTaskDone = (task: Task): boolean =>
  task.completed ||
  task.status === "Completed" ||
  isChecklistComplete(task.checklist);

// 2026-11-05 — Completion date rules, in one place.
// A completion date that is already set (assigned manually) wins; otherwise
// it is now. The due date is anchored to that completion date, which is
// today for a normal completion.
const getCompletionStamp = (
  task: Task,
  today: string
): { completedAt: string; dueDate: string } => {
  if (task.completedAt) {
    return {
      completedAt: task.completedAt,
      dueDate: createCalendarDate(new Date(task.completedAt)),
    };
  }

  return { completedAt: new Date().toISOString(), dueDate: today };
};

// 2026-11-05 — Brings a done task into one consistent state:
// completed = true, status = "Completed", completedAt set, dueDate anchored.
// A task that is already fully settled is returned untouched, so a
// completed task's due date is never moved again on later runs.
// Also export-ready for the Edit Task save handler: call it when status
// is set to "Completed" so the due date becomes today at that moment.
export const settleCompletedTask = (
  task: Task,
  today: string = createCalendarDate(new Date())
): Task => {
  if (task.completed && task.status === "Completed") {
    return task;
  }

  // Already marked completed (older data) but status is stale: fix the
  // status only. Its due date and completion date are left exactly as is.
  if (task.completed) {
    return { ...task, status: "Completed" };
  }

  // Newly completed (status set to Completed, or checklist all checked).
  const stamp = getCompletionStamp(task, today);

  return {
    ...task,
    completed: true,
    status: "Completed",
    completedAt: stamp.completedAt,
    dueDate: stamp.dueDate,
  };
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
    // 2026-11-05 — All items checked: complete the task, set the due date
    // to today (or the manually assigned completion date), stop moving.
    const stamp = getCompletionStamp(task, createCalendarDate(new Date()));

    return {
      ...task,
      checklist,
      completed: true,
      status: "Completed",
      completedAt: stamp.completedAt,
      dueDate: stamp.dueDate,
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

  // 2026-11-05 — Done tasks never move forward, whatever stale state they
  // carry. Settle them once (due date = completion date), then leave them.
  if (isTaskDone(task)) {
    return settleCompletedTask(task, today);
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