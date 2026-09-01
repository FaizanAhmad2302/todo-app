import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStatistics } from "../services/todoApi";
import { Loading } from "../components/Loading";
import { Toast } from "../components/Toast";

// SVG Progress Ring Component
function ProgressRing({ percentage = 0, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  let color = "#ef4444"; // red
  if (percentage >= 75)
    color = "#10b981"; // emerald
  else if (percentage >= 40) color = "#f59e0b"; // amber

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: "stroke-dashoffset 0.6s ease-in-out" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text-main)",
          }}
        >
          {percentage}%
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Completed
        </span>
      </div>
    </div>
  );
}

// SVG Donut Chart Component
function DonutChart({
  completed = 0,
  pending = 0,
  overdue = 0,
  size = 140,
  strokeWidth = 16,
}) {
  const total = completed + pending;
  if (total === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          margin: "0 auto",
          display: "grid",
          placeContent: "center",
          borderRadius: "50%",
          background: "#f3f4f6",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          No tasks
        </span>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const completedRatio = completed / total;
  const onTimePending = Math.max(0, pending - overdue);
  const pendingRatio = onTimePending / total;
  const overdueRatio = overdue / total;

  const completedDash = completedRatio * circumference;
  const pendingDash = pendingRatio * circumference;
  const overdueDash = overdueRatio * circumference;

  let currentOffset = 0;
  const seg1Offset = currentOffset;
  currentOffset += completedDash;
  const seg2Offset = currentOffset;
  currentOffset += pendingDash;
  const seg3Offset = currentOffset;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Completed Segment (Green) */}
        {completed > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={`${completedDash} ${circumference}`}
            strokeDashoffset={-seg1Offset}
            fill="transparent"
          />
        )}
        {/* On-Time Pending Segment (Amber/Indigo) */}
        {onTimePending > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#6366f1"
            strokeWidth={strokeWidth}
            strokeDasharray={`${pendingDash} ${circumference}`}
            strokeDashoffset={-seg2Offset}
            fill="transparent"
          />
        )}
        {/* Overdue Pending Segment (Red) */}
        {overdue > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${overdueDash} ${circumference}`}
            strokeDashoffset={-seg3Offset}
            fill="transparent"
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "var(--text-main)",
          }}
        >
          {total}
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Active
        </span>
      </div>
    </div>
  );
}

export default function ProductivityDashboard() {
  const { currentUser, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getStatistics();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load statistics");
      showToast(err.message || "Failed to load statistics", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // Insight Generator
  const getProductivityInsight = () => {
    if (!stats || stats.overview.totalTasks === 0) {
      return "You have no active tasks. Start by adding your goals and to-dos for today!";
    }
    const { completionRate } = stats.overview;
    const { overdue, dueToday, completedToday } = stats.timeStats;

    if (overdue > 0) {
      return `⚠️ You have ${overdue} overdue task${overdue > 1 ? "s" : ""}. Address high-priority overdue tasks first to get back on track!`;
    }
    if (completionRate >= 80) {
      return "🌟 Outstanding momentum! You've accomplished almost all of your tasks. Keep up the brilliant focus!";
    }
    if (completedToday > 0) {
      return `🎯 Great job completing ${completedToday} task${completedToday > 1 ? "s" : ""} today! Keep pushing forward on your remaining goals.`;
    }
    if (dueToday > 0) {
      return `📅 You have ${dueToday} task${dueToday > 1 ? "s" : ""} due today. Focus on completing them before the end of the day!`;
    }
    return "💡 Break larger tasks into smaller priority steps to consistently boost your completion rate.";
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
          <span className="nav-heading">Navigation</span>
          <Link to="/" className="nav-link">
            📋 Task List
          </Link>
          <Link to="/productivity" className="nav-link active">
            📊 Productivity
          </Link>
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
          {/* Header */}
          <div
            className="header-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h1 className="main-title" style={{ margin: 0 }}>
                Productivity Insights
              </h1>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                }}
              >
                Track your task velocity, completion rates, and workload
                breakdown
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-ghost"
                onClick={loadStatistics}
                disabled={isLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🔄 Refresh
              </button>
              <Link
                to="/"
                className="btn-primary"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                ← Back to Tasks
              </Link>
            </div>
          </div>

          {error && !isLoading && (
            <div className="empty-state" style={{ color: "var(--accent)" }}>
              <p>Error: {error}</p>
              <button
                className="btn-primary"
                style={{ marginTop: "16px" }}
                onClick={loadStatistics}
              >
                Try Again
              </button>
            </div>
          )}

          {isLoading ? (
            <Loading />
          ) : stats ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Insight Banner */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  color: "var(--text-main)",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: 500,
                }}
              >
                <span>{getProductivityInsight()}</span>
              </div>

              {/* Top Overview Metrics (4 Grid) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                {/* Total Tasks */}
                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-title">Total Active Tasks</span>
                    <span className="stats-card-icon">📋</span>
                  </div>
                  <div className="stats-card-value">
                    {stats.overview.totalTasks}
                  </div>
                  <div className="stats-card-sub">
                    Active tasks in workspace
                  </div>
                </div>

                {/* Completed Tasks */}
                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-title">Completed Tasks</span>
                    <span
                      className="stats-card-icon"
                      style={{ color: "#10b981" }}
                    >
                      ✅
                    </span>
                  </div>
                  <div
                    className="stats-card-value"
                    style={{ color: "#10b981" }}
                  >
                    {stats.overview.completedTasks}
                  </div>
                  <div className="stats-card-sub">Finished to-dos</div>
                </div>

                {/* Pending Tasks */}
                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-title">Pending Tasks</span>
                    <span
                      className="stats-card-icon"
                      style={{ color: "#f59e0b" }}
                    >
                      ⏳
                    </span>
                  </div>
                  <div
                    className="stats-card-value"
                    style={{ color: "#f59e0b" }}
                  >
                    {stats.overview.pendingTasks}
                  </div>
                  <div className="stats-card-sub">In-progress items</div>
                </div>

                {/* Completion Rate */}
                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-title">Completion Rate</span>
                    <span className="stats-card-icon">🎯</span>
                  </div>
                  <div
                    className="stats-card-value"
                    style={{ color: "var(--accent)" }}
                  >
                    {stats.overview.completionRate}%
                  </div>
                  <div className="stats-card-sub">
                    Overall progress efficiency
                  </div>
                </div>
              </div>

              {/* Time-Based Metrics (4 Grid) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                }}
              >
                <div className="stats-card mini">
                  <span className="stats-card-title">Completed Today</span>
                  <div className="stats-card-value mini">
                    {stats.timeStats.completedToday}
                  </div>
                </div>

                <div className="stats-card mini">
                  <span className="stats-card-title">Completed This Week</span>
                  <div className="stats-card-value mini">
                    {stats.timeStats.completedThisWeek}
                  </div>
                </div>

                <div className="stats-card mini">
                  <span className="stats-card-title">Due Today</span>
                  <div
                    className="stats-card-value mini"
                    style={{
                      color:
                        stats.timeStats.dueToday > 0 ? "#6366f1" : "inherit",
                    }}
                  >
                    {stats.timeStats.dueToday}
                  </div>
                </div>

                <div
                  className="stats-card mini"
                  style={
                    stats.timeStats.overdue > 0
                      ? { borderColor: "#fca5a5", backgroundColor: "#fff5f5" }
                      : {}
                  }
                >
                  <span
                    className="stats-card-title"
                    style={
                      stats.timeStats.overdue > 0 ? { color: "#dc2626" } : {}
                    }
                  >
                    Overdue
                  </span>
                  <div
                    className="stats-card-value mini"
                    style={{
                      color:
                        stats.timeStats.overdue > 0 ? "#dc2626" : "inherit",
                    }}
                  >
                    {stats.timeStats.overdue}
                  </div>
                </div>
              </div>

              {/* Visualizations Section: Completion Donut + Priority Breakdown */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Visual Card 1: Task Breakdown Chart */}
                <div className="stats-section-card">
                  <h3 className="stats-section-title">Task Status Breakdown</h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                      flexWrap: "wrap",
                      gap: "20px",
                      padding: "16px 0",
                    }}
                  >
                    <DonutChart
                      completed={stats.overview.completedTasks}
                      pending={stats.overview.pendingTasks}
                      overdue={stats.timeStats.overdue}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            backgroundColor: "#10b981",
                          }}
                        ></span>
                        <span>
                          Completed:{" "}
                          <strong>{stats.overview.completedTasks}</strong>
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            backgroundColor: "#6366f1",
                          }}
                        ></span>
                        <span>
                          On-Track Pending:{" "}
                          <strong>
                            {Math.max(
                              0,
                              stats.overview.pendingTasks -
                                stats.timeStats.overdue
                            )}
                          </strong>
                        </span>
                      </div>
                      {stats.timeStats.overdue > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "3px",
                              backgroundColor: "#ef4444",
                            }}
                          ></span>
                          <span style={{ color: "#dc2626" }}>
                            Overdue: <strong>{stats.timeStats.overdue}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "14px",
                      marginTop: "8px",
                    }}
                  >
                    <ProgressRing
                      percentage={stats.overview.completionRate}
                      size={100}
                      strokeWidth={8}
                    />
                  </div>
                </div>

                {/* Visual Card 2: Priority Distribution */}
                <div className="stats-section-card">
                  <h3 className="stats-section-title">Priority Distribution</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "18px",
                      marginTop: "12px",
                    }}
                  >
                    {/* High Priority */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.875rem",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "var(--accent)",
                            }}
                          ></span>
                          High Priority
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {stats.priorityStats.high.completed} /{" "}
                          {stats.priorityStats.high.total} completed (
                          {stats.priorityStats.high.completionRate}%)
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${stats.priorityStats.high.completionRate}%`,
                            backgroundColor: "var(--accent)",
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Medium Priority */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.875rem",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "#f59e0b",
                            }}
                          ></span>
                          Medium Priority
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {stats.priorityStats.medium.completed} /{" "}
                          {stats.priorityStats.medium.total} completed (
                          {stats.priorityStats.medium.completionRate}%)
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${stats.priorityStats.medium.completionRate}%`,
                            backgroundColor: "#f59e0b",
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Low Priority */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.875rem",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "#9ca3af",
                            }}
                          ></span>
                          Low Priority
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {stats.priorityStats.low.completed} /{" "}
                          {stats.priorityStats.low.total} completed (
                          {stats.priorityStats.low.completionRate}%)
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${stats.priorityStats.low.completionRate}%`,
                            backgroundColor: "#9ca3af",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Distribution Section */}
              <div className="stats-section-card">
                <h3 className="stats-section-title">Category Distribution</h3>
                {stats.categoryStats.length === 0 ? (
                  <p
                    style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}
                  >
                    No categorized tasks yet. Assign categories to your tasks to
                    see distribution here.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "14px",
                      marginTop: "12px",
                    }}
                  >
                    {stats.categoryStats.map((cat) => (
                      <div
                        key={cat.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          backgroundColor: "var(--background)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{ fontWeight: 600, fontSize: "0.875rem" }}
                          >
                            📁 {cat.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {cat.completed} / {cat.total} done (
                            {cat.completionRate}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${cat.completionRate}%`,
                              backgroundColor: "#6366f1",
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No statistics available.</p>
              <Link
                to="/"
                className="btn-primary"
                style={{ marginTop: "12px", textDecoration: "none" }}
              >
                Create Tasks
              </Link>
            </div>
          )}
        </div>
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
