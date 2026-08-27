require("dotenv").config();
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const app = require("../app");
const setupDb = require("./setupDb");
const Todo = require("../models/Todo");
const Counter = require("../models/Counter");
const { createTestUser, loginUser } = require("./testHelpers");
const {
  addTodo,
  getTodo,
  updateTodo,
  getTodos,
  validateDueDate,
} = require("../todo");

let server, baseUrl;
let mockUserId;
let mockUserId2;

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

  mockUserId = new mongoose.Types.ObjectId();
  mockUserId2 = new mongoose.Types.ObjectId();
});

after(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await setupDb.disconnect();
  server.close();
});

test("[Service] validateDueDate returns null for undefined/null", () => {
  assert.strictEqual(validateDueDate(undefined), undefined);
  assert.strictEqual(validateDueDate(null), null);
});

test("[Service] validateDueDate throws on invalid date string", () => {
  assert.throws(() => validateDueDate("invalid-date"), /Invalid due date/);
});

test("[Service] validateDueDate throws if isNew and date in past", () => {
  const pastDate = new Date(Date.now() - 10000).toISOString();
  assert.throws(
    () => validateDueDate(pastDate, true),
    /Due date cannot be in the past/
  );
});

test("[Service] validateDueDate succeeds for valid future date", () => {
  const futureDate = new Date(Date.now() + 100000).toISOString();
  const date = validateDueDate(futureDate, true);
  assert.ok(date instanceof Date);
});

test("[Service] validateDueDate succeeds for past date if not isNew", () => {
  const pastDate = new Date(Date.now() - 10000).toISOString();
  const date = validateDueDate(pastDate, false);
  assert.ok(date instanceof Date);
});

test("[Service] addTodo saves dueDate", async () => {
  const futureDate = new Date(Date.now() + 100000).toISOString();
  const todoNumber = await addTodo(mockUserId, "Task 1", futureDate);
  const todo = await getTodo(mockUserId, todoNumber);

  assert.strictEqual(todo.title, "Task 1");
  assert.strictEqual(
    todo.dueDate.toISOString(),
    new Date(futureDate).toISOString()
  );
});

test("[Service] updateTodo modifies dueDate", async () => {
  const todoNumber = await addTodo(mockUserId, "Task 1");
  const futureDate = new Date(Date.now() + 100000).toISOString();

  await updateTodo(mockUserId, todoNumber, { dueDate: futureDate });
  let todo = await getTodo(mockUserId, todoNumber);
  assert.strictEqual(
    todo.dueDate.toISOString(),
    new Date(futureDate).toISOString()
  );

  // Remove due date
  await updateTodo(mockUserId, todoNumber, { dueDate: null });
  todo = await getTodo(mockUserId, todoNumber);
  assert.strictEqual(todo.dueDate, undefined);
});

test("[API] GET /todos returns dueDates and sorts correctly", async () => {
  await createTestUser("testuser1@example.com", "password", "user");
  const authCookies = await loginUser(
    baseUrl,
    "testuser1@example.com",
    "password"
  );

  const futureDate1 = new Date(Date.now() + 200000).toISOString();
  const futureDate2 = new Date(Date.now() + 100000).toISOString(); // Earlier

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "No Date" }),
  });

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Date 2", dueDate: futureDate1 }),
  });

  await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Date 1", dueDate: futureDate2 }),
  });

  const res = await fetch(`${baseUrl}/todos?sort=dueDate`, {
    headers: { Cookie: authCookies },
  });
  const body = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 3);

  assert.strictEqual(body[0].title, "Date 1");
  assert.strictEqual(body[1].title, "Date 2");
  assert.strictEqual(body[2].title, "No Date");
});

test("[API] POST /todos rejects past date", async () => {
  await createTestUser("testuser2@example.com", "password", "user");
  const authCookies = await loginUser(
    baseUrl,
    "testuser2@example.com",
    "password"
  );
  const pastDate = new Date(Date.now() - 10000).toISOString();

  const res = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "Past Date", dueDate: pastDate }),
  });

  const body = await res.json();
  assert.strictEqual(res.status, 400);
  assert.match(body.error, /in the past/);
});

test("[API/Security] PATCH /todos/:id prevents modifying another user's dueDate", async () => {
  await createTestUser("testuser3@example.com", "password", "user");
  await createTestUser("testuser4@example.com", "password", "user");
  const authCookies1 = await loginUser(
    baseUrl,
    "testuser3@example.com",
    "password"
  );
  const authCookies2 = await loginUser(
    baseUrl,
    "testuser4@example.com",
    "password"
  );

  const futureDate = new Date(Date.now() + 100000).toISOString();

  const postRes = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies1,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ title: "My Task", dueDate: futureDate }),
  });
  const postBody = await postRes.json();
  const todoId = postBody.todoNumber;

  const newFutureDate = new Date(Date.now() + 200000).toISOString();

  // User 2 tries to modify
  const patchRes = await fetch(`${baseUrl}/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookies2,
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ dueDate: newFutureDate }),
  });
  assert.strictEqual(patchRes.status, 404); // Returns 404 because todo not found for User 2

  // User 1 verifies it wasn't modified
  const getRes = await fetch(`${baseUrl}/todos/${todoId}`, {
    headers: { Cookie: authCookies1 },
  });
  const getBody = await getRes.json();
  assert.strictEqual(getBody.dueDate, futureDate);
});
