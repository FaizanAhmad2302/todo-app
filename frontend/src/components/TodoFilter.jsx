import React, { useState } from "react";

export function TodoFilter({
  filter,
  onFilterChange,
  onClearCompleted,
  onClearIncomplete,
}) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCompleted = async () => {
    if (
      window.confirm("Are you sure you want to delete all completed tasks?")
    ) {
      setIsClearing(true);
      await onClearCompleted();
      setIsClearing(false);
    }
  };

  const handleClearIncomplete = async () => {
    if (
      window.confirm("Are you sure you want to delete all incomplete tasks?")
    ) {
      setIsClearing(true);
      await onClearIncomplete();
      setIsClearing(false);
    }
  };

  return (
    <div className="filter-container">
      <div className="filter-group">
        <button
          className={`btn btn-ghost ${filter === "all" ? "active" : ""}`}
          onClick={() => onFilterChange("all")}
        >
          All
        </button>
        <button
          className={`btn btn-ghost ${filter === "active" ? "active" : ""}`}
          onClick={() => onFilterChange("active")}
        >
          Active
        </button>
        <button
          className={`btn btn-ghost ${filter === "completed" ? "active" : ""}`}
          onClick={() => onFilterChange("completed")}
        >
          Completed
        </button>
      </div>

      <div className="bulk-actions">
        <button
          className="btn btn-danger"
          onClick={handleClearCompleted}
          disabled={isClearing}
        >
          Clear Completed
        </button>
        <button
          className="btn btn-danger"
          onClick={handleClearIncomplete}
          disabled={isClearing}
        >
          Clear Incomplete
        </button>
      </div>
    </div>
  );
}
