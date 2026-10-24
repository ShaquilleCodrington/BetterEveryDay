import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import CheckList from "./Checklist";
import type { ChecklistItem } from "./Checklist";

// ── Field order (shared by every task card) ─────────────────────────────
// One order for all cards, saved on this computer. Lives in this file so
// there are no extra store/editor files to maintain.

type TaskCardField = "dueDate" | "title" | "status" | "mood" | "priority";

const FIELD_LABELS: Record<TaskCardField, string> = {
  dueDate: "Due",
  title: "Title",
  status: "Status",
  mood: "Mood",
  priority: "Priority",
};

const DEFAULT_FIELD_ORDER: TaskCardField[] = [
  "dueDate",
  "title",
  "status",
  "mood",
  "priority",
];

const FIELD_ORDER_STORAGE_KEY = "taskCardFieldOrder";

// Only accept a saved order that contains every field exactly once;
// anything else falls back to the default.
function loadFieldOrder(): TaskCardField[] {
  try {
    const raw = localStorage.getItem(FIELD_ORDER_STORAGE_KEY);
    if (!raw) return DEFAULT_FIELD_ORDER;

    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_FIELD_ORDER.length &&
      DEFAULT_FIELD_ORDER.every((field) => parsed.includes(field))
    ) {
      return parsed as TaskCardField[];
    }
  } catch {
    // ignore and use the default
  }
  return DEFAULT_FIELD_ORDER;
}

let currentFieldOrder: TaskCardField[] = loadFieldOrder();
const fieldOrderListeners = new Set<() => void>();

function subscribeToFieldOrder(listener: () => void) {
  fieldOrderListeners.add(listener);
  return () => {
    fieldOrderListeners.delete(listener);
  };
}

function getFieldOrderSnapshot() {
  return currentFieldOrder;
}

function moveField(field: TaskCardField, direction: -1 | 1) {
  const index = currentFieldOrder.indexOf(field);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= currentFieldOrder.length) return;

  const next = [...currentFieldOrder];
  [next[index], next[target]] = [next[target], next[index]];
  currentFieldOrder = next;

  try {
    localStorage.setItem(FIELD_ORDER_STORAGE_KEY, JSON.stringify(currentFieldOrder));
  } catch {
    // saving failed; the order still applies until the app closes
  }

  fieldOrderListeners.forEach((listener) => listener());
}

// Up/down buttons shown inside the open accordion.
function FieldOrderEditor({ order }: { order: TaskCardField[] }) {
  return (
    <div style={{ marginTop: "10px" }}>
      <strong>Card field order</strong>
      {order.map((field, index) => (
        <div
          key={field}
          style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}
        >
          <span style={{ minWidth: "90px" }}>
            {index + 1}. {FIELD_LABELS[field]}
          </span>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => moveField(field, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === order.length - 1}
            onClick={() => moveField(field, 1)}
          >
            ↓
          </button>
        </div>
      ))}
    </div>
  );
}

type TaskCardProps = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  mood: string;
  priority: string;
  dueDate: string;
  updatedAt: string;

  checklist: ChecklistItem[];
  onChecklistChange: (items: ChecklistItem[]) => void;

  onDelete: () => void;
  onEdit: () => void;
};

export default function TaskCard({
  title,
  notes,
  completed,
  mood,
  priority,
  dueDate,
  updatedAt,
  checklist,
  onChecklistChange,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldOrder = useSyncExternalStore(subscribeToFieldOrder, getFieldOrderSnapshot);
  const lines = notes.split("\n");

  // Every header chip, keyed by field. The saved order decides which
  // one renders first.
  const chips: Record<TaskCardField, ReactNode> = {
    dueDate: (
      <span key="dueDate" className="task-chip">
        <strong>Due</strong> {dueDate}
      </span>
    ),
    title: (
      <span key="title" className="task-chip">
        <strong>Title</strong> {title}
      </span>
    ),
    status: (
      <span
        key="status"
        className={`task-chip ${completed ? "task-status-done" : "task-status-active"}`}
      >
        <strong>Status</strong> {completed ? "Done" : "Active"}
      </span>
    ),
    mood: (
      <span key="mood" className="task-chip">
        <strong>Mood</strong> {mood}
      </span>
    ),
    priority: (
      <span key="priority" className="task-chip">
        <strong>Priority</strong> {priority}
      </span>
    ),
  };

  return (
    <div className="glass-panel task-card">
      <div
        className="task-card-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        {fieldOrder.map((field) => chips[field])}
      </div>

      <div
        onClick={(event) => event.stopPropagation()}
        style={{ marginTop: "10px" }}
      >
        <CheckList
          items={checklist}
          onItemsChange={onChecklistChange}
        />
      </div>

      {isOpen && (
        <>
          {lines.map((line, index) => (
            <p key={index} className="task-note-line">{line}</p>
          ))}

          <div className="task-updated">
            Updated: {updatedAt}
            <button onClick={onEdit} style={{ marginLeft: "10px" }}>Edit Task</button>
            <button onClick={onDelete} style={{ marginLeft: "8px" }}>Delete Task</button>
          </div>

          <FieldOrderEditor order={fieldOrder} />
        </>
      )}
    </div>
  );
}