require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");

const setupDb = require("./setupDb");
const app = require("../app");
const User = require("../models/User");
const Session = require("../models/Session");
const Todo = require("../models/Todo");
const { createTestUser, loginUser, parseCookies } = require("./testHelpers");

let server, baseUrl;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await Todo.deleteMany({});
});

after(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await Todo.deleteMany({});
  await setupDb.disconnect();
  server.close();
});

describe("Regression Tests", () => {
  
  test("Test 1: User logs in, receives token, and can successfully GET /todos", async () => {
    await createTestUser("test1@example.com", "password123");
    const cookies = await loginUser(baseUrl, "test1@example.com", "password123");
    
    const response = await fetch(`${baseUrl}/todos`, {
      headers: { cookie: cookies }
    });
    
    assert.strictEqual(response.status, 200, "Expected 200 OK");
    const data = await response.json();
    assert.strictEqual(Array.isArray(data), true, "Expected an array of todos");
  });

  test("Test 2: User can successfully POST /todos using the token", async () => {
    await createTestUser("test2@example.com", "password123");
    const cookies = await loginUser(baseUrl, "test2@example.com", "password123");
    
    const response = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookies
      },
      body: JSON.stringify({ title: "My Test Todo" })
    });
    
    assert.strictEqual(response.status, 201, "Expected 201 Created");
    const data = await response.json();
    assert.strictEqual(data.title, "My Test Todo");
  });

  test("Test 3: Creating a Todo with a mismatched token returns 401", async () => {
    await createTestUser("test3@example.com", "password123");
    const cookies = await loginUser(baseUrl, "test3@example.com", "password123");
    const invalidCookies = cookies.replace(/accessToken=[^;]+;/, "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzMjQ4NzQyMCwiZXhwIjoxNjMyNDg4MzIwfQ.x;");

    const response = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: invalidCookies
      },
      body: JSON.stringify({ title: "Bad Todo" })
    });
    
    assert.strictEqual(response.status, 401, "Expected 401 Unauthorized for invalid token");
  });

  test("Test 4: Creating a Todo without CSRF Origin/Referer header fails (outside test environment)", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await createTestUser("test4@example.com", "password123");
      const cookies = await loginUser(baseUrl, "test4@example.com", "password123");

      const response = await fetch(`${baseUrl}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookies
        },
        body: JSON.stringify({ title: "CSRF Todo" })
      });
      
      assert.strictEqual(response.status, 403, "Expected 403 Forbidden due to missing Origin/Referer");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("Test 5: Refresh token can successfully generate a new access token", async () => {
    await createTestUser("test5@example.com", "password123");
    const cookies = await loginUser(baseUrl, "test5@example.com", "password123");

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookies }
    });

    assert.strictEqual(response.status, 200, "Expected 200 OK for valid refresh");
    const newCookies = parseCookies(response);
    assert.ok(newCookies.includes("accessToken="), "Expected new accessToken in set-cookie");
    assert.ok(newCookies.includes("refreshToken="), "Expected new refreshToken in set-cookie");
  });

  test("Test 6: A disabled user cannot create a Todo even with a valid token", async () => {
    const user = await createTestUser("test6@example.com", "password123");
    const cookies = await loginUser(baseUrl, "test6@example.com", "password123");

    user.isActive = false;
    await user.save();

    const response = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookies
      },
      body: JSON.stringify({ title: "Should Not Create" })
    });
    
    assert.strictEqual(response.status, 401, "Expected 401 Unauthorized for disabled user");
  });

});
