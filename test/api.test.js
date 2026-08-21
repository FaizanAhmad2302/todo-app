require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const connectDatabase = require("../database");
const app = require("../app");
const Todo = require("../models/Todo");
const Counter = require("../models/Counter");

let server, baseUrl;

before(async () => {
  await connectDatabase(process.env.MONGODB_TEST_URI);
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
});

after(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  server.close();
  await mongoose.disconnect();
});

// --- Helpers ---

async function createTodo(title = "Buy milk") {
  const res = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

// --- POST /todos ---

describe("POST /todos", () => {
  test("returns 201 and the created todo", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy milk" }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.title, "Buy milk");
    assert.strictEqual(body.completed, false);
    assert.ok(body.todoNumber);
  });

  test("returns 400 when title is missing", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("returns 400 when title is empty string", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 when title is only whitespace", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 when title is a number", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: 123 }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 when title exceeds 50 characters", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "A".repeat(51) }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 when body is not valid JSON", async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "Invalid JSON in request body");
  });
});

// --- GET /todos ---

describe("GET /todos", () => {
  test("returns 200 and an empty array when no todos exist", async () => {
    const res = await fetch(`${baseUrl}/todos`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, []);
  });

  test("returns 200 and all todos", async () => {
    await createTodo("First");
    await createTodo("Second");

    const res = await fetch(`${baseUrl}/todos`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.length, 2);
  });

  test("filters by ?completed=true", async () => {
    const todo = await createTodo("Done task");
    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    await createTodo("Not done task");

    const res = await fetch(`${baseUrl}/todos?completed=true`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].completed, true);
  });

  test("filters by ?completed=false", async () => {
    const todo = await createTodo("Done task");
    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    await createTodo("Not done task");

    const res = await fetch(`${baseUrl}/todos?completed=false`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].completed, false);
  });

  test("returns 400 for invalid completed value", async () => {
    const res = await fetch(`${baseUrl}/todos?completed=yes`);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });
});

// --- GET /todos/:id ---

describe("GET /todos/:id", () => {
  test("returns 200 and the todo", async () => {
    const created = await createTodo("Buy eggs");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`);

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.title, "Buy eggs");
  });

  test("returns 404 for a todo that does not exist", async () => {
    const res = await fetch(`${baseUrl}/todos/9999`);

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await fetch(`${baseUrl}/todos/banana`);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("returns 400 for a negative id", async () => {
    const res = await fetch(`${baseUrl}/todos/-1`);

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 for a decimal id", async () => {
    const res = await fetch(`${baseUrl}/todos/1.5`);

    assert.strictEqual(res.status, 400);
  });
});

// --- PATCH /todos/:id ---

describe("PATCH /todos/:id", () => {
  test("updates title and returns 200", async () => {
    const created = await createTodo("Old title");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.title, "New title");
  });

  test("updates completed and returns 200", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.completed, true);
  });

  test("updates both title and completed", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated", completed: true }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.title, "Updated");
    assert.strictEqual(body.completed, true);
  });

  test("is idempotent — setting completed true twice leaves it true", async () => {
    const created = await createTodo("Task");

    await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.completed, true);
  });

  test("returns 400 when no fields are provided", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 for unknown fields", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titel: "typo" }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("titel"));
  });

  test("returns 400 when completed is not a boolean", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: "yes" }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 400 when title is empty", async () => {
    const created = await createTodo("Task");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    assert.strictEqual(res.status, 400);
  });

  test("returns 404 for a todo that does not exist", async () => {
    const res = await fetch(`${baseUrl}/todos/9999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    assert.strictEqual(res.status, 404);
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await fetch(`${baseUrl}/todos/banana`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    assert.strictEqual(res.status, 400);
  });
});

// --- DELETE /todos/:id ---

describe("DELETE /todos/:id", () => {
  test("returns 204 with no body", async () => {
    const created = await createTodo("Delete me");

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 204);
    const text = await res.text();
    assert.strictEqual(text, "");
  });

  test("todo is actually gone after delete", async () => {
    const created = await createTodo("Delete me");

    await fetch(`${baseUrl}/todos/${created.todoNumber}`, {
      method: "DELETE",
    });

    const res = await fetch(`${baseUrl}/todos/${created.todoNumber}`);
    assert.strictEqual(res.status, 404);
  });

  test("returns 404 for a todo that does not exist", async () => {
    const res = await fetch(`${baseUrl}/todos/9999`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 404);
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await fetch(`${baseUrl}/todos/banana`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 400);
  });
});

// --- DELETE /todos ---

describe("DELETE /todos", () => {
  test("returns 403 for unfiltered bulk delete", async () => {
    await createTodo("First");
    await createTodo("Second");

    const res = await fetch(`${baseUrl}/todos?confirm=true`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.error);

    const listRes = await fetch(`${baseUrl}/todos`);
    const list = await listRes.json();
    assert.strictEqual(list.length, 2);
  });

  test("returns 403 if ?confirm=true is missing", async () => {
    const res = await fetch(`${baseUrl}/todos?completed=true`, {
      method: "DELETE",
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("deletes only completed todos with ?completed=true", async () => {
    const todo = await createTodo("Done");
    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    await createTodo("Not done");

    const res = await fetch(`${baseUrl}/todos?completed=true&confirm=true`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 204);

    const listRes = await fetch(`${baseUrl}/todos`);
    const body = await listRes.json();
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].title, "Not done");
  });

  test("deletes only incomplete todos with ?completed=false", async () => {
    const todo = await createTodo("Done");
    await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    await createTodo("Not done");

    const res = await fetch(`${baseUrl}/todos?completed=false&confirm=true`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 204);

    const listRes = await fetch(`${baseUrl}/todos`);
    const body = await listRes.json();
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].title, "Done");
  });

  test("returns 400 for invalid completed value", async () => {
    const res = await fetch(`${baseUrl}/todos?completed=yes&confirm=true`, {
      method: "DELETE",
    });

    assert.strictEqual(res.status, 400);
  });
});

// --- Unknown routes ---

describe("Unknown routes", () => {
  test("returns 404 JSON for unknown path", async () => {
    const res = await fetch(`${baseUrl}/unknown`);

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("returns 404 JSON for typo in /todos path", async () => {
    const res = await fetch(`${baseUrl}/todo/1`);

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
  });
});
