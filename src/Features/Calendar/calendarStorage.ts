import type { CalendarEvent } from "./calendar";

const CALENDAR_STORAGE_KEY = "bettereveryday-calendar";

export const loadCalendarEvents = (): CalendarEvent[] => {
  const storedCalendar = localStorage.getItem(CALENDAR_STORAGE_KEY);

  if (!storedCalendar) {
    return [];
  }

  try {
    const parsedCalendar = JSON.parse(storedCalendar);

    if (!Array.isArray(parsedCalendar)) {
      return [];
    }

    return parsedCalendar;
  } catch {
    return [];
  }
};

export const saveCalendarEvents = (
  calendarEvents: CalendarEvent[]
): void => {
  localStorage.setItem(
    CALENDAR_STORAGE_KEY,
    JSON.stringify(calendarEvents)
  );
};