import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  deleteCompletedTodos,
  deleteIncompleteTodos,
  deleteAllTodos,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "../services/todoApi";

import { TodoForm } from "../components/TodoForm";
import { TodoList } from "../components/TodoList";
import { Loading } from "../components/Loading";
import { Toast } from "../components/Toast";
import { TodoHistoryModal } from "../components/TodoHistoryModal";
import { Link } from "react-router-dom";

export default function TodoDashboard() {
  const { currentUser, logout } = useAuth();

  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [selectedTodoForHistory, setSelectedTodoForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [filter, setFilter] = useState("all"); // 'all', 'active', 'completed'
  const [priorityFilter, setPriorityFilter] = useState("all"); // 'all', 'Low', 'Medium', 'High'
  const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' or categoryId
  const [tagFilter, setTagFilter] = useState("all"); // 'all' or tagId
  const [sort, setSort] = useState(""); // '', 'dueDate', 'priority'
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Inline input states for creating Categories and Tags
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  const loadCategoriesAndTags = useCallback(async () => {
    try {
      const [cats, tgs] = await Promise.all([getCategories(), getTags()]);
      setCategories(cats);
      setTags(tgs);
    } catch (err) {
      console.error("Failed to load categories/tags:", err);
    }
  }, []);

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let completedParam = undefined;
      if (filter === "active") completedParam = false;
      if (filter === "completed") completedParam = true;

      const data = await getTodos(
        completedParam,
        sort,
        priorityFilter,
        categoryFilter,
        tagFilter
      );
      setTodos(data);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
      showToast(err.message || "Failed to load tasks", "error");
    } finally {
      setIsLoading(false);
    }
  }, [filter, sort, priorityFilter, categoryFilter, tagFilter]);

  useEffect(() => {
    loadCategoriesAndTags();
  }, [loadCategoriesAndTags]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAddTodo = async (
    title,
    dueDate,
    priority,
    categoryId,
    tagsList,
    onSuccess
  ) => {
    const isDuplicate = todos.some(
      (t) => t.title.toLowerCase() === title.toLowerCase()
    );

    if (isDuplicate) {
      const confirm = window.confirm(
        "This task already exists. Are you sure you want to duplicate it?"
      );
      if (!confirm) {
        return;
      }
    }

    try {
      setIsAdding(true);
      await createTodo(title, dueDate, priority, categoryId, tagsList);
      showToast("Task added successfully!");
      if (onSuccess) onSuccess();
      if (filter !== "completed") {
        await loadTodos();
      }
    } catch (err) {
      showToast(err.message || "Failed to add task", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodo = async (todo) => {
    try {
      const updated = await updateTodo(todo.todoNumber, {
        completed: !todo.completed,
      });
      if (filter === "all") {
        setTodos((prev) =>
          prev.map((t) => (t.todoNumber === updated.todoNumber ? updated : t))
        );
      } else {
        setTodos((prev) =>
          prev.filter((t) => t.todoNumber !== updated.todoNumber)
        );
      }
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  const handleUpdateTodo = async (id, updates) => {
    try {
      const updated = await updateTodo(id, updates);
      setTodos((prev) =>
        prev.map((t) => (t.todoNumber === updated.todoNumber ? updated : t))
      );
      showToast("Task updated");
    } catch (err) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.todoNumber !== id));
      showToast("Task deleted");
    } catch (err) {
      showToast(err.message || "Failed to delete task", "error");
    }
  };

  const handleHistoryTodo = (todo) => {
    setSelectedTodoForHistory(todo);
    setIsHistoryOpen(true);
  };

  const handleClearCompleted = async () => {
    if (!window.confirm("Are you sure you want to clear all completed tasks?"))
      return;
    try {
      await deleteCompletedTodos();
      showToast("Completed tasks deleted");
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to clear completed tasks", "error");
    }
  };

  const handleClearActive = async () => {
    if (!window.confirm("Are you sure you want to clear all active tasks?"))
      return;
    try {
      await deleteIncompleteTodos();
      showToast("Active tasks deleted");
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to clear active tasks", "error");
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete ALL your tasks? This cannot be undone."
      )
    )
      return;
    try {
      await deleteAllTodos();
      showToast("All tasks deleted");
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to delete all tasks", "error");
    }
  };

  // Category management handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowAddCategory(false);
      showToast("Category created!");
      await loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message || "Failed to create category", "error");
    }
  };

  const handleRenameCategory = async (cat) => {
    const newName = window.prompt("Enter new category name:", cat.name);
    if (!newName || newName.trim() === "" || newName.trim() === cat.name)
      return;
    try {
      await updateCategory(cat._id, newName.trim());
      showToast("Category renamed!");
      await loadCategoriesAndTags();
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to rename category", "error");
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${cat.name}"? Affected tasks will have their category removed.`
      )
    )
      return;
    try {
      await deleteCategory(cat._id);
      if (categoryFilter === cat._id) setCategoryFilter("all");
      showToast("Category deleted!");
      await loadCategoriesAndTags();
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to delete category", "error");
    }
  };

  // Tag management handlers
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim());
      setNewTagName("");
      setShowAddTag(false);
      showToast("Tag created!");
      await loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message || "Failed to create tag", "error");
    }
  };

  const handleRenameTag = async (t) => {
    const newName = window.prompt("Enter new tag name:", t.name);
    if (!newName || newName.trim() === "" || newName.trim() === t.name) return;
    try {
      await updateTag(t._id, newName.trim());
      showToast("Tag renamed!");
      await loadCategoriesAndTags();
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to rename tag", "error");
    }
  };

  const handleDeleteTag = async (t) => {
    if (
      !window.confirm(
        `Are you sure you want to delete tag "${t.name}"? It will be removed from all affected tasks.`
      )
    )
      return;
    try {
      await deleteTag(t._id);
      if (tagFilter === t._id) setTagFilter("all");
      showToast("Tag deleted!");
      await loadCategoriesAndTags();
      await loadTodos();
    } catch (err) {
      showToast(err.message || "Failed to delete tag", "error");
    }
  };

  let displayedTodos = todos;
  if (searchQuery.trim() !== "") {
    displayedTodos = displayedTodos.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const getPageTitle = () => {
    if (filter === "active") return "Active Tasks";
    if (filter === "completed") return "Completed Tasks";
    return "All Tasks";
  };

  const getEmptyMessage = () => {
    if (filter === "active")
      return "No active tasks right now. You're all caught up!";
    if (filter === "completed")
      return "No completed tasks yet. Time to get to work!";
    return "Your list is empty. Add a task to get started.";
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand" style={{ marginBottom: "8px" }}>
          Task Manager
        </div>
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            marginBottom: "24px",
          }}
        >
          Logged in as <strong>{currentUser?.name}</strong>
        </div>

        <div className="nav-section">
          <span className="nav-heading">Views</span>
          <button
            className={`nav-link ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Tasks
          </button>
          <button
            className={`nav-link ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active
          </button>
          <button
            className={`nav-link ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>

        {/* Categories Section */}
        <div className="nav-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="nav-heading">Categories</span>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #6366f1)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
              title="Add Category"
            >
              {showAddCategory ? "✕" : "+"}
            </button>
          </div>

          {showAddCategory && (
            <form
              onSubmit={handleCreateCategory}
              style={{ marginBottom: "8px" }}
            >
              <input
                type="text"
                className="pill-input"
                placeholder="Category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                maxLength={50}
                autoFocus
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
              />
            </form>
          )}

          <button
            className={`nav-link ${categoryFilter === "all" ? "active" : ""}`}
            onClick={() => setCategoryFilter("all")}
          >
            All Categories
          </button>

          {categories.map((c) => (
            <div
              key={c._id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                className={`nav-link ${categoryFilter === c._id ? "active" : ""}`}
                style={{ flex: 1, textAlign: "left" }}
                onClick={() => setCategoryFilter(c._id)}
              >
                📁 {c.name}
              </button>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  onClick={() => handleRenameCategory(c)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    padding: "2px",
                  }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDeleteCategory(c)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent, #ef4444)",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    padding: "2px",
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tags Section */}
        <div className="nav-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="nav-heading">Tags</span>
            <button
              onClick={() => setShowAddTag(!showAddTag)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #6366f1)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
              title="Add Tag"
            >
              {showAddTag ? "✕" : "+"}
            </button>
          </div>

          {showAddTag && (
            <form onSubmit={handleCreateTag} style={{ marginBottom: "8px" }}>
              <input
                type="text"
                className="pill-input"
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={30}
                autoFocus
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
              />
            </form>
          )}

          <button
            className={`nav-link ${tagFilter === "all" ? "active" : ""}`}
            onClick={() => setTagFilter("all")}
          >
            All Tags
          </button>

          {tags.map((t) => (
            <div
              key={t._id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                className={`nav-link ${tagFilter === t._id ? "active" : ""}`}
                style={{ flex: 1, textAlign: "left" }}
                onClick={() => setTagFilter(t._id)}
              >
                #{t.name}
              </button>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  onClick={() => handleRenameTag(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    padding: "2px",
                  }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDeleteTag(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent, #ef4444)",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    padding: "2px",
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="nav-section">
          <span className="nav-heading">Priority Filter</span>
          <button
            className={`nav-link ${priorityFilter === "all" ? "active" : ""}`}
            onClick={() => setPriorityFilter("all")}
          >
            All Priorities
          </button>
          <button
            className={`nav-link ${priorityFilter === "High" ? "active" : ""}`}
            onClick={() => setPriorityFilter("High")}
          >
            High Priority
          </button>
          <button
            className={`nav-link ${priorityFilter === "Medium" ? "active" : ""}`}
            onClick={() => setPriorityFilter("Medium")}
          >
            Medium Priority
          </button>
          <button
            className={`nav-link ${priorityFilter === "Low" ? "active" : ""}`}
            onClick={() => setPriorityFilter("Low")}
          >
            Low Priority
          </button>
        </div>

        <div className="nav-section">
          <span className="nav-heading">Sort By</span>
          <button
            className={`nav-link ${sort === "" ? "active" : ""}`}
            onClick={() => setSort("")}
          >
            Default Order
          </button>
          <button
            className={`nav-link ${sort === "dueDate" ? "active" : ""}`}
            onClick={() => setSort("dueDate")}
          >
            Due Date
          </button>
          <button
            className={`nav-link ${sort === "priority" ? "active" : ""}`}
            onClick={() => setSort("priority")}
          >
            Priority
          </button>
        </div>

        <div className="nav-section">
          <span className="nav-heading">Bulk Actions</span>
          <button
            className="nav-link danger-link"
            onClick={handleClearCompleted}
          >
            Clear Completed
          </button>
          <button className="nav-link danger-link" onClick={handleClearActive}>
            Clear Active
          </button>
          <button className="nav-link danger-link" onClick={handleClearAll}>
            Delete All Tasks
          </button>
        </div>

        <div className="nav-section" style={{ marginTop: "auto" }}>
          <span className="nav-heading">Account</span>
          <Link
            to="/profile"
            className="nav-link"
            style={{ marginBottom: "8px" }}
          >
            Profile Settings
          </Link>
          {currentUser?.role === "admin" && (
            <Link
              to="/admin"
              className="nav-link"
              style={{ marginBottom: "8px" }}
            >
              Admin Dashboard
            </Link>
          )}
          <button className="nav-link danger-link" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper">
          <div className="header-row">
            <h1 className="main-title">{getPageTitle()}</h1>
            <input
              type="text"
              className="search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tasks"
            />
          </div>

          <TodoForm
            onSubmit={handleAddTodo}
            isSubmitting={isAdding}
            categories={categories}
            tags={tags}
          />

          {error && !isLoading && (
            <div className="empty-state" style={{ color: "var(--accent)" }}>
              <p>Error: {error}</p>
              <button
                className="btn-primary"
                style={{ marginTop: "16px" }}
                onClick={() => loadTodos()}
              >
                Try Again
              </button>
            </div>
          )}

          {isLoading ? (
            <Loading />
          ) : (
            !error && (
              <TodoList
                todos={displayedTodos}
                categories={categories}
                tags={tags}
                onToggle={handleToggleTodo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
                onHistory={handleHistoryTodo}
                emptyMessage={getEmptyMessage()}
              />
            )
          )}
        </div>
      </main>

      {isHistoryOpen && selectedTodoForHistory && (
        <TodoHistoryModal
          todo={selectedTodoForHistory}
          onClose={() => {
            setIsHistoryOpen(false);
            setSelectedTodoForHistory(null);
          }}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
