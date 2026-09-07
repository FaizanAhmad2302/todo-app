const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const setupDb = require("./setupDb");
const Todo = require("../models/Todo");
const User = require("../models/User");
const Session = require("../models/Session");
const Counter = require("../models/Counter");
const { createTestUser, loginUser } = require("./testHelpers");

let server, baseUrl;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
});

after(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await setupDb.disconnect();
  server.close();
});

test("[API] POST /todos creates a todo with default Medium priority", async () => {
  await createTestUser("test1@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test1@example.com", "password");

  const res = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Default Priority" }),
  });

  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.priority, "Medium");
});

test("[API] POST /todos creates a todo with High priority", async () => {
  await createTestUser("test2@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test2@example.com", "password");

  const res = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "High Priority", priority: "High" }),
  });

  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.priority, "High");
});

test("[API] POST /todos rejects an invalid priority", async () => {
  await createTestUser("test3@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test3@example.com", "password");

  const res = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Invalid", priority: "SuperHigh" }),
  });

  const body = await res.json();
  assert.strictEqual(res.status, 400);
  assert.match(body.error, /priority must be Low, Medium, or High/i);
});

test("[API] PATCH /todos/:id updates a todo's priority", async () => {
  await createTestUser("test4@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test4@example.com", "password");

  const postRes = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Update me" }),
  });
  const todo = await postRes.json();
  const todoId = todo.todoNumber;

  const patchRes = await fetch(`${baseUrl}/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ priority: "Low" }),
  });

  const patchBody = await patchRes.json();
  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchBody.priority, "Low");
});

test("[API] GET /todos?priority=High filters todos by priority", async () => {
  await createTestUser("test5@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test5@example.com", "password");

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Task 1", priority: "Low" }),
  });
  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Task 2", priority: "High" }),
  });

  const getRes = await fetch(`${baseUrl}/todos?priority=High`, {
    headers: { Cookie: authCookies, Origin: "http://localhost:5173" },
  });
  const getBody = await getRes.json();
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getBody.length, 1);
  assert.strictEqual(getBody[0].title, "Task 2");
});

test("[API] GET /todos?sort=priority sorts correctly (High -> Medium -> Low)", async () => {
  await createTestUser("test6@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test6@example.com", "password");

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "P3", priority: "Low" }),
  });
  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "P1", priority: "High" }),
  });
  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "P2", priority: "Medium" }),
  });

  const getRes = await fetch(`${baseUrl}/todos?sort=priority`, {
    headers: { Cookie: authCookies, Origin: "http://localhost:5173" },
  });
  const getBody = await getRes.json();
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getBody.length, 3);
  assert.strictEqual(getBody[0].title, "P1");
  assert.strictEqual(getBody[1].title, "P2");
  assert.strictEqual(getBody[2].title, "P3");
});

test("[API/Admin] GET /admin/todos?priority=High filters todos", async () => {
  await createTestUser("test7@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test7@example.com", "password");

  await createTestUser("admin1@example.com", "password", "admin");
  const adminCookies = await loginUser(
    baseUrl,
    "admin1@example.com",
    "password"
  );

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "User Task High", priority: "High" }),
  });

  const adminRes = await fetch(`${baseUrl}/admin/todos?priority=High`, {
    headers: { Cookie: adminCookies, Origin: "http://localhost:5173" },
  });
  const adminBody = await adminRes.json();
  assert.strictEqual(adminRes.status, 200);
  assert.strictEqual(adminBody.length, 1);
  assert.strictEqual(adminBody[0].title, "User Task High");
});

test("[API/Admin] PATCH /admin/todos/:id updates priority", async () => {
  await createTestUser("test8@example.com", "password", "user");
  const authCookies = await loginUser(baseUrl, "test8@example.com", "password");

  await createTestUser("admin2@example.com", "password", "admin");
  const adminCookies = await loginUser(
    baseUrl,
    "admin2@example.com",
    "password"
  );

  const postRes = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Task To Update" }),
  });
  const postBody = await postRes.json();
  const todoId = postBody.todoNumber;

  const patchRes = await fetch(`${baseUrl}/admin/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ priority: "High" }),
  });
  const patchBody = await patchRes.json();

  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchBody.priority, "High");
});
