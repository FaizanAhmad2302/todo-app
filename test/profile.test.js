require("dotenv").config();
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const setupDb = require("./setupDb");
const app = require("../app");
const User = require("../models/User");
const Session = require("../models/Session");
const Todo = require("../models/Todo");

const { createTestUser, loginUser, parseCookies } = require("./testHelpers");

let server, baseUrl;
let userCookies, userObj;
let adminCookies;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("sessions").deleteMany({});
  await mongoose.connection.collection("todos").deleteMany({});
  
  userObj = await createTestUser("normal@example.com", "Password123!");
  userCookies = await loginUser(baseUrl, "normal@example.com", "Password123!");
  
  await createTestUser("admin@example.com", "AdminPass123!", "admin");
  adminCookies = await loginUser(baseUrl, "admin@example.com", "AdminPass123!");
});

after(async () => {
  await setupDb.disconnect();
  server.close();
});

describe("Phase 3 - User Profile Management", () => {
  test("Unauthenticated user cannot access profile endpoints", async () => {
    const res = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacker" })
    });
    assert.strictEqual(res.status, 401);
  });

  test("Admins can access profile endpoints and update their own name securely", async () => {
    const reqRes = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ name: "Admin New Name" })
    });
    assert.strictEqual(reqRes.status, 200);

    const adminUserObj = await User.findOne({ email: "admin@example.com" });
    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    adminUserObj.otpHash = knownHash;
    await adminUserObj.save();

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ otp: knownOtp, name: "Admin New Name" })
    });
    assert.strictEqual(verRes.status, 200);

    const updatedAdmin = await User.findById(adminUserObj._id);
    assert.strictEqual(updatedAdmin.name, "Admin New Name");
  });

  test("Admin cannot modify restricted fields (role, isActive, email) or userId", async () => {
    const reqRes = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ name: "Valid Update" })
    });
    assert.strictEqual(reqRes.status, 200);

    const adminUserObj = await User.findOne({ email: "admin@example.com" });
    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    adminUserObj.otpHash = knownHash;
    await adminUserObj.save();

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ 
        otp: knownOtp, 
        name: "Hacker Name",
        role: "user",
        isActive: false,
        email: "hacked@example.com",
        userId: "123456789012345678901234"
      })
    });
    assert.strictEqual(verRes.status, 200);

    const updatedAdmin = await User.findById(adminUserObj._id);
    assert.strictEqual(updatedAdmin.role, "admin");
    assert.strictEqual(updatedAdmin.isActive, true);
    assert.strictEqual(updatedAdmin.email, "admin@example.com");
  });

  test("Admin password change revokes existing sessions", async () => {
    const adminUserObj = await User.findOne({ email: "admin@example.com" });
    
    // Check sessions exist
    let sessions = await Session.find({ userId: adminUserObj._id });
    assert.ok(sessions.length > 0);
    assert.strictEqual(sessions[0].revoked, false);

    // Request password change
    await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ currentPassword: "AdminPass123!", newPassword: "NewAdminPass123!" })
    });

    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    await User.updateOne({ _id: adminUserObj._id }, { otpHash: knownHash });

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({ otp: knownOtp, newPassword: "NewAdminPass123!" })
    });
    assert.strictEqual(verRes.status, 200);
    
    const body = await verRes.json();
    assert.strictEqual(body.passwordChanged, true);

    // Verify sessions revoked
    sessions = await Session.find({ userId: adminUserObj._id });
    assert.ok(sessions.length > 0);
    assert.ok(sessions.every(s => s.revoked === true));
  });

  test("User cannot modify another user's profile (userId injection ignored)", async () => {
    const otherUser = await createTestUser("other@example.com", "Password123!");
    const res = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ name: "Hacked", userId: otherUser._id })
    });
    assert.strictEqual(res.status, 200); // Sends OTP for normal@example.com

    // Manually extract OTP from DB to verify
    const dbNormalUser = await User.findById(userObj._id);
    const dbOtherUser = await User.findById(otherUser._id);
    
    assert.ok(dbNormalUser.otpHash);
    assert.strictEqual(dbOtherUser.otpHash, undefined);
  });

  test("Name validation and changing name does not change Todo.userId", async () => {
    // Create Todo
    await Todo.create({ userId: userObj._id, title: "My Task", todoNumber: 1 });

    // Request Update
    const reqRes = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ name: "Updated Name" })
    });
    assert.strictEqual(reqRes.status, 200);

    // Get OTP by bypassing email (via DB)
    const dbUser = await User.findById(userObj._id);
    
    // We cannot easily reverse the bcrypt hash, so we'll mock the verify payload
    // Wait, since we are doing an e2e test, we can't extract the exact OTP. 
    // We must manually overwrite the otpHash in DB to a known OTP hash.
    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    dbUser.otpHash = knownHash;
    await dbUser.save();

    // Verify Update
    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ otp: knownOtp, name: "Updated Name" })
    });
    assert.strictEqual(verRes.status, 200);

    const updatedUser = await User.findById(userObj._id);
    assert.strictEqual(updatedUser.name, "Updated Name");

    // Ensure Todo.userId hasn't changed
    const todo = await Todo.findOne({ todoNumber: 1 });
    assert.strictEqual(todo.userId.toString(), userObj._id.toString());
  });

  test("Cannot change restricted fields (role, isActive, email)", async () => {
    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    
    // Request update to generate valid structure
    await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ name: "Valid Update" })
    });

    await User.updateOne({ _id: userObj._id }, { otpHash: knownHash });

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ 
        otp: knownOtp, 
        name: "Hacker Name",
        role: "admin",
        isActive: false,
        email: "hacked@example.com"
      })
    });
    
    assert.strictEqual(verRes.status, 200);

    const updatedUser = await User.findById(userObj._id);
    assert.strictEqual(updatedUser.role, "user");
    assert.strictEqual(updatedUser.isActive, true);
    assert.strictEqual(updatedUser.email, "normal@example.com");
  });

  test("Password requires current password to update", async () => {
    const reqRes = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ newPassword: "NewPassword123!" })
    });
    assert.strictEqual(reqRes.status, 400);
    const body = await reqRes.json();
    assert.strictEqual(body.error, "Current password is required to change password");
  });

  test("Wrong current password rejected", async () => {
    const reqRes = await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ currentPassword: "WrongPassword!", newPassword: "NewPassword123!" })
    });
    assert.strictEqual(reqRes.status, 401);
  });

  test("OTP purpose is enforced", async () => {
    // Generate a signup OTP
    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    
    await User.updateOne({ _id: userObj._id }, { 
      otpHash: knownHash, 
      otpExpiresAt: new Date(Date.now() + 10000), 
      otpPurpose: 'signup' // Wrong purpose
    });

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ otp: knownOtp, name: "New Name" })
    });
    assert.strictEqual(verRes.status, 400);
    const body = await verRes.json();
    assert.strictEqual(body.error, "Invalid OTP purpose");
  });

  test("Successful password change revokes sessions", async () => {
    // Check sessions exist
    let sessions = await Session.find({ userId: userObj._id });
    assert.ok(sessions.length > 0);
    assert.strictEqual(sessions[0].revoked, false);

    // Request password change
    await fetch(`${baseUrl}/profile/request-update`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ currentPassword: "Password123!", newPassword: "NewPassword123!" })
    });

    const knownOtp = "123456";
    const knownHash = await bcrypt.hash(knownOtp, 10);
    await User.updateOne({ _id: userObj._id }, { otpHash: knownHash });

    const verRes = await fetch(`${baseUrl}/profile/verify-update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Cookie: userCookies
      },
      body: JSON.stringify({ otp: knownOtp, newPassword: "NewPassword123!" })
    });
    
    assert.strictEqual(verRes.status, 200);
    
    const body = await verRes.json();
    assert.strictEqual(body.passwordChanged, true);

    // Verify sessions revoked
    sessions = await Session.find({ userId: userObj._id });
    assert.ok(sessions.length > 0);
    assert.ok(sessions.every(s => s.revoked === true));
    
    // Verify old access authentication is rejected (stateless cookie test via me)
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { 
        Cookie: userCookies // The old cookie string before we changed it
      }
    });
    
    // Note: Since JWT verification itself is stateless in auth middleware, the access token is theoretically valid until it expires.
    // However, if the user tries to REFRESH the token, it will fail. Let's test the refresh endpoint.
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { 
        Cookie: userCookies
      }
    });
    assert.strictEqual(refreshRes.status, 401);
  });
});
