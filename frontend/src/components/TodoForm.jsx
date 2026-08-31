import React, { useState } from "react";

export function TodoForm({
  onSubmit,
  isSubmitting,
  categories = [],
  tags = [],
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState("");

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a task");
      return;
    }

    if (!/(\p{L}|\p{N})/u.test(trimmedTitle)) {
      setError("Task must contain at least one letter or number");
      return;
    }

    if (dueDate) {
      const selectedDate = new Date(dueDate);
      if (selectedDate < new Date()) {
        setError("Due date cannot be in the past");
        return;
      }
    }

    setError("");
    const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

    onSubmit(
      trimmedTitle,
      isoDueDate,
      priority,
      categoryId || null,
      selectedTags,
      () => {
        setTitle("");
        setDueDate("");
        setPriority("Medium");
        setCategoryId("");
        setSelectedTags([]);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: "relative" }}>
      <div className="pill-input-container">
        <input
          type="text"
          className="pill-input"
          placeholder="Add a new intention..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          maxLength={50}
          aria-label="New todo title"
          autoFocus
        />
        <input
          type="datetime-local"
          className="pill-input"
          style={{
            flex: "0 0 auto",
            width: "auto",
            borderLeft: "1px solid var(--border)",
            borderRadius: 0,
          }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isSubmitting}
          aria-label="Due date"
        />
        <select
          className="pill-input"
          style={{
            flex: "0 0 auto",
            width: "auto",
            borderLeft: "1px solid var(--border)",
            borderRadius: 0,
            appearance: "auto",
            cursor: "pointer",
          }}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          disabled={isSubmitting}
          aria-label="Priority"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          className="pill-input"
          style={{
            flex: "0 0 auto",
            width: "auto",
            maxWidth: "140px",
            borderLeft: "1px solid var(--border)",
            borderRadius: 0,
            appearance: "auto",
            cursor: "pointer",
          }}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isSubmitting}
          aria-label="Category"
        >
          <option value="">No Category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="pill-submit"
          disabled={isSubmitting || !title.trim()}
          aria-label="Add task"
        >
          {isSubmitting ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: "spin 1s linear infinite" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          ) : (
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
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          )}
        </button>
      </div>

      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginTop: "8px",
            marginBottom: "16px",
            paddingLeft: "12px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Tags:
          </span>
          {tags.map((t) => {
            const isSelected = selectedTags.includes(t._id);
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => toggleTag(t._id)}
                style={{
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "12px",
                  border: isSelected
                    ? "1px solid var(--accent, #6366f1)"
                    : "1px solid var(--border)",
                  backgroundColor: isSelected
                    ? "rgba(99, 102, 241, 0.15)"
                    : "transparent",
                  color: isSelected
                    ? "var(--accent, #6366f1)"
                    : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p
          style={{
            color: "var(--accent)",
            marginTop: "-16px",
            marginBottom: "24px",
            fontSize: "0.8rem",
            paddingLeft: "16px",
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
