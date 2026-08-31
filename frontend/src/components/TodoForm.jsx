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
    <form onSubmit={handleSubmit} className="todo-form">
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

      <div className="todo-form-options">
        <div className="todo-form-chip" title="Set due date and time">
          <span className="chip-icon">📅</span>
          <input
            type="datetime-local"
            className="chip-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
            aria-label="Due date"
          />
        </div>

        <div className="todo-form-chip" title="Set priority">
          <span className="chip-icon">🎯</span>
          <select
            className="chip-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isSubmitting}
            aria-label="Priority"
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
        </div>

        <div className="todo-form-chip" title="Assign category">
          <span className="chip-icon">📁</span>
          <select
            className="chip-select"
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
        </div>
      </div>

      {tags.length > 0 && (
        <div className="todo-form-tags">
          <span className="tags-label">Tags:</span>
          {tags.map((t) => {
            const isSelected = selectedTags.includes(t._id);
            return (
              <button
                key={t._id}
                type="button"
                className={`tag-chip ${isSelected ? "selected" : ""}`}
                onClick={() => toggleTag(t._id)}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="todo-form-error">{error}</p>}
    </form>
  );
}
