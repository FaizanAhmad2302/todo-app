import React, { useEffect, useState } from "react";
import { getTodoHistory, getAdminTodoHistory } from "../services/todoApi";

export function TodoHistoryModal({ todo, onClose, isAdmin = false }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const fetchFn = isAdmin ? getAdminTodoHistory : getTodoHistory;
        const data = await fetchFn(todo.todoNumber);

        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load task history");
      } finally {
        setIsLoading(false);
      }
    };

    if (todo?.todoNumber) {
      loadHistory();
    }
  }, [todo, isAdmin]);

  const formatDate = (date) => {
    if (!date) return "Unknown date";
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "Unknown date";
    return parsedDate.toLocaleString();
  };

  const formatDueDate = (date) => {
    if (!date) return "None";
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "None";
    return parsedDate.toLocaleString();
  };

  const getActionConfig = (action) => {
    switch (action) {
      case "CREATED":
        return { label: "Created", className: "created", icon: "🌱" };
      case "UPDATED":
        return { label: "Updated", className: "updated", icon: "✏️" };
      case "COMPLETED":
        return { label: "Completed", className: "completed", icon: "✅" };
      case "UNCOMPLETED":
        return {
          label: "Marked Incomplete",
          className: "uncompleted",
          icon: "🔄",
        };
      case "DELETED":
        return { label: "Deleted", className: "deleted", icon: "🗑️" };
      default:
        return { label: action || "Updated", className: "updated", icon: "📝" };
    }
  };

  const formatFieldName = (key) => {
    switch (key) {
      case "title":
        return "Title";
      case "priority":
        return "Priority";
      case "dueDate":
        return "Due Date";
      case "completed":
        return "Status";
      case "categoryId":
        return "Category";
      case "tags":
        return "Tags";
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  };

  const formatFieldValue = (key, val) => {
    if (val === null || val === undefined || val === "") return "None";
    if (key === "dueDate") return formatDueDate(val);
    if (key === "completed") return val ? "Completed" : "Incomplete";
    if (key === "tags") {
      if (Array.isArray(val)) {
        return val.length > 0 ? `${val.length} tags` : "None";
      }
      return String(val);
    }
    return String(val);
  };

  const renderChanges = (item) => {
    if (!item.changes || typeof item.changes !== "object") return null;

    if (item.action === "UPDATED") {
      const keys = Object.keys(item.changes);
      if (keys.length === 0) return null;

      return (
        <div className="diff-list">
          {keys.map((key) => {
            const diff = item.changes[key];
            if (!diff || typeof diff !== "object") return null;
            const fromVal = formatFieldValue(key, diff.from);
            const toVal = formatFieldValue(key, diff.to);

            return (
              <div key={key} className="diff-row">
                <span className="diff-field-name">{formatFieldName(key)}:</span>
                <span className="diff-val-from">{fromVal}</span>
                <span className="diff-arrow">➔</span>
                <span className="diff-val-to">{toVal}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (item.action === "CREATED") {
      return (
        <div className="diff-list">
          <div className="diff-row">
            <span className="diff-field-name">Title:</span>
            <span className="diff-val-to">
              {item.changes.title || todo.title}
            </span>
          </div>
          {item.changes.priority && (
            <div className="diff-row">
              <span className="diff-field-name">Priority:</span>
              <span className="diff-val-to">{item.changes.priority}</span>
            </div>
          )}
          {item.changes.dueDate && (
            <div className="diff-row">
              <span className="diff-field-name">Due Date:</span>
              <span className="diff-val-to">
                {formatDueDate(item.changes.dueDate)}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (item.action === "DELETED") {
      return (
        <div className="diff-list">
          <div className="diff-row">
            <span className="diff-field-name">Final Title:</span>
            <span className="diff-val-from">{item.changes.title || "—"}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Todo history"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "12px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.35rem",
                color: "var(--text-main)",
              }}
            >
              Task Activity History
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Task #{todo?.todoNumber}:{" "}
              <strong style={{ color: "var(--text-main)" }}>
                {todo?.title}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close history"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <p>Loading activity history...</p>
          </div>
        )}

        {!isLoading && error && (
          <div
            className="empty-state"
            style={{ color: "#ef4444", padding: "24px 0" }}
          >
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && history.length === 0 && (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <p>No activity logs recorded for this task yet.</p>
          </div>
        )}

        {!isLoading && !error && history.length > 0 && (
          <div className="history-timeline">
            {history.map((item, index) => {
              const actionCfg = getActionConfig(item.action);
              const actor = item.performedBy;
              const actorName = actor?.name || actor?.email || "User";
              const isAdminActor = actor?.role === "admin";

              return (
                <div key={item._id || index} className="history-item">
                  <div className="history-header">
                    <span className={`action-badge ${actionCfg.className}`}>
                      <span>{actionCfg.icon}</span>
                      <span>{actionCfg.label}</span>
                    </span>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <div className="actor-info">
                    <span>by {actorName}</span>
                    {isAdminActor && (
                      <span className="actor-role-pill">Admin</span>
                    )}
                  </div>

                  {renderChanges(item)}
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
