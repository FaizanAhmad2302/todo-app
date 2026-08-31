require("dotenv").config();
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const TodoActivity = require("../models/TodoActivity");
const Counter = require("../models/Counter");
const { createTestUser, loginUser } = require("./testHelpers");

let server;
let baseUrl;
let user1, user2, admin;
let authCookiesUser1, authCookiesUser2, authCookiesAdmin;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;

  await Todo.deleteMany({});
  await TodoActivity.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});

  user1 = await createTestUser("user1_act@example.com", "Password123!", "user");
  user2 = await createTestUser("user2_act@example.com", "Password123!", "user");
  admin = await createTestUser(
    "admin_act@example.com",
    "Password123!",
    "admin"
  );

  authCookiesUser1 = await loginUser(
    baseUrl,
    "user1_act@example.com",
    "Password123!"
  );
  authCookiesUser2 = await loginUser(
    baseUrl,
    "user2_act@example.com",
    "Password123!"
  );
  authCookiesAdmin = await loginUser(
    baseUrl,
    "admin_act@example.com",
    "Password123!"
  );
});

after(async () => {
  try {
    await Todo.deleteMany({});
    await TodoActivity.deleteMany({});
    await Counter.deleteMany({});
    await mongoose.connection.collection("users").deleteMany({});
    await mongoose.connection.collection("sessions").deleteMany({});
  } catch {}
  await setupDb.disconnect();
  if (server) server.close();
});

describe("Todo Activity History API", () => {
  test("creates a CREATED activity record when a todo is created", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Task with History", priority: "High" }),
    });
    assert.strictEqual(res.status, 201);
    const todo = await res.json();

    const histRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}/history`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(histRes.status, 200);
    const history = await histRes.json();

    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].action, "CREATED");
    assert.strictEqual(history[0].todoNumber, todo.todoNumber);
    assert.strictEqual(history[0].changes.title, "Task with History");
    assert.strictEqual(history[0].changes.priority, "High");
    assert.strictEqual(history[0].performedBy.email, "user1_act@example.com");
  });

  test("records UPDATED activity when a todo is modified", async () => {
    // 1. Create todo
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Original Title", priority: "Low" }),
    });
    const todo = await createRes.json();

    // 2. Update title and priority
    const patchRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Updated Title", priority: "High" }),
    });
    assert.strictEqual(patchRes.status, 200);

    // 3. Fetch history
    const histRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}/history`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(histRes.status, 200);
    const history = await histRes.json();

    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].action, "UPDATED");
    assert.deepStrictEqual(history[0].changes.title, {
      from: "Original Title",
      to: "Updated Title",
    });
    assert.deepStrictEqual(history[0].changes.priority, {
      from: "Low",
      to: "High",
    });
  });

  test("isolates activity history across users", async () => {
    // User 1 creates a todo
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "User 1 Secret Task" }),
    });
    const todo = await createRes.json();

    // User 2 queries User 1's todo history
    const histRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}/history`, {
      headers: {
        Cookie: authCookiesUser2,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(histRes.status, 200);
    const history = await histRes.json();
    assert.strictEqual(history.length, 0); // User 2 gets an empty array for another user's todo
  });

  test("admin can view activity history via admin endpoint", async () => {
    // 1. User 1 creates todo
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Admin Tracked Task" }),
    });
    const todo = await createRes.json();

    // 2. Admin edits todo
    const adminPatchRes = await fetch(
      `${baseUrl}/admin/todos/${todo.todoNumber}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesAdmin,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          title: "Admin Modified Title",
          priority: "High",
        }),
      }
    );
    assert.strictEqual(adminPatchRes.status, 200);

    // 3. Admin fetches history
    const adminHistRes = await fetch(
      `${baseUrl}/admin/todos/${todo.todoNumber}/history`,
      {
        headers: {
          Cookie: authCookiesAdmin,
          Origin: "http://localhost:5173",
        },
      }
    );
    assert.strictEqual(adminHistRes.status, 200);
    const history = await adminHistRes.json();

    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].action, "UPDATED");
    assert.strictEqual(history[0].performedBy.role, "admin");
    assert.strictEqual(history[0].performedBy.email, "admin_act@example.com");
  });
});
