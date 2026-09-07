require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const Category = require("../models/Category");
const Counter = require("../models/Counter");

const { createTestUser, loginUser } = require("./testHelpers");

let server, baseUrl;
let authCookiesUser1, authCookiesUser2;
let user1, user2;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Category.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});

  user1 = await createTestUser("user1@example.com", "Password123!");
  user2 = await createTestUser("user2@example.com", "Password123!");

  authCookiesUser1 = await loginUser(
    baseUrl,
    "user1@example.com",
    "Password123!"
  );
  authCookiesUser2 = await loginUser(
    baseUrl,
    "user2@example.com",
    "Password123!"
  );
});

after(async () => {
  await Todo.deleteMany({});
  await Category.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await setupDb.disconnect();
  if (server) server.close();
});

describe("Categories API", () => {
  describe("Authentication", () => {
    test("unauthenticated requests return 401", async () => {
      const res = await fetch(`${baseUrl}/categories`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe("POST /categories", () => {
    test("creates a category successfully", async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Work" }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.name, "Work");
      assert.strictEqual(data.userId, user1._id.toString());
      assert.ok(data._id);
    });

    test("trims whitespace from category name", async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "  Personal  " }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.name, "Personal");
    });

    test("rejects empty or whitespace-only category name", async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "   " }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Category name cannot be empty");
    });

    test("rejects non-string category name", async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: 12345 }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Category name must be a string");
    });

    test("rejects category name exceeding 50 characters", async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "a".repeat(51) }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(
        data.error,
        "Category name cannot exceed 50 characters"
      );
    });

    test("rejects duplicate category name for the same user (case-insensitively)", async () => {
      await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Shopping" }),
      });

      const res = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "shopping" }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Category already exists");
    });

    test("allows different users to have categories with identical names", async () => {
      const res1 = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Projects" }),
      });
      assert.strictEqual(res1.status, 201);

      const res2 = await fetch(`${baseUrl}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser2,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Projects" }),
      });
      assert.strictEqual(res2.status, 201);
    });
  });

  describe("GET /categories", () => {
    test("returns all categories for the authenticated user", async () => {
      await Category.create({ name: "Work", userId: user1._id });
      await Category.create({ name: "Fitness", userId: user1._id });
      await Category.create({ name: "User2 Cat", userId: user2._id });

      const res = await fetch(`${baseUrl}/categories`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.length, 2);
      const names = data.map((c) => c.name);
      assert.ok(names.includes("Work"));
      assert.ok(names.includes("Fitness"));
      assert.ok(!names.includes("User2 Cat"));
    });
  });

  describe("GET /categories/:id", () => {
    test("returns category by ID for the owner", async () => {
      const cat = await Category.create({ name: "Work", userId: user1._id });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.name, "Work");
    });

    test("returns 404 when accessing another user's category", async () => {
      const cat = await Category.create({ name: "Secret", userId: user2._id });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 404);
    });

    test("returns 400 for invalid ObjectId", async () => {
      const res = await fetch(`${baseUrl}/categories/invalid-id`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Invalid Category ID");
    });
  });

  describe("PATCH /categories/:id", () => {
    test("updates category name successfully", async () => {
      const cat = await Category.create({
        name: "Old Name",
        userId: user1._id,
      });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "New Name" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.name, "New Name");

      const updated = await Category.findById(cat._id);
      assert.strictEqual(updated.name, "New Name");
    });

    test("rejects renaming to an existing category name of the same user", async () => {
      await Category.create({ name: "Work", userId: user1._id });
      const cat = await Category.create({ name: "Health", userId: user1._id });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "work" }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Category already exists");
    });

    test("returns 404 when updating another user's category", async () => {
      const cat = await Category.create({
        name: "User2 Cat",
        userId: user2._id,
      });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Hijacked Name" }),
      });

      assert.strictEqual(res.status, 404);
    });
  });

  describe("DELETE /categories/:id & Cascade Reference Cleanup", () => {
    test("deletes category and unsets categoryId on existing user Todos", async () => {
      const cat = await Category.create({ name: "Work", userId: user1._id });
      const todo1 = await Todo.create({
        userId: user1._id,
        todoNumber: 1,
        title: "Task 1",
        categoryId: cat._id,
      });
      const todo2 = await Todo.create({
        userId: user1._id,
        todoNumber: 2,
        title: "Task 2",
        categoryId: cat._id,
      });

      // User2 todo with same category shouldn't exist, but verify user2 todos are untouched
      const user2Cat = await Category.create({
        name: "User2 Work",
        userId: user2._id,
      });
      const todoUser2 = await Todo.create({
        userId: user2._id,
        todoNumber: 3,
        title: "User 2 Task",
        categoryId: user2Cat._id,
      });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
      });

      assert.strictEqual(res.status, 204);

      // Verify category deleted
      const checkCat = await Category.findById(cat._id);
      assert.strictEqual(checkCat, null);

      // Verify Todos still exist but categoryId is now null
      const checkTodo1 = await Todo.findById(todo1._id);
      assert.ok(checkTodo1);
      assert.strictEqual(checkTodo1.categoryId, null);

      const checkTodo2 = await Todo.findById(todo2._id);
      assert.ok(checkTodo2);
      assert.strictEqual(checkTodo2.categoryId, null);

      // Verify user2 todo is untouched
      const checkUser2Todo = await Todo.findById(todoUser2._id);
      assert.strictEqual(
        checkUser2Todo.categoryId.toString(),
        user2Cat._id.toString()
      );
    });

    test("returns 404 when deleting another user's category", async () => {
      const cat = await Category.create({
        name: "User2 Cat",
        userId: user2._id,
      });

      const res = await fetch(`${baseUrl}/categories/${cat._id}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
      });

      assert.strictEqual(res.status, 404);
    });
  });
});
