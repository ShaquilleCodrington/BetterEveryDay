import { useMemo, useState } from "react";
import type { Task } from "../Data/tasks";
import type { ChecklistItem } from "../Components/Checklist";
import TaskCard from "../Components/TaskCard";
import EditTaskPopup from "../Components/EditTaskPopup";
import {
  changeCalendarMonth,
  getCalendarMonthDays,
  getCurrentCalendarMonth,
  groupCalendarEventsByDate,
  parseCalendarDate,
} from "../Features/Calendar/calendar";
import type {
  CalendarDate,
  CalendarEvent,
  CalendarMonth,
} from "../Features/Calendar/calendar";

type CalendarPageProps = {
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onChecklistChange: (
    taskId: string,
    items: ChecklistItem[]
  ) => void;
};

const MAX_VISIBLE_EVENTS = 3;

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export default function CalendarPage({
  tasks,
  calendarEvents,
  onDeleteTask,
  onEditTask,
  onChecklistChange,
}: CalendarPageProps) {
  const [calendarMonth, setCalendarMonth] =
    useState<CalendarMonth>(getCurrentCalendarMonth);

  const [selectedDate, setSelectedDate] =
    useState<CalendarDate | null>(null);

  const [editingTask, setEditingTask] =
    useState<Task | null>(null);

  const calendarDays = useMemo(
    () => getCalendarMonthDays(calendarMonth),
    [calendarMonth]
  );

  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  // Events whose task no longer exists are dropped here, once, so the
  // badge count, the chips, and the selected-day list always agree.
  const eventsByDate = useMemo(
    () =>
      groupCalendarEventsByDate(
        calendarEvents.filter((calendarEvent) =>
          tasksById.has(calendarEvent.taskId)
        ),
        tasks
      ),
    [calendarEvents, tasks, tasksById]
  );

  const selectedEvents = selectedDate
    ? eventsByDate.get(selectedDate) ?? []
    : [];

  const handlePreviousMonth = () => {
    setCalendarMonth((currentMonth) =>
      changeCalendarMonth(currentMonth, -1)
    );
  };

  const handleNextMonth = () => {
    setCalendarMonth((currentMonth) =>
      changeCalendarMonth(currentMonth, 1)
    );
  };

  const handleToday = () => {
    setCalendarMonth(getCurrentCalendarMonth());
  };

  return (
    <section className="calendar-page">
      <div className="calendar-page__header">
        <button onClick={handlePreviousMonth}>Previous</button>

        <h1>
          {new Date(
            calendarMonth.year,
            calendarMonth.month,
            1
          ).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h1>

        <button onClick={handleNextMonth}>Next</button>
        <button onClick={handleToday}>Today</button>
      </div>

      <div className="calendar-page__weekdays">
        {WEEKDAY_LABELS.map((weekdayLabel) => (
          <div key={weekdayLabel}>{weekdayLabel}</div>
        ))}
      </div>

      <div className="calendar-page__grid">
        {calendarDays.map((calendarDay) => {
          const dateEvents =
            eventsByDate.get(calendarDay.date) ?? [];

          const visibleEvents = dateEvents.slice(
            0,
            MAX_VISIBLE_EVENTS
          );

          const hiddenEventCount =
            dateEvents.length - visibleEvents.length;

          const isSelected =
            calendarDay.date === selectedDate;

          const dayClassName = [
            "calendar-page__day",
            !calendarDay.isCurrentMonth &&
              "calendar-page__day--outside",
            calendarDay.isToday &&
              "calendar-page__day--today",
            isSelected &&
              "calendar-page__day--selected",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            // A div, not a button: it contains buttons, and buttons can't nest.
            <div
              key={calendarDay.date}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={dayClassName}
              onClick={() =>
                setSelectedDate(calendarDay.date)
              }
              onKeyDown={(event) => {
                // Ignore keys pressed on a title chip inside the day.
                if (event.target !== event.currentTarget) {
                  return;
                }

                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  setSelectedDate(calendarDay.date);
                }
              }}
            >
              <span className="calendar-page__day-number">
                {calendarDay.dayNumber}
              </span>

              {dateEvents.length > 0 && (
                <span className="calendar-page__day-count">
                  {dateEvents.length}
                </span>
              )}

              {dateEvents.length > 0 && (
                <div className="calendar-page__day-events">
                  {visibleEvents.map((calendarEvent) => {
                    const task = tasksById.get(
                      calendarEvent.taskId
                    );

                    if (!task) {
                      return null;
                    }

                    return (
                      <span
                        key={calendarEvent.id}
                        className="calendar-page__event"
                      >
                        {task.title}
                      </span>
                    );
                  })}

                  {hiddenEventCount > 0 && (
                    <span className="calendar-page__more">
                      +{hiddenEventCount} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="calendar-page__selected-date">
          <h2>
            {parseCalendarDate(
              selectedDate
            ).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>

          {selectedEvents.length === 0 ? (
            <p>No tasks on this day.</p>
          ) : (
            selectedEvents.map((calendarEvent) => {
              const task = tasksById.get(
                calendarEvent.taskId
              );

              if (!task) {
                return null;
              }

              return (
                <TaskCard
                  key={task.id}
                  {...task}
                  onDelete={() =>
                    onDeleteTask(task.id)
                  }
                  onEdit={() =>
                    setEditingTask(task)
                  }
                  onChecklistChange={(items) =>
                    onChecklistChange(
                      task.id,
                      items
                    )
                  }
                />
              );
            })
          )}
        </div>
      )}

      {editingTask && (
        <EditTaskPopup
          task={editingTask}
          onSave={(updatedTask) => {
            onEditTask(updatedTask);
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </section>
  );
}