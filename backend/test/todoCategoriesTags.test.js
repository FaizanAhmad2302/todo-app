require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const app = require("../app");
const Todo = require("../models/Todo");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const Counter = require("../models/Counter");

const { createTestUser, loginUser } = require("./testHelpers");

let server, baseUrl;
let authCookiesUser1, authCookiesUser2, authCookiesAdmin;
let user1, user2, adminUser;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Category.deleteMany({});
  await Tag.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});

  user1 = await createTestUser("user1@example.com", "Password123!", "user");
  user2 = await createTestUser("user2@example.com", "Password123!", "user");
  adminUser = await createTestUser(
    "admin@example.com",
    "Password123!",
    "admin"
  );

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
  authCookiesAdmin = await loginUser(
    baseUrl,
    "admin@example.com",
    "Password123!"
  );
});

after(async () => {
  await Todo.deleteMany({});
  await Category.deleteMany({});
  await Tag.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await setupDb.disconnect();
  if (server) server.close();
});

describe("Todo Integration with Categories and Tags", () => {
  test("creates a Todo with category and multiple tags and returns populated objects", async () => {
    const cat = await Category.create({ name: "Work", userId: user1._id });
    const tag1 = await Tag.create({ name: "Urgent", userId: user1._id });
    const tag2 = await Tag.create({ name: "Q3", userId: user1._id });

    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Finish Report",
        categoryId: cat._id.toString(),
        tags: [tag1._id.toString(), tag2._id.toString()],
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.title, "Finish Report");
    assert.ok(data.categoryId);
    assert.strictEqual(data.categoryId.name, "Work");
    assert.strictEqual(data.tags.length, 2);
    const tagNames = data.tags.map((t) => t.name);
    assert.ok(tagNames.includes("Urgent"));
    assert.ok(tagNames.includes("Q3"));
  });

  test("deduplicates duplicate tag IDs on the same Todo", async () => {
    const tag = await Tag.create({ name: "Important", userId: user1._id });

    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Unique tags test",
        tags: [tag._id.toString(), tag._id.toString()],
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.tags.length, 1);
    assert.strictEqual(data.tags[0].name, "Important");
  });

  test("rejects assigning another user's category", async () => {
    const user2Cat = await Category.create({
      name: "User2 Cat",
      userId: user2._id,
    });

    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Cross user test",
        categoryId: user2Cat._id.toString(),
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(
      data.error,
      "Category not found or does not belong to the user"
    );
  });

  test("rejects assigning another user's tag", async () => {
    const user2Tag = await Tag.create({ name: "User2 Tag", userId: user2._id });

    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Cross user tag test",
        tags: [user2Tag._id.toString()],
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(
      data.error,
      "One or more tags not found or do not belong to the user"
    );
  });

  test("rejects assigning more than 10 tags", async () => {
    const tags = [];
    for (let i = 1; i <= 11; i++) {
      const t = await Tag.create({ name: `Tag${i}`, userId: user1._id });
      tags.push(t._id.toString());
    }

    const res = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        title: "Too many tags",
        tags,
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cannot assign more than 10 tags to a task");
  });

  test("filters todos by category and tag", async () => {
    const catWork = await Category.create({ name: "Work", userId: user1._id });
    const catPersonal = await Category.create({
      name: "Personal",
      userId: user1._id,
    });

    const tagUrgent = await Tag.create({ name: "Urgent", userId: user1._id });
    const tagLater = await Tag.create({ name: "Later", userId: user1._id });

    // Todo 1: Work + Urgent
    await Todo.create({
      userId: user1._id,
      todoNumber: 1,
      title: "Work urgent task",
      categoryId: catWork._id,
      tags: [tagUrgent._id],
    });

    // Todo 2: Work + Later
    await Todo.create({
      userId: user1._id,
      todoNumber: 2,
      title: "Work later task",
      categoryId: catWork._id,
      tags: [tagLater._id],
    });

    // Todo 3: Personal + Urgent
    await Todo.create({
      userId: user1._id,
      todoNumber: 3,
      title: "Personal urgent task",
      categoryId: catPersonal._id,
      tags: [tagUrgent._id],
    });

    // Filter by Work category
    const resCat = await fetch(`${baseUrl}/todos?category=${catWork._id}`, {
      headers: { Cookie: authCookiesUser1 },
    });
    const dataCat = await resCat.json();
    assert.strictEqual(dataCat.length, 2);

    // Filter by Urgent tag
    const resTag = await fetch(`${baseUrl}/todos?tag=${tagUrgent._id}`, {
      headers: { Cookie: authCookiesUser1 },
    });
    const dataTag = await resTag.json();
    assert.strictEqual(dataTag.length, 2);

    // Filter by Work + Urgent
    const resBoth = await fetch(
      `${baseUrl}/todos?category=${catWork._id}&tag=${tagUrgent._id}`,
      { headers: { Cookie: authCookiesUser1 } }
    );
    const dataBoth = await resBoth.json();
    assert.strictEqual(dataBoth.length, 1);
    assert.strictEqual(dataBoth[0].title, "Work urgent task");
  });

  test("updates category and tags via PATCH /todos/:id", async () => {
    const cat1 = await Category.create({ name: "Work", userId: user1._id });
    const cat2 = await Category.create({ name: "Life", userId: user1._id });
    const tag1 = await Tag.create({ name: "P1", userId: user1._id });
    const tag2 = await Tag.create({ name: "P2", userId: user1._id });

    const todo = await Todo.create({
      userId: user1._id,
      todoNumber: 1,
      title: "Initial",
      categoryId: cat1._id,
      tags: [tag1._id],
    });

    // Update category and tags
    const res1 = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        categoryId: cat2._id.toString(),
        tags: [tag2._id.toString()],
      }),
    });

    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.strictEqual(data1.categoryId.name, "Life");
    assert.strictEqual(data1.tags[0].name, "P2");

    // Remove category (null) and tags ([])
    const res2 = await fetch(`${baseUrl}/todos/${todo.todoNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookiesUser1,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        categoryId: null,
        tags: [],
      }),
    });

    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.strictEqual(data2.categoryId, null);
    assert.strictEqual(data2.tags.length, 0);
  });

  describe("Admin Todo Operations with Categories & Tags", () => {
    test("admin can edit category and tags on user's todo validating against user's categories", async () => {
      const user1Cat = await Category.create({
        name: "User1 Cat",
        userId: user1._id,
      });
      const user1Tag = await Tag.create({
        name: "User1 Tag",
        userId: user1._id,
      });
      const adminCat = await Category.create({
        name: "Admin Cat",
        userId: adminUser._id,
      });

      const todo = await Todo.create({
        userId: user1._id,
        todoNumber: 1,
        title: "User 1 Task",
      });

      // Admin assigning user1's category & tag -> SUCCESS
      const resSuccess = await fetch(
        `${baseUrl}/admin/todos/${todo.todoNumber}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookiesAdmin,
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify({
            categoryId: user1Cat._id.toString(),
            tags: [user1Tag._id.toString()],
          }),
        }
      );

      assert.strictEqual(resSuccess.status, 200);
      const dataSuccess = await resSuccess.json();
      assert.strictEqual(dataSuccess.categoryId.name, "User1 Cat");
      assert.strictEqual(dataSuccess.tags[0].name, "User1 Tag");

      // Admin assigning admin's own category to user1's todo -> REJECTED (must belong to todo owner)
      const resFail = await fetch(`${baseUrl}/admin/todos/${todo.todoNumber}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookiesAdmin,
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          categoryId: adminCat._id.toString(),
        }),
      });

      assert.strictEqual(resFail.status, 400);
      const dataFail = await resFail.json();
      assert.strictEqual(
        dataFail.error,
        "Category not found or does not belong to the user"
      );
    });
  });
});
