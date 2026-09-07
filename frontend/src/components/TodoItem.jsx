import React, { useState } from "react";
import FolderIcon from "@mui/icons-material/Folder";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";
import HistoryIcon from "@mui/icons-material/History";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";

const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function TodoItem({
  todo,
  categories = [],
  tags = [],
  isTrash = false,
  onToggle,
  onUpdate,
  onDelete,
  onHistory,
  onRestore,
  onPermanentDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(toDatetimeLocal(todo.dueDate));
  const [editPriority, setEditPriority] = useState(todo.priority || "Medium");

  const initialCategoryId =
    typeof todo.categoryId === "object" && todo.categoryId !== null
      ? todo.categoryId._id
      : todo.categoryId || "";
  const [editCategoryId, setEditCategoryId] = useState(initialCategoryId);

  const initialTags = Array.isArray(todo.tags)
    ? todo.tags.map((t) => (typeof t === "object" && t !== null ? t._id : t))
    : [];
  const [editSelectedTags, setEditSelectedTags] = useState(initialTags);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    setIsSubmitting(true);
    await onToggle(todo);
    setIsSubmitting(false);
  };

  const toggleEditTag = (tagId) => {
    setEditSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
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
      setEditPriority(todo.priority || "Medium");
      setEditCategoryId(initialCategoryId);
      setEditSelectedTags(initialTags);
      return;
    }

    setIsSubmitting(true);
    await onUpdate(todo.todoNumber, {
      title: trimmedTitle,
      dueDate: isoDueDate,
      priority: editPriority,
      categoryId: editCategoryId || null,
      tags: editSelectedTags,
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
      setEditPriority(todo.priority || "Medium");
      setEditCategoryId(initialCategoryId);
      setEditSelectedTags(initialTags);
    }
  };

  const isOverdue =
    !todo.completed &&
    todo.dueDate &&
    new Date(todo.dueDate).getTime() < Date.now();

  const categoryName =
    typeof todo.categoryId === "object" && todo.categoryId !== null
      ? todo.categoryId.name
      : categories.find((c) => c._id === todo.categoryId)?.name;

  return (
    <li
      className={`todo-item ${todo.completed ? "completed" : ""} ${isTrash ? "trashed" : ""}`}
    >
      {isTrash ? (
        <div className="todo-checkbox-wrapper" style={{ opacity: 0.6 }}>
          <span style={{ fontSize: "1.1rem" }}>
            <DeleteIcon style={{ fontSize: "1.1rem" }} />
          </span>
        </div>
      ) : (
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
      )}

      {isEditing ? (
        <div
          className="todo-content"
          style={{ flexDirection: "column", gap: "8px" }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="edit-input"
              style={{ flex: 1, minWidth: "160px" }}
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
            <select
              className="edit-input"
              style={{ width: "auto" }}
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select
              className="edit-input"
              style={{ width: "auto" }}
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {tags.map((t) => {
                const isSelected = editSelectedTags.includes(t._id);
                return (
                  <button
                    key={t._id}
                    type="button"
                    className={`tag-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleEditTag(t._id)}
                    style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                  >
                    #{t.name}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="todo-actions"
            style={{ opacity: 1, marginTop: "4px" }}
          >
            <button
              className="btn-primary"
              onClick={handleUpdate}
              disabled={isSubmitting || !editTitle.trim()}
            >
              Save
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(todo.title);
                setEditDueDate(toDatetimeLocal(todo.dueDate));
                setEditPriority(todo.priority || "Medium");
                setEditCategoryId(initialCategoryId);
                setEditSelectedTags(initialTags);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="todo-content">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <span
              className="todo-title"
              style={
                isTrash
                  ? {
                      textDecoration: "line-through",
                      color: "var(--text-muted)",
                    }
                  : {}
              }
            >
              {todo.title}
            </span>

            {todo.priority && (
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 6px",
                  borderRadius: "12px",
                  backgroundColor:
                    todo.priority === "High"
                      ? "var(--accent)"
                      : todo.priority === "Medium"
                        ? "#f59e0b"
                        : "var(--border)",
                  color:
                    todo.priority === "High" || todo.priority === "Medium"
                      ? "white"
                      : "var(--text-muted)",
                }}
              >
                {todo.priority}
              </span>
            )}

            {categoryName && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(99, 102, 241, 0.12)",
                  color: "#6366f1",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                }}
              >
                <FolderIcon /> {categoryName}
              </span>
            )}

            {Array.isArray(todo.tags) &&
              todo.tags.map((t) => {
                const tagName =
                  typeof t === "object" && t !== null
                    ? t.name
                    : tags.find((item) => item._id === t)?.name;
                const tagId = typeof t === "object" && t !== null ? t._id : t;
                if (!tagName) return null;
                return (
                  <span
                    key={tagId}
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(20, 184, 166, 0.12)",
                      color: "#0d9488",
                      border: "1px solid rgba(20, 184, 166, 0.25)",
                    }}
                  >
                    #{tagName}
                  </span>
                );
              })}
          </div>

          {isTrash ? (
            <span
              style={{
                fontSize: "0.75rem",
                color: "#dc2626",
                marginTop: "2px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>
                <DeleteIcon /> Deleted:{" "}
                {todo.deletedAt
                  ? new Date(todo.deletedAt).toLocaleString()
                  : "Recently"}
              </span>
            </span>
          ) : (
            todo.dueDate && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: isOverdue ? "#dc2626" : "var(--text-muted)",
                  marginTop: "2px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: isOverdue ? 600 : 400,
                }}
              >
                {isOverdue && (
                  <span
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      padding: "1px 6px",
                      borderRadius: "6px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Overdue
                  </span>
                )}
                <span>Due: {new Date(todo.dueDate).toLocaleString()}</span>
              </span>
            )
          )}
        </div>
      )}

      {!isEditing && (
        <div className="todo-actions" style={isTrash ? { opacity: 1 } : {}}>
          {isTrash ? (
            <>
              <button
                className="icon-btn restore-btn"
                onClick={() => onRestore && onRestore(todo)}
                disabled={isSubmitting}
                aria-label="Restore task"
                title="Restore Task"
                style={{ color: "#059669" }}
              >
                <RestoreIcon style={{ fontSize: "1.1rem" }} />
              </button>

              <button
                className="icon-btn"
                onClick={() => onHistory && onHistory(todo)}
                disabled={isSubmitting}
                aria-label="View todo history"
                title="History"
              >
                <HistoryIcon style={{ fontSize: "1.1rem" }} />
              </button>

              <button
                className="icon-btn delete"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to PERMANENTLY delete "${todo.title}"? This cannot be undone.`
                    )
                  ) {
                    onPermanentDelete && onPermanentDelete(todo.todoNumber);
                  }
                }}
                disabled={isSubmitting}
                aria-label="Permanently delete todo"
                title="Delete Permanently"
              >
                <DeleteForeverIcon style={{ fontSize: "1.1rem" }} />
              </button>
            </>
          ) : (
            <>
              <button
                className="icon-btn"
                onClick={() => setIsEditing(true)}
                disabled={isSubmitting}
                aria-label="Edit todo"
                title="Edit"
              >
                <EditIcon style={{ fontSize: "1.1rem" }} />
              </button>

              <button
                className="icon-btn"
                onClick={() => onHistory && onHistory(todo)}
                disabled={isSubmitting}
                aria-label="View todo history"
                title="History"
              >
                <HistoryIcon style={{ fontSize: "1.1rem" }} />
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
                <DeleteIcon style={{ fontSize: "1.1rem" }} />
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
