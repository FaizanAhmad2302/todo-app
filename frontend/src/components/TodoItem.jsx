import React, { useState } from "react";

const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function TodoItem({ todo, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(toDatetimeLocal(todo.dueDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    setIsSubmitting(true);
    await onToggle(todo);
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    const trimmedTitle = editTitle.trim();
    const isoDueDate = editDueDate ? new Date(editDueDate).toISOString() : null;
    const currentIsoDueDate = todo.dueDate
      ? new Date(todo.dueDate).toISOString()
      : null;

    if (!trimmedTitle || !/(\p{L}|\p{N})/u.test(trimmedTitle)) {
      setIsEditing(false);
      setEditTitle(todo.title);
      setEditDueDate(toDatetimeLocal(todo.dueDate));
      return;
    }

    if (trimmedTitle === todo.title && isoDueDate === currentIsoDueDate) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    await onUpdate(todo.todoNumber, {
      title: trimmedTitle,
      dueDate: isoDueDate,
    });
    setIsSubmitting(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleUpdate();
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(todo.title);
      setEditDueDate(toDatetimeLocal(todo.dueDate));
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <div className="todo-checkbox-wrapper">
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          disabled={isSubmitting}
          aria-label={`Mark "${todo.title}" as ${todo.completed ? "incomplete" : "complete"}`}
        />
        <div className="checkbox-custom"></div>
      </div>

      {isEditing ? (
        <div
          className="todo-content"
          style={{ flexDirection: "row", gap: "8px" }}
        >
          <input
            type="text"
            className="edit-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            maxLength={50}
            autoFocus
          />
          <input
            type="datetime-local"
            className="edit-input"
            style={{ width: "auto" }}
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="todo-actions" style={{ opacity: 1 }}>
            <button
              className="btn-primary"
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              Save
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(todo.title);
                setEditDueDate(toDatetimeLocal(todo.dueDate));
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="todo-content">
          <span className="todo-title">{todo.title}</span>
          {todo.dueDate && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              Due: {new Date(todo.dueDate).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="todo-actions">
          <button
            className="icon-btn"
            onClick={() => setIsEditing(true)}
            disabled={isSubmitting}
            aria-label="Edit todo"
            title="Edit"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button
            className="icon-btn delete"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${todo.title}"?`
                )
              ) {
                onDelete(todo.todoNumber);
              }
            }}
            disabled={isSubmitting}
            aria-label="Delete todo"
            title="Delete"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
