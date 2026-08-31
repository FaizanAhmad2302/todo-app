import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminUsers,
  getAdminTodos,
  adminUpdateTodo,
  adminDeleteTodo,
  adminDeleteUser,
} from "../services/todoApi";
import { Toast } from "../components/Toast";
import { TodoHistoryModal } from "../components/TodoHistoryModal";
import "./AdminDashboard.css";

const toDatetimeLocal = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'users', 'todos'
  const [users, setUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Modal states
  const [editTodoId, setEditTodoId] = useState(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");
  const [editTodoCompleted, setEditTodoCompleted] = useState(false);
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [editTodoPriority, setEditTodoPriority] = useState("Medium");

  const [historyModalTodo, setHistoryModalTodo] = useState(null);

  const [deleteTodoId, setDeleteTodoId] = useState(null);

  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserConfirmText, setDeleteUserConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, todosData] = await Promise.all([
        getAdminUsers(),
        getAdminTodos(),
      ]);
      setUsers(usersData);
      setTodos(todosData);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      if (err.status === 403) {
        navigate("/");
      } else if (err.status !== 401) {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  // Pre-calculate user map for O(1) lookup
  const userMap = React.useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u._id] = u;
    });
    return map;
  }, [users]);

  // Actions
  const handleUpdateTodoSubmit = async (e) => {
    e.preventDefault();
    if (!editTodoTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const isoDueDate = editTodoDueDate
        ? new Date(editTodoDueDate).toISOString()
        : null;

      const updated = await adminUpdateTodo(editTodoId, {
        title: editTodoTitle.trim(),
        completed: editTodoCompleted,
        dueDate: isoDueDate,
        priority: editTodoPriority,
      });
      setTodos(todos.map((t) => (t.todoNumber === editTodoId ? updated : t)));
      setEditTodoId(null);
      showToast("Todo updated successfully");
    } catch (err) {
      showToast(err.message || "Failed to update todo", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTodoSubmit = async () => {
    setIsSubmitting(true);
    try {
      await adminDeleteTodo(deleteTodoId);
      setTodos(todos.filter((t) => t.todoNumber !== deleteTodoId));
      setDeleteTodoId(null);
      showToast("Todo permanently deleted");
    } catch (err) {
      showToast(err.message || "Failed to delete todo", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUserSubmit = async (e) => {
    e.preventDefault();
    if (deleteUserConfirmText !== "DELETE") return;

    setIsSubmitting(true);
    try {
      await adminDeleteUser(deleteUserId);
      setUsers(users.filter((u) => u._id !== deleteUserId));
      setTodos(todos.filter((t) => t.userId !== deleteUserId));
      setDeleteUserId(null);
      setDeleteUserConfirmText("");
      showToast("User permanently deleted");
    } catch (err) {
      showToast(err.message || "Failed to delete user", "error");
    } finally {
      setIsSubmitting(false);
      setDeleteUserConfirmText("");
    }
  };

  // Derived stats
  const normalUsers = users.filter((u) => u.role !== "admin");
  const completedTodos = todos.filter((t) => t.completed).length;
  const pendingTodos = todos.length - completedTodos;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderOverview = () => (
    <div className="admin-dashboard-content fade-in">
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon users">👥</div>
          <div className="stat-card-info">
            <h3>Total Users</h3>
            <p className="stat-value">{normalUsers.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon todos">📝</div>
          <div className="stat-card-info">
            <h3>Total Todos</h3>
            <p className="stat-value">{todos.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">✓</div>
          <div className="stat-card-info">
            <h3>Completed Todos</h3>
            <p className="stat-value">{completedTodos}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon pending">⏳</div>
          <div className="stat-card-info">
            <h3>Pending Todos</h3>
            <p className="stat-value">{pendingTodos}</p>
          </div>
        </div>
      </div>

      <div className="admin-instructions-section">
        <h2
          style={{
            marginBottom: "24px",
            fontSize: "1.25rem",
            color: "var(--text-main)",
          }}
        >
          Quick Guide & Actions
        </h2>
        <div
          className="instructions-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          <div
            className="instruction-card"
            style={{
              padding: "24px",
              backgroundColor: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>👥</div>
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "8px",
                color: "var(--accent)",
              }}
            >
              User Management
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
              }}
            >
              Navigate to the <strong>Users</strong> tab to view all registered
              accounts. You can monitor verification status, roles, and
              permanently delete accounts if necessary.
            </p>
          </div>

          <div
            className="instruction-card"
            style={{
              padding: "24px",
              backgroundColor: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📝</div>
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "8px",
                color: "var(--accent)",
              }}
            >
              Todo Moderation
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
              }}
            >
              Access the <strong>Todos</strong> tab to moderate tasks across all
              users. You have full privileges to edit task titles, toggle
              completion status, or permanently delete items.
            </p>
          </div>

          <div
            className="instruction-card"
            style={{
              padding: "24px",
              backgroundColor: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔒</div>
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: "8px",
                color: "var(--accent)",
              }}
            >
              Security & Ownership
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
              }}
            >
              All actions are securely authorized. Todo ownership is strictly
              preserved on the backend, and deleting a user automatically
              cascades to remove all associated data and active sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="admin-table-container fade-in">
      <h2>Registered Users</h2>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {normalUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center empty-state">
                  No users found.
                </td>
              </tr>
            ) : (
              normalUsers.map((user) => (
                <tr key={user._id}>
                  <td className="fw-600">{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge status-${user.isActive ? "active" : "inactive"}`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge verified-${user.isVerified ? "yes" : "no"}`}
                    >
                      {user.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="text-sm text-gray">
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <button
                      className="btn-link danger-link text-sm"
                      onClick={() => {
                        setDeleteUserId(user._id);
                        setDeleteUserConfirmText("");
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTodos = () => (
    <div className="admin-table-container fade-in">
      <h2>All Todos</h2>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Owner Name</th>
              <th>Owner Email</th>
              <th>Category</th>
              <th>Tags</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {todos.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center empty-state">
                  No todos found.
                </td>
              </tr>
            ) : (
              todos.map((todo) => {
                const owner = userMap[todo.userId] || {
                  name: "Unknown User",
                  email: "N/A",
                };
                const isOverdue =
                  !todo.completed &&
                  todo.dueDate &&
                  new Date(todo.dueDate).getTime() < Date.now();

                const categoryName =
                  typeof todo.categoryId === "object" &&
                  todo.categoryId !== null
                    ? todo.categoryId.name
                    : null;

                const tagNames = Array.isArray(todo.tags)
                  ? todo.tags
                      .map((t) =>
                        typeof t === "object" && t !== null ? t.name : null
                      )
                      .filter(Boolean)
                  : [];

                return (
                  <tr key={todo._id} className={isOverdue ? "row-overdue" : ""}>
                    <td className="fw-500">{todo.title}</td>
                    <td>{owner.name}</td>
                    <td className="text-gray text-sm">{owner.email}</td>
                    <td className="text-sm">
                      {categoryName ? (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "10px",
                            backgroundColor: "rgba(99, 102, 241, 0.12)",
                            color: "#6366f1",
                          }}
                        >
                          📁 {categoryName}
                        </span>
                      ) : (
                        <span className="text-gray">-</span>
                      )}
                    </td>
                    <td className="text-sm">
                      {tagNames.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {tagNames.map((name, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "0.7rem",
                                padding: "1px 5px",
                                borderRadius: "8px",
                                backgroundColor: "rgba(20, 184, 166, 0.12)",
                                color: "#0d9488",
                              }}
                            >
                              #{name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          backgroundColor:
                            todo.priority === "High"
                              ? "var(--accent)"
                              : todo.priority === "Medium"
                                ? "#f59e0b"
                                : "var(--border)",
                          color:
                            todo.priority === "High" ||
                            todo.priority === "Medium"
                              ? "white"
                              : "var(--text-muted)",
                        }}
                      >
                        {todo.priority || "Medium"}
                      </span>
                    </td>
                    <td className="text-sm">
                      {todo.dueDate ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {isOverdue && (
                            <span
                              style={{
                                backgroundColor: "#fee2e2",
                                color: "#dc2626",
                                padding: "2px 6px",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Overdue
                            </span>
                          )}
                          <span
                            style={{
                              color: isOverdue
                                ? "#dc2626"
                                : "var(--text-secondary)",
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            {new Date(todo.dueDate).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray">None</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge todo-${todo.completed ? "completed" : "pending"}`}
                      >
                        {todo.completed ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="text-sm text-gray">
                      {formatDate(todo.createdAt)}
                    </td>
                    <td className="text-sm text-gray">
                      {formatDate(todo.updatedAt)}
                    </td>
                    <td>
                      <button
                        className="btn-link text-sm"
                        style={{ marginRight: "8px" }}
                        onClick={() => setHistoryModalTodo(todo)}
                      >
                        History
                      </button>
                      <button
                        className="btn-link text-sm"
                        style={{ marginRight: "8px" }}
                        onClick={() => {
                          setEditTodoId(todo.todoNumber);
                          setEditTodoTitle(todo.title);
                          setEditTodoCompleted(todo.completed);
                          setEditTodoDueDate(toDatetimeLocal(todo.dueDate));
                          setEditTodoPriority(todo.priority || "Medium");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-link danger-link text-sm"
                        onClick={() => setDeleteTodoId(todo.todoNumber)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-sidebar-nav">
          <button
            onClick={() => setActiveTab("overview")}
            className={`nav-item btn-link ${activeTab === "overview" ? "active" : ""}`}
          >
            <span className="icon">📊</span> Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`nav-item btn-link ${activeTab === "users" ? "active" : ""}`}
          >
            <span className="icon">👥</span> Users
          </button>
          <button
            onClick={() => setActiveTab("todos")}
            className={`nav-item btn-link ${activeTab === "todos" ? "active" : ""}`}
          >
            <span className="icon">📝</span> Todos
          </button>
          <Link
            to="/profile"
            className="nav-item btn-link"
            style={{ textDecoration: "none" }}
          >
            <span className="icon">⚙️</span> Settings
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-logout-btn">
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "users" && "User Management"}
              {activeTab === "todos" && "Todo Records"}
            </h1>
            <p>Welcome back, {currentUser?.name || "Administrator"}!</p>
          </div>
          <div className="admin-profile">
            <div className="admin-avatar">
              {currentUser?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="admin-profile-info">
              <span className="admin-name">{currentUser?.name}</span>
              <span className="admin-role">Super Admin</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="admin-error-banner">
            <p>{error}</p>
            <button onClick={fetchData} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading-skeleton">
            <div
              className="skeleton-pulse"
              style={{
                height: "120px",
                marginBottom: "24px",
                borderRadius: "12px",
              }}
            ></div>
            <div
              className="skeleton-pulse"
              style={{ height: "400px", borderRadius: "12px" }}
            ></div>
          </div>
        ) : (
          !error && (
            <>
              {activeTab === "overview" && renderOverview()}
              {activeTab === "users" && renderUsers()}
              {activeTab === "todos" && renderTodos()}
            </>
          )
        )}
      </main>

      {/* Edit Todo Modal */}
      {editTodoId !== null && (
        <div className="modal-overlay">
          <div className="modal-content fade-in">
            <h2>Edit Todo</h2>
            <form onSubmit={handleUpdateTodoSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editTodoTitle}
                  onChange={(e) => setEditTodoTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={editTodoPriority}
                  onChange={(e) => setEditTodoPriority(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={editTodoDueDate}
                  onChange={(e) => setEditTodoDueDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="modal-checkbox-row">
                  <div className="todo-checkbox-wrapper" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      className="todo-checkbox"
                      checked={editTodoCompleted}
                      onChange={(e) => setEditTodoCompleted(e.target.checked)}
                    />
                    <div className="checkbox-custom"></div>
                  </div>
                  <span
                    style={{ fontWeight: 500, color: "var(--text-primary)" }}
                  >
                    Mark as Completed
                  </span>
                </label>
              </div>
              <div className="button-group">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditTodoId(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Todo Modal */}
      {deleteTodoId !== null && (
        <div className="modal-overlay">
          <div className="modal-content fade-in">
            <h2>Delete Todo</h2>
            <p>
              Are you sure you want to permanently delete this Todo? This action
              cannot be undone.
            </p>
            <div className="button-group">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTodoId(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary danger-btn"
                onClick={handleDeleteTodoSubmit}
                disabled={isSubmitting}
              >
                Delete Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserId !== null && (
        <div className="modal-overlay">
          <div className="modal-content fade-in">
            <h2>Delete User</h2>
            <div className="error-banner" style={{ marginBottom: "24px" }}>
              <strong>WARNING:</strong> This action will permanently delete the
              user, their active sessions, and ALL of their Todos. This action
              cannot be undone.
            </div>
            <form onSubmit={handleDeleteUserSubmit}>
              <div className="form-group">
                <label>
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteUserConfirmText}
                  onChange={(e) => setDeleteUserConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
              <div className="button-group">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDeleteUserId(null);
                    setDeleteUserConfirmText("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary danger-btn"
                  disabled={isSubmitting || deleteUserConfirmText !== "DELETE"}
                >
                  Permanently Delete User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModalTodo && (
        <TodoHistoryModal
          todo={historyModalTodo}
          isAdmin={true}
          onClose={() => setHistoryModalTodo(null)}
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
