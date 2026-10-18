import type { Task } from "../../Data/tasks";

export type CalendarDate = string;

export type CalendarEvent = {
  id: string;
  taskId: string;
};

export type CalendarMonth = {
  year: number;
  month: number;
};

export type CalendarDay = {
  date: CalendarDate;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const padNumber = (value: number): string => {
  return String(value).padStart(2, "0");
};

export const createCalendarDate = (date: Date): CalendarDate => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;
};

export const parseCalendarDate = (calendarDate: CalendarDate): Date => {
  const [year, month, day] = calendarDate.split("-").map(Number);

  return new Date(year, month - 1, day);
};

export const isValidCalendarDate = (
  calendarDate: string
): calendarDate is CalendarDate => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) {
    return false;
  }

  return createCalendarDate(parseCalendarDate(calendarDate)) === calendarDate;
};

export const getCurrentCalendarMonth = (): CalendarMonth => {
  const currentDate = new Date();

  return {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
  };
};

export const changeCalendarMonth = (
  calendarMonth: CalendarMonth,
  monthChange: number
): CalendarMonth => {
  const changedDate = new Date(
    calendarMonth.year,
    calendarMonth.month + monthChange,
    1
  );

  return {
    year: changedDate.getFullYear(),
    month: changedDate.getMonth(),
  };
};

export const getCalendarMonthDays = (
  calendarMonth: CalendarMonth,
  weekStartsOn = 0
): CalendarDay[] => {
  const firstDayOfMonth = new Date(
    calendarMonth.year,
    calendarMonth.month,
    1
  );

  const firstDayOffset =
    (firstDayOfMonth.getDay() - weekStartsOn + 7) % 7;

  const todayDate = createCalendarDate(new Date());

  return Array.from({ length: 42 }, (_, calendarDayIndex) => {
    const calendarDate = new Date(
      calendarMonth.year,
      calendarMonth.month,
      1 - firstDayOffset + calendarDayIndex
    );

    const calendarDateKey = createCalendarDate(calendarDate);

    return {
      date: calendarDateKey,
      dayNumber: calendarDate.getDate(),
      isCurrentMonth: calendarDate.getMonth() === calendarMonth.month,
      isToday: calendarDateKey === todayDate,
    };
  });
};

export const createCalendarEvent = (
  task: Task
): CalendarEvent | null => {
  if (!task.dueDate || !isValidCalendarDate(task.dueDate)) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    taskId: task.id,
  };
};

export const createCalendarEventsFromTasks = (
  tasks: Task[],
  existingEvents: CalendarEvent[]
): CalendarEvent[] => {
  const existingTaskIds = new Set(
    existingEvents.map((calendarEvent) => calendarEvent.taskId)
  );

  const newCalendarEvents = tasks
    .filter((task) => !existingTaskIds.has(task.id))
    .map(createCalendarEvent)
    .filter(
      (calendarEvent): calendarEvent is CalendarEvent =>
        calendarEvent !== null
    );

  if (newCalendarEvents.length === 0) {
    return existingEvents;
  }

  return [...existingEvents, ...newCalendarEvents];
};

// 2026-10-18 — Calendar shows a task on its lifecycle dates, derived from the
// task itself (created + working date, or created + completed date)
const toLocalCalendarDate = (isoString: string): CalendarDate | null => {
  const parsedDate = new Date(isoString);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return createCalendarDate(parsedDate);
};

const getTaskCalendarDates = (task: Task): CalendarDate[] => {
  const taskDates = new Set<CalendarDate>();

  const createdDate = task.createdAt
    ? toLocalCalendarDate(task.createdAt)
    : null;

  if (createdDate) {
    taskDates.add(createdDate);
  }

  if (task.completed) {
    const completedDate = task.completedAt
      ? toLocalCalendarDate(task.completedAt)
      : null;

    if (completedDate) {
      taskDates.add(completedDate);
    }
  } else if (isValidCalendarDate(task.dueDate)) {
    taskDates.add(task.dueDate);
  }

  return [...taskDates];
};



export const groupCalendarEventsByDate = (
  calendarEvents: CalendarEvent[],
  tasks: Task[]
): Map<CalendarDate, CalendarEvent[]> => {
  const eventsByDate = new Map<CalendarDate, CalendarEvent[]>();

   const tasksById = new Map<string, Task>(
    tasks.map((task) => [task.id, task])
  );


 calendarEvents.forEach((calendarEvent) => {
    const task = tasksById.get(calendarEvent.taskId);

    if (!task) {
      return;
    }

    getTaskCalendarDates(task).forEach((taskDate) => {
      const dateEvents = eventsByDate.get(taskDate);

      if (dateEvents) {
        dateEvents.push(calendarEvent);
        return;
      }

      eventsByDate.set(taskDate, [calendarEvent]);
    });
  });

  return eventsByDate;
};

// 2026-10-18 — Which kind of day a task chip is sitting on (drives its color)
export type CalendarDateKind = "created" | "working" | "completed";

export const getTaskDateKind = (
  task: Task,
  calendarDate: CalendarDate
): CalendarDateKind => {
  const completedDate =
    task.completed && task.completedAt
      ? toLocalCalendarDate(task.completedAt)
      : null;

  if (completedDate === calendarDate) {
    return "completed";
  }

  const createdDate = task.createdAt
    ? toLocalCalendarDate(task.createdAt)
    : null;

  if (createdDate === calendarDate) {
    return "created";
  }

  return "working";
};