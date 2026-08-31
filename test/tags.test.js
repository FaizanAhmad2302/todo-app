require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const Tag = require("../models/Tag");
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
  await Tag.deleteMany({});
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
  await Tag.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await setupDb.disconnect();
  if (server) server.close();
});

describe("Tags API", () => {
  describe("Authentication", () => {
    test("unauthenticated requests return 401", async () => {
      const res = await fetch(`${baseUrl}/tags`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe("POST /tags", () => {
    test("creates a tag successfully", async () => {
      const res = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Urgent" }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.name, "Urgent");
      assert.strictEqual(data.userId, user1._id.toString());
      assert.ok(data._id);
    });

    test("trims whitespace from tag name", async () => {
      const res = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "  Important  " }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.name, "Important");
    });

    test("rejects empty or whitespace-only tag name", async () => {
      const res = await fetch(`${baseUrl}/tags`, {
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
      assert.strictEqual(data.error, "Tag name cannot be empty");
    });

    test("rejects non-string tag name", async () => {
      const res = await fetch(`${baseUrl}/tags`, {
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
      assert.strictEqual(data.error, "Tag name must be a string");
    });

    test("rejects tag name exceeding 30 characters", async () => {
      const res = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "a".repeat(31) }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Tag name cannot exceed 30 characters");
    });

    test("rejects duplicate tag name for the same user (case-insensitively)", async () => {
      await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Work" }),
      });

      const res = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "work" }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Tag already exists");
    });

    test("allows different users to have tags with identical names", async () => {
      const res1 = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "SharedTag" }),
      });
      assert.strictEqual(res1.status, 201);

      const res2 = await fetch(`${baseUrl}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser2,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "SharedTag" }),
      });
      assert.strictEqual(res2.status, 201);
    });
  });

  describe("GET /tags", () => {
    test("returns all tags for the authenticated user", async () => {
      await Tag.create({ name: "Tag1", userId: user1._id });
      await Tag.create({ name: "Tag2", userId: user1._id });
      await Tag.create({ name: "User2 Tag", userId: user2._id });

      const res = await fetch(`${baseUrl}/tags`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.length, 2);
      const names = data.map((t) => t.name);
      assert.ok(names.includes("Tag1"));
      assert.ok(names.includes("Tag2"));
      assert.ok(!names.includes("User2 Tag"));
    });
  });

  describe("GET /tags/:id", () => {
    test("returns tag by ID for the owner", async () => {
      const tag = await Tag.create({ name: "Urgent", userId: user1._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.name, "Urgent");
    });

    test("returns 404 when accessing another user's tag", async () => {
      const tag = await Tag.create({ name: "Secret", userId: user2._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 404);
    });

    test("returns 400 for invalid ObjectId", async () => {
      const res = await fetch(`${baseUrl}/tags/invalid-id`, {
        headers: {
          Cookie: authCookiesUser1,
        },
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Invalid Tag ID");
    });
  });

  describe("PATCH /tags/:id", () => {
    test("updates tag name successfully", async () => {
      const tag = await Tag.create({ name: "Old Tag", userId: user1._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "New Tag" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.name, "New Tag");

      const updated = await Tag.findById(tag._id);
      assert.strictEqual(updated.name, "New Tag");
    });

    test("rejects renaming to an existing tag name of the same user", async () => {
      await Tag.create({ name: "TagA", userId: user1._id });
      const tag = await Tag.create({ name: "TagB", userId: user1._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "taga" }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Tag already exists");
    });

    test("returns 404 when updating another user's tag", async () => {
      const tag = await Tag.create({ name: "User2 Tag", userId: user2._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ name: "Hijacked Tag" }),
      });

      assert.strictEqual(res.status, 404);
    });
  });

  describe("DELETE /tags/:id & Cascade Reference Cleanup", () => {
    test("deletes tag and pulls tag ID from all associated user Todos", async () => {
      const tag1 = await Tag.create({ name: "Urgent", userId: user1._id });
      const tag2 = await Tag.create({ name: "Home", userId: user1._id });

      const todo1 = await Todo.create({
        userId: user1._id,
        todoNumber: 1,
        title: "Task 1",
        tags: [tag1._id, tag2._id],
      });
      const todo2 = await Todo.create({
        userId: user1._id,
        todoNumber: 2,
        title: "Task 2",
        tags: [tag1._id],
      });

      // User2 todo with user2 tag
      const user2Tag = await Tag.create({
        name: "User2 Urgent",
        userId: user2._id,
      });
      const todoUser2 = await Todo.create({
        userId: user2._id,
        todoNumber: 3,
        title: "User 2 Task",
        tags: [user2Tag._id],
      });

      const res = await fetch(`${baseUrl}/tags/${tag1._id}`, {
        method: "DELETE",
        headers: {
          Cookie: authCookiesUser1,
          Origin: "http://localhost:5173",
        },
      });

      assert.strictEqual(res.status, 204);

      // Verify tag deleted
      const checkTag = await Tag.findById(tag1._id);
      assert.strictEqual(checkTag, null);

      // Verify Todo1 now only has tag2
      const checkTodo1 = await Todo.findById(todo1._id);
      assert.ok(checkTodo1);
      assert.strictEqual(checkTodo1.tags.length, 1);
      assert.strictEqual(checkTodo1.tags[0].toString(), tag2._id.toString());

      // Verify Todo2 now has empty tags array
      const checkTodo2 = await Todo.findById(todo2._id);
      assert.ok(checkTodo2);
      assert.strictEqual(checkTodo2.tags.length, 0);

      // Verify user2 todo is untouched
      const checkUser2Todo = await Todo.findById(todoUser2._id);
      assert.strictEqual(checkUser2Todo.tags.length, 1);
      assert.strictEqual(
        checkUser2Todo.tags[0].toString(),
        user2Tag._id.toString()
      );
    });

    test("returns 404 when deleting another user's tag", async () => {
      const tag = await Tag.create({ name: "User2 Tag", userId: user2._id });

      const res = await fetch(`${baseUrl}/tags/${tag._id}`, {
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
