require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const Counter = require("../models/Counter");
const User = require("../models/User");
const Session = require("../models/Session");

const { createTestUser, loginUser } = require("./testHelpers");

let server, baseUrl;
let adminCookies;
let userCookies;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await setupDb.disconnect();
  if (server) server.close();
});

// A helper to initialize the db
async function initDb() {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});

  const normalUser = await createTestUser(
    "user@example.com",
    "Password123!",
    "user"
  );
  const userCookies = await loginUser(
    baseUrl,
    "user@example.com",
    "Password123!"
  );

  const adminUser = await createTestUser(
    "admin@example.com",
    "AdminPassword123!",
    "admin"
  );
  const adminCookies = await loginUser(
    baseUrl,
    "admin@example.com",
    "AdminPassword123!"
  );

  await Todo.create({
    userId: normalUser._id,
    todoNumber: 1,
    title: "Normal user todo 1",
    completed: false,
  });
  await Todo.create({
    userId: adminUser._id,
    todoNumber: 2,
    title: "Admin user todo 1",
    completed: true,
  });

  return { normalUser, adminUser, userCookies, adminCookies };
}

describe("Admin Functionality - Phase 2", () => {
  let userCookies, adminCookies;

  beforeEach(async () => {
    const data = await initDb();
    userCookies = data.userCookies;
    adminCookies = data.adminCookies;
  });

  test("Normal user cannot retrieve all admin users", async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: userCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 403);
  });

  test("Normal user cannot retrieve all admin todos", async () => {
    const res = await fetch(`${baseUrl}/admin/todos`, {
      headers: { Cookie: userCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 403);
  });

  test("Unauthenticated user returns 401 for admin routes", async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      headers: { Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 401);
  });

  test("Admin can retrieve users (excludes admins) and sensitive info is redacted", async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 200);
    const users = await res.json();

    // Admins are excluded from normal user lists, so we should only see 1
    assert.strictEqual(users.length, 1);
    assert.strictEqual(users[0].role, "user");

    const normalUser = users.find((u) => u.email === "user@example.com");
    assert.strictEqual(normalUser.passwordHash, undefined);
  });

  test("Admin can retrieve all todos mapped by userId with proper timestamps", async () => {
    const res = await fetch(`${baseUrl}/admin/todos`, {
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 200);
    const todos = await res.json();
    assert.strictEqual(todos.length, 2);
  });
});

describe("Admin Functionality - Phase 4 (Manage & Delete)", () => {
  let normalUser1, normalUser2, adminUser2;
  let userCookies, adminCookies;

  beforeEach(async () => {
    const data = await initDb();
    normalUser1 = data.normalUser;
    userCookies = data.userCookies;
    adminCookies = data.adminCookies;

    normalUser2 = await createTestUser(
      "user2@example.com",
      "Password123!",
      "user"
    );
    await Todo.create({
      userId: normalUser2._id,
      todoNumber: 3,
      title: "User 2 todo",
      completed: false,
    });
    await loginUser(baseUrl, "user2@example.com", "Password123!");

    adminUser2 = await createTestUser(
      "admin2@example.com",
      "AdminPassword123!",
      "admin"
    );
  });

  test("Admin can edit another user's Todo", async () => {
    const res = await fetch(`${baseUrl}/admin/todos/1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ title: "Updated by admin", completed: true }),
    });
    assert.strictEqual(res.status, 200);
    const dbTodo = await Todo.findOne({ todoNumber: 1 });
    assert.strictEqual(dbTodo.title, "Updated by admin");
    assert.strictEqual(dbTodo.userId.toString(), normalUser1._id.toString());
  });

  test("Admin cannot change ownership of a Todo", async () => {
    const res = await fetch(`${baseUrl}/admin/todos/1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ userId: adminUser2._id }),
    });
    assert.strictEqual(res.status, 400);
    const dbTodo = await Todo.findOne({ todoNumber: 1 });
    assert.strictEqual(dbTodo.userId.toString(), normalUser1._id.toString());
  });

  test("Admin can delete another user's Todo", async () => {
    const res = await fetch(`${baseUrl}/admin/todos/1`, {
      method: "DELETE",
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 204);
    const dbTodo = await Todo.findOne({ todoNumber: 1 });
    assert.strictEqual(dbTodo, null);
  });

  test("Admin can permanently delete a normal user, cascading to Todos and Sessions", async () => {
    const res = await fetch(`${baseUrl}/admin/users/${normalUser2._id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 204);

    const dbUser = await User.findById(normalUser2._id);
    assert.strictEqual(dbUser, null);

    const dbTodos = await Todo.find({ userId: normalUser2._id });
    assert.strictEqual(dbTodos.length, 0);

    const dbSessions = await Session.find({ userId: normalUser2._id });
    assert.strictEqual(dbSessions.length, 0);

    const dbUser1 = await User.findById(normalUser1._id);
    assert.ok(dbUser1);
  });

  test("Admin cannot delete themselves", async () => {
    const adminUser = await User.findOne({ email: "admin@example.com" });
    const res = await fetch(`${baseUrl}/admin/users/${adminUser._id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 403);
  });

  test("Admin cannot delete another admin", async () => {
    const res = await fetch(`${baseUrl}/admin/users/${adminUser2._id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 403);
  });

  test("Normal user receives 403 for Admin modification endpoints", async () => {
    const reqs = [
      fetch(`${baseUrl}/admin/todos/2`, {
        method: "PATCH",
        headers: {
          Cookie: userCookies,
          Origin: "http://localhost:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      }),
      fetch(`${baseUrl}/admin/todos/2`, {
        method: "DELETE",
        headers: { Cookie: userCookies, Origin: "http://localhost:5173" },
      }),
      fetch(`${baseUrl}/admin/users/${adminUser2._id}`, {
        method: "DELETE",
        headers: { Cookie: userCookies, Origin: "http://localhost:5173" },
      }),
    ];

    const results = await Promise.all(reqs);
    for (const res of results) {
      assert.strictEqual(res.status, 403);
    }
  });

  test("Unauthenticated user receives 401", async () => {
    const res = await fetch(`${baseUrl}/admin/todos/1`, {
      method: "DELETE",
      headers: { Origin: "http://localhost:5173" },
    });
    assert.strictEqual(res.status, 401);
  });
});
