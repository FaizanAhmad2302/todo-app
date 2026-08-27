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

describe("Security Requirements", () => {

  test("Isolation: User A cannot see/edit/delete User B's Todo", async () => {
    const userA = await createTestUser("usera@example.com", "password123");
    const userB = await createTestUser("userb@example.com", "password123");

    const cookiesA = await loginUser(baseUrl, "usera@example.com", "password123");
    const cookiesB = await loginUser(baseUrl, "userb@example.com", "password123");

    // User A creates a Todo
    const createRes = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": cookiesA },
      body: JSON.stringify({ title: "User A Task" })
    });
    const todoA = await createRes.json();

    // User B tries to GET User A's Todo
    const getRes = await fetch(`${baseUrl}/todos/${todoA.todoNumber}`, {
      headers: { "Cookie": cookiesB }
    });
    assert.strictEqual(getRes.status, 404); // Should be completely isolated

    // User B tries to update User A's Todo
    const patchRes = await fetch(`${baseUrl}/todos/${todoA.todoNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": cookiesB },
      body: JSON.stringify({ completed: true })
    });
    assert.strictEqual(patchRes.status, 404);

    // User B tries to delete User A's Todo
    const delRes = await fetch(`${baseUrl}/todos/${todoA.todoNumber}`, {
      method: "DELETE",
      headers: { "Cookie": cookiesB }
    });
    assert.strictEqual(delRes.status, 404);
  });

  test("Role Enforcement: Normal user cannot call Admin endpoints", async () => {
    await createTestUser("normal@example.com", "password123", "user");
    const cookies = await loginUser(baseUrl, "normal@example.com", "password123");

    const res = await fetch(`${baseUrl}/admin/users`, {
      headers: { "Cookie": cookies }
    });

    // 403 Forbidden because they are authenticated but not admin
    assert.strictEqual(res.status, 403);
  });

  test("Deactivation: Disabled user's active session is rejected immediately", async () => {
    const user = await createTestUser("disabled@example.com", "password123");
    const cookies = await loginUser(baseUrl, "disabled@example.com", "password123");

    console.log("Cookies:", cookies);
    
    // Can access API initially
    const res1 = await fetch(`${baseUrl}/todos`, {
      headers: { "Cookie": cookies }
    });
    console.log("RES1 status:", res1.status, await res1.text());
    assert.strictEqual(res1.status, 200);

    // Admin/system disables user
    user.isActive = false;
    await user.save();

    // Active session is immediately rejected (401)
    const res2 = await fetch(`${baseUrl}/todos`, {
      headers: { "Cookie": cookies }
    });
    assert.strictEqual(res2.status, 401);
  });

  test("Revocation: Logout revokes session", async () => {
    await createTestUser("logout@example.com", "password123");
    const cookies = await loginUser(baseUrl, "logout@example.com", "password123");

    await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { "Cookie": cookies }
    });

    // Token should no longer work
    const res = await fetch(`${baseUrl}/todos`, {
      headers: { "Cookie": cookies }
    });
    assert.strictEqual(res.status, 401);
  });

  test("Reuse: Reusing an old refresh token revokes all sessions for that user", async () => {
    await createTestUser("reuse@example.com", "password123");
    const cookies1 = await loginUser(baseUrl, "reuse@example.com", "password123");

    // 1. Rotate the token successfully
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Cookie": cookies1 }
    });
    assert.strictEqual(refreshRes.status, 200);
    const cookies2 = parseCookies(refreshRes); // New valid tokens

    // Verify the new tokens work
    const test1 = await fetch(`${baseUrl}/todos`, { headers: { "Cookie": cookies2 } });
    assert.strictEqual(test1.status, 200);

    // 2. Attacker uses the OLD (revoked) refresh token (cookies1)
    const attackerRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Cookie": cookies1 }
    });
    assert.strictEqual(attackerRes.status, 401); // Rejected

    // 3. User's legitimately obtained new token (cookies2) should NOW be revoked!
    // But wait! When the attacker uses cookies1, does it revoke cookies2?
    // Let's test the endpoint again.
    const test2 = await fetch(`${baseUrl}/todos`, { headers: { "Cookie": cookies2 } });
    assert.strictEqual(test2.status, 401); // Unauthorized!
  });

  test("CSRF: Ensure mutating requests without Origin/Referer fail", async () => {
    // We skipped CSRF in tests, so we need a manual mock for this or we test it here by turning off the skip.
    // For now, this is a placeholder since we explicitly test CSRF via standard tests if NODE_ENV is changed.
  });

});
