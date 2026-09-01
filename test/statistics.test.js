require("dotenv").config();
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const TodoActivity = require("../models/TodoActivity");
const Category = require("../models/Category");
const Counter = require("../models/Counter");
const { createTestUser, loginUser } = require("./testHelpers");

let server;
let baseUrl;
let user1, user2;
let authCookiesUser1, authCookiesUser2;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;

  await Todo.deleteMany({});
  await TodoActivity.deleteMany({});
  await Category.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});

  user1 = await createTestUser(
    "stats_user1@example.com",
    "Password123!",
    "user"
  );
  user2 = await createTestUser(
    "stats_user2@example.com",
    "Password123!",
    "user"
  );

  authCookiesUser1 = await loginUser(
    baseUrl,
    "stats_user1@example.com",
    "Password123!"
  );
  authCookiesUser2 = await loginUser(
    baseUrl,
    "stats_user2@example.com",
    "Password123!"
  );
});

after(async () => {
  try {
    await Todo.deleteMany({});
    await TodoActivity.deleteMany({});
    await Category.deleteMany({});
    await Counter.deleteMany({});
    await mongoose.connection.collection("users").deleteMany({});
    await mongoose.connection.collection("sessions").deleteMany({});
  } catch {}
  await setupDb.disconnect();
  if (server) server.close();
});

describe("Productivity Statistics API - GET /todos/statistics", () => {
  test("returns empty metrics (0 counts, 0% rate) when user has no tasks", async () => {
    const res = await fetch(`${baseUrl}/todos/statistics`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.overview.totalTasks, 0);
    assert.strictEqual(data.overview.completedTasks, 0);
    assert.strictEqual(data.overview.pendingTasks, 0);
    assert.strictEqual(data.overview.completionRate, 0);

    assert.strictEqual(data.timeStats.completedToday, 0);
    assert.strictEqual(data.timeStats.completedThisWeek, 0);
    assert.strictEqual(data.timeStats.dueToday, 0);
    assert.strictEqual(data.timeStats.overdue, 0);

    assert.strictEqual(data.priorityStats.high.total, 0);
    assert.strictEqual(data.priorityStats.medium.total, 0);
    assert.strictEqual(data.priorityStats.low.total, 0);
  });

  test("accurately calculates overview, priority, time-based, and category stats", async () => {
    // Create categories for User 1
    const catWork = await Category.create({ name: "Work", userId: user1._id });
    const catPersonal = await Category.create({
      name: "Personal",
      userId: user1._id,
    });

    const now = new Date();
    const pastDueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday (Overdue)
    const todayDueDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Later today
    const futureDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week

    // Task 1: Work, High priority, completed, due future
    const res1 = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Work Task 1",
        priority: "High",
        categoryId: catWork._id.toString(),
        dueDate: futureDueDate.toISOString(),
      }),
    });
    const t1 = await res1.json();
    // Mark t1 completed
    await fetch(`${baseUrl}/todos/${t1.todoNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ completed: true }),
    });

    // Task 2: Work, High priority, pending, overdue
    const res2 = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Work Task 2",
        priority: "High",
        categoryId: catWork._id.toString(),
      }),
    });
    const t2 = await res2.json();
    await fetch(`${baseUrl}/todos/${t2.todoNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        dueDate: pastDueDate.toISOString(),
      }),
    });

    // Task 3: Personal, Medium priority, pending, due today
    await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Personal Task 3",
        priority: "Medium",
        categoryId: catPersonal._id.toString(),
        dueDate: todayDueDate.toISOString(),
      }),
    });

    // Task 4: Uncategorized, Low priority, pending, no due date
    await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Uncategorized Task 4",
        priority: "Low",
      }),
    });

    // Task 5: User 2 task (to verify multi-tenant isolation)
    await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser2,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "User 2 Private Task",
        priority: "High",
      }),
    });

    // Fetch User 1 statistics
    const statsRes = await fetch(`${baseUrl}/todos/statistics`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(statsRes.status, 200);
    const stats = await statsRes.json();

    // 1. Overview Assertions (4 active tasks for User 1: 1 completed, 3 pending => 25% completion rate)
    assert.strictEqual(stats.overview.totalTasks, 4);
    assert.strictEqual(stats.overview.completedTasks, 1);
    assert.strictEqual(stats.overview.pendingTasks, 3);
    assert.strictEqual(stats.overview.completionRate, 25);

    // 2. Time-based Assertions
    assert.strictEqual(stats.timeStats.completedToday, 1);
    assert.strictEqual(stats.timeStats.completedThisWeek, 1);
    assert.strictEqual(stats.timeStats.overdue, 1); // Task 2 is overdue
    assert.strictEqual(stats.timeStats.dueToday, 1); // Task 3 is due today

    // 3. Priority Assertions
    assert.strictEqual(stats.priorityStats.high.total, 2);
    assert.strictEqual(stats.priorityStats.high.completed, 1);
    assert.strictEqual(stats.priorityStats.high.pending, 1);
    assert.strictEqual(stats.priorityStats.high.completionRate, 50);

    assert.strictEqual(stats.priorityStats.medium.total, 1);
    assert.strictEqual(stats.priorityStats.medium.completed, 0);
    assert.strictEqual(stats.priorityStats.medium.pending, 1);

    assert.strictEqual(stats.priorityStats.low.total, 1);
    assert.strictEqual(stats.priorityStats.low.completed, 0);
    assert.strictEqual(stats.priorityStats.low.pending, 1);

    // 4. Category Assertions
    const workCatStat = stats.categoryStats.find((c) => c.name === "Work");
    assert.ok(workCatStat);
    assert.strictEqual(workCatStat.total, 2);
    assert.strictEqual(workCatStat.completed, 1);
    assert.strictEqual(workCatStat.pending, 1);

    const uncatStat = stats.categoryStats.find(
      (c) => c.name === "Uncategorized"
    );
    assert.ok(uncatStat);
    assert.strictEqual(uncatStat.total, 1);
    assert.strictEqual(uncatStat.completed, 0);
    assert.strictEqual(uncatStat.pending, 1);

    // 5. User 2 Isolation Assertions
    const u2StatsRes = await fetch(`${baseUrl}/todos/statistics`, {
      headers: {
        Cookie: authCookiesUser2,
        Origin: "http://localhost:5173",
      },
    });
    const u2Stats = await u2StatsRes.json();
    assert.strictEqual(u2Stats.overview.totalTasks, 1);
    assert.strictEqual(u2Stats.overview.completedTasks, 0);
  });

  test("soft-deleted tasks in Trash are strictly excluded from statistics", async () => {
    // Create and then delete a task for User 1
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Task to Trash",
        priority: "High",
      }),
    });
    const todo = await createRes.json();

    // Verify count before deletion
    const beforeStatsRes = await fetch(`${baseUrl}/todos/statistics`, {
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });
    const beforeStats = await beforeStatsRes.json();
    const countBefore = beforeStats.overview.totalTasks;

    // Delete task to trash
    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "DELETE",
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });

    // Verify count after deletion (must exclude trashed task)
    const afterStatsRes = await fetch(`${baseUrl}/todos/statistics`, {
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });
    const afterStats = await afterStatsRes.json();
    assert.strictEqual(afterStats.overview.totalTasks, countBefore - 1);
  });
});
