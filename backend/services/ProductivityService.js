const Todo = require("../models/Todo");
const TodoActivity = require("../models/TodoActivity");
const Category = require("../models/Category");

/**
 * Calculates comprehensive productivity statistics for a specific user.
 * Strictly excludes soft-deleted (isDeleted: true) tasks.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Statistics payload
 */
async function getUserStatistics(userId) {
  const now = new Date();

  // Day boundaries
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Week boundaries (Sunday as start of week)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Fetch active (non-deleted) todos for user
  const [todos, userCategories, completedActivities] = await Promise.all([
    Todo.find({ userId, isDeleted: false })
      .populate("categoryId", "name")
      .lean(),
    Category.find({ userId }).lean(),
    TodoActivity.find({
      userId,
      action: "COMPLETED",
      createdAt: { $gte: startOfWeek },
    }).lean(),
  ]);

  // Total and completion counts
  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Overdue and Due Today
  const overdueTasks = todos.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const tasksDueToday = todos.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= startOfDay && due <= endOfDay;
  }).length;

  // Time-based completion calculation using activity logs and task updatedAt fallback
  const completedTodayNumbers = new Set(
    completedActivities
      .filter((a) => new Date(a.createdAt) >= startOfDay)
      .map((a) => a.todoNumber)
  );

  const completedWeekNumbers = new Set(
    completedActivities
      .filter((a) => new Date(a.createdAt) >= startOfWeek)
      .map((a) => a.todoNumber)
  );

  const completedToday = todos.filter(
    (t) =>
      t.completed &&
      (completedTodayNumbers.has(t.todoNumber) ||
        (t.updatedAt && new Date(t.updatedAt) >= startOfDay))
  ).length;

  const completedThisWeek = todos.filter(
    (t) =>
      t.completed &&
      (completedWeekNumbers.has(t.todoNumber) ||
        (t.updatedAt && new Date(t.updatedAt) >= startOfWeek))
  ).length;

  // Priority Distribution Breakdown
  const priorities = ["High", "Medium", "Low"];
  const priorityStats = {};
  for (const p of priorities) {
    const pTodos = todos.filter((t) => (t.priority || "Medium") === p);
    const pCompleted = pTodos.filter((t) => t.completed).length;
    const pPending = pTodos.length - pCompleted;
    priorityStats[p.toLowerCase()] = {
      name: p,
      total: pTodos.length,
      completed: pCompleted,
      pending: pPending,
      completionRate:
        pTodos.length === 0
          ? 0
          : Math.round((pCompleted / pTodos.length) * 100),
    };
  }

  // Category Distribution Breakdown
  const categoryMap = new Map();
  userCategories.forEach((cat) => {
    categoryMap.set(String(cat._id), {
      id: String(cat._id),
      name: cat.name,
      total: 0,
      completed: 0,
      pending: 0,
    });
  });

  let uncategorizedTotal = 0;
  let uncategorizedCompleted = 0;
  let uncategorizedPending = 0;

  todos.forEach((t) => {
    const catId = t.categoryId
      ? String(t.categoryId._id || t.categoryId)
      : null;
    if (catId && categoryMap.has(catId)) {
      const entry = categoryMap.get(catId);
      entry.total += 1;
      if (t.completed) entry.completed += 1;
      else entry.pending += 1;
    } else {
      uncategorizedTotal += 1;
      if (t.completed) uncategorizedCompleted += 1;
      else uncategorizedPending += 1;
    }
  });

  const categoryStats = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    completionRate:
      c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100),
  }));

  // Include Uncategorized in list
  if (uncategorizedTotal > 0 || categoryStats.length === 0) {
    categoryStats.push({
      id: "uncategorized",
      name: "Uncategorized",
      total: uncategorizedTotal,
      completed: uncategorizedCompleted,
      pending: uncategorizedPending,
      completionRate:
        uncategorizedTotal === 0
          ? 0
          : Math.round((uncategorizedCompleted / uncategorizedTotal) * 100),
    });
  }

  return {
    overview: {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
    },
    timeStats: {
      completedToday,
      completedThisWeek,
      dueToday: tasksDueToday,
      overdue: overdueTasks,
    },
    priorityStats,
    categoryStats,
  };
}

module.exports = {
  getUserStatistics,
};
