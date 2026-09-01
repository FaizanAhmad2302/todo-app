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

  user1 = await createTestUser("sd_user1@example.com", "Password123!", "user");
  user2 = await createTestUser("sd_user2@example.com", "Password123!", "user");
  admin = await createTestUser("sd_admin@example.com", "Password123!", "admin");

  authCookiesUser1 = await loginUser(
    baseUrl,
    "sd_user1@example.com",
    "Password123!"
  );
  authCookiesUser2 = await loginUser(
    baseUrl,
    "sd_user2@example.com",
    "Password123!"
  );
  authCookiesAdmin = await loginUser(
    baseUrl,
    "sd_admin@example.com",
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

describe("Soft Delete & Trash API", () => {
  test("DELETE /todos/:id soft-deletes a task (isDeleted: true)", async () => {
    // 1. Create a task
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Task to Soft Delete" }),
    });
    assert.strictEqual(createRes.status, 201);
    const todo = await createRes.json();

    // 2. Soft delete the task
    const delRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "DELETE",
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(delRes.status, 204);

    // 3. Verify it does NOT appear in active todos list or GET /todos/:id
    const getRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(getRes.status, 404);

    // 4. Verify document still exists in MongoDB with isDeleted: true
    const doc = await Todo.findOne({ todoNumber: todo.todoNumber });
    assert.ok(doc);
    assert.strictEqual(doc.isDeleted, true);
    assert.ok(doc.deletedAt instanceof Date);

    // 5. Verify it appears in GET /todos/trash
    const trashRes = await fetch(`${baseUrl}/todos/trash`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(trashRes.status, 200);
    const trashList = await trashRes.json();
    assert.ok(trashList.some((t) => t.todoNumber === todo.todoNumber));
  });

  test("PATCH /todos/:id/restore restores a soft-deleted task and logs RESTORED activity", async () => {
    // 1. Create and delete a task
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Task to Restore" }),
    });
    const todo = await createRes.json();

    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "DELETE",
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });

    // 2. Restore task
    const restoreRes = await fetch(
      `${baseUrl}/todos/${todo.todoNumber}/restore`,
      {
        method: "PATCH",
        headers: {
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
      }
    );
    assert.strictEqual(restoreRes.status, 200);
    const restored = await restoreRes.json();
    assert.strictEqual(restored.todoNumber, todo.todoNumber);
    assert.strictEqual(restored.title, "Task to Restore");

    // 3. Verify task is back in active list
    const getRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(getRes.status, 200);

    // 4. Verify RESTORED activity was logged
    const histRes = await fetch(`${baseUrl}/todos/${todo.todoNumber}/history`, {
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    const history = await histRes.json();
    assert.ok(history.some((h) => h.action === "RESTORED"));
  });

  test("DELETE /todos/:id/permanent permanently deletes task from database", async () => {
    // 1. Create and delete a task
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Task to Hard Delete" }),
    });
    const todo = await createRes.json();

    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "DELETE",
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });

    // 2. Permanently delete from trash
    const permRes = await fetch(
      `${baseUrl}/todos/${todo.todoNumber}/permanent`,
      {
        method: "DELETE",
        headers: {
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
      }
    );
    assert.strictEqual(permRes.status, 204);

    // 3. Verify completely gone from MongoDB
    const doc = await Todo.findOne({ todoNumber: todo.todoNumber });
    assert.strictEqual(doc, null);
  });

  test("DELETE /todos/trash empties all trashed tasks for user", async () => {
    // 1. Create two tasks for User 1 and one for User 2
    const c1 = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "User 1 Trash 1" }),
    });
    const t1 = await c1.json();

    const c2 = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "User 1 Trash 2" }),
    });
    const t2 = await c2.json();

    const c3 = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser2,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "User 2 Active Task" }),
    });
    const t3 = await c3.json();

    // Soft delete User 1 tasks
    await fetch(`${baseUrl}/todos/${t1.todoNumber}`, {
      method: "DELETE",
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });
    await fetch(`${baseUrl}/todos/${t2.todoNumber}`, {
      method: "DELETE",
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });

    // 2. Empty Trash for User 1
    const emptyRes = await fetch(`${baseUrl}/todos/trash`, {
      method: "DELETE",
      headers: {
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
    });
    assert.strictEqual(emptyRes.status, 204);

    // 3. Verify User 1 trash is empty
    const trashRes = await fetch(`${baseUrl}/todos/trash`, {
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });
    const trashList = await trashRes.json();
    assert.strictEqual(trashList.length, 0);

    // 4. Verify User 2's task was untouched
    const u2Res = await fetch(`${baseUrl}/todos/${t3.todoNumber}`, {
      headers: { Cookie: authCookiesUser2, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(u2Res.status, 200);
  });

  test("Admin PATCH /admin/todos/:id rejects updating a soft-deleted task", async () => {
    // 1. Create and delete task
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Admin Target Task" }),
    });
    const todo = await createRes.json();

    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "DELETE",
      headers: { Cookie: authCookiesUser1, Origin: "http://localhost:5173" },
    });

    // 2. Admin attempts to edit the deleted task
    const adminPatchRes = await fetch(
      `${baseUrl}/admin/todos/${todo.todoNumber}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesAdmin,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ title: "Attempted Admin Edit" }),
      }
    );
    assert.strictEqual(adminPatchRes.status, 404);
  });
});
