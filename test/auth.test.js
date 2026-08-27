require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");

const setupDb = require("./setupDb");
const app = require("../app");
const User = require("../models/User");
const Session = require("../models/Session");

let server, baseUrl;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
});

after(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await setupDb.disconnect();
  server.close();
});

describe("Auth API", () => {
  test("signup creates a user", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email: "test@example.com", password: "password123" }),
    });

    assert.strictEqual(res.status, 201);
    
    const user = await User.findOne({ email: "test@example.com" });
    assert.ok(user);
    assert.strictEqual(user.name, "Test User");
  });

  test("login creates a session and sets cookies", async () => {
    // Signup via helper to get verified user
    const { createTestUser } = require("./testHelpers");
    await createTestUser("login@example.com", "password123");

    // Login
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "login@example.com", password: "password123" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.user.email, "login@example.com");

    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.ok(setCookie.includes("accessToken"));
    assert.ok(setCookie.includes("refreshToken"));
    assert.ok(setCookie.includes("familyId"));

    const sessions = await Session.find({});
    assert.strictEqual(sessions.length, 1);
  });
});
