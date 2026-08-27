require("dotenv").config();
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert");

const setupDb = require("./setupDb");
const app = require("../app");
const swaggerSpec = require("../swagger");

let server, baseUrl;

before(async () => {
  await setupDb.connect();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await setupDb.disconnect();
  server.close();
});

describe("Swagger / OpenAPI Integration", () => {
  test("OpenAPI spec has correct metadata and version 3.0.3", () => {
    assert.strictEqual(swaggerSpec.openapi, "3.0.3");
    assert.strictEqual(swaggerSpec.info.title, "Todo App API");
    assert.strictEqual(swaggerSpec.info.version, "1.0.0");
    assert.ok(
      swaggerSpec.info.description.includes(
        "HttpOnly cookie-based authentication"
      )
    );
  });

  test("Security scheme uses cookieAuth with accessToken", () => {
    assert.ok(swaggerSpec.components.securitySchemes.cookieAuth);
    assert.strictEqual(
      swaggerSpec.components.securitySchemes.cookieAuth.type,
      "apiKey"
    );
    assert.strictEqual(
      swaggerSpec.components.securitySchemes.cookieAuth.in,
      "cookie"
    );
    assert.strictEqual(
      swaggerSpec.components.securitySchemes.cookieAuth.name,
      "accessToken"
    );
  });

  test("All required reusable schemas exist", () => {
    const requiredSchemas = [
      "UserInfo",
      "UserAdmin",
      "AdminUser",
      "Todo",
      "Error",
      "SignupRequest",
      "LoginRequest",
      "OTPVerificationRequest",
      "ForgotPasswordRequest",
      "PasswordResetRequest",
      "ProfileUpdateRequest",
      "ProfileVerifyUpdateRequest",
      "TodoCreateRequest",
      "TodoUpdateRequest",
      "AdminTodoUpdateRequest",
      "AdminDisableUserRequest",
    ];

    for (const schemaName of requiredSchemas) {
      assert.ok(
        swaggerSpec.components.schemas[schemaName],
        `Schema ${schemaName} should exist`
      );
    }
  });

  test("All 22 endpoints across 4 route groups are documented", () => {
    const expectedEndpoints = [
      // Authentication
      { method: "post", path: "/auth/signup", tag: "Authentication" },
      { method: "post", path: "/auth/verify-otp", tag: "OTP & Verification" },
      { method: "post", path: "/auth/login", tag: "Authentication" },
      { method: "post", path: "/auth/logout", tag: "Authentication" },
      { method: "post", path: "/auth/refresh", tag: "Authentication" },
      {
        method: "post",
        path: "/auth/forgot-password",
        tag: "Password Recovery",
      },
      {
        method: "post",
        path: "/auth/reset-password",
        tag: "Password Recovery",
      },
      { method: "get", path: "/auth/me", tag: "Authentication" },
      // Todos
      { method: "get", path: "/todos", tag: "Todos" },
      { method: "get", path: "/todos/{id}", tag: "Todos" },
      { method: "post", path: "/todos", tag: "Todos" },
      { method: "patch", path: "/todos/{id}", tag: "Todos" },
      { method: "delete", path: "/todos/{id}", tag: "Todos" },
      { method: "delete", path: "/todos", tag: "Todos" },
      // Profile
      { method: "post", path: "/profile/request-update", tag: "Profile" },
      { method: "put", path: "/profile/verify-update", tag: "Profile" },
      // Admin
      { method: "get", path: "/admin/users", tag: "Admin" },
      { method: "patch", path: "/admin/users/{id}/disable", tag: "Admin" },
      { method: "delete", path: "/admin/users/{id}", tag: "Admin" },
      { method: "get", path: "/admin/todos", tag: "Admin" },
      { method: "patch", path: "/admin/todos/{id}", tag: "Admin" },
      { method: "delete", path: "/admin/todos/{id}", tag: "Admin" },
    ];

    let totalDocumented = 0;
    for (const ep of expectedEndpoints) {
      assert.ok(
        swaggerSpec.paths[ep.path],
        `Path ${ep.path} should exist in Swagger spec`
      );
      assert.ok(
        swaggerSpec.paths[ep.path][ep.method],
        `Method ${ep.method.toUpperCase()} for ${ep.path} should exist`
      );
      assert.ok(
        swaggerSpec.paths[ep.path][ep.method].tags.includes(ep.tag),
        `Endpoint ${ep.method.toUpperCase()} ${ep.path} should have tag ${ep.tag}`
      );
      totalDocumented++;
    }

    assert.strictEqual(totalDocumented, 22);
  });

  test("Admin endpoints are documented with Admin-only designation", () => {
    const adminPaths = [
      { method: "get", path: "/admin/users" },
      { method: "patch", path: "/admin/users/{id}/disable" },
      { method: "delete", path: "/admin/users/{id}" },
      { method: "get", path: "/admin/todos" },
      { method: "patch", path: "/admin/todos/{id}" },
      { method: "delete", path: "/admin/todos/{id}" },
    ];

    for (const ep of adminPaths) {
      const op = swaggerSpec.paths[ep.path][ep.method];
      assert.ok(
        op.summary.includes("Admin-only") ||
          op.description.includes("Admin-only") ||
          op.description.includes("admin"),
        `Admin endpoint ${ep.method.toUpperCase()} ${ep.path} should document admin restriction`
      );
      assert.ok(
        op.responses["403"],
        `Admin endpoint ${ep.path} should document 403 Forbidden`
      );
    }
  });

  test("No sensitive values or credentials leaked in Swagger spec", () => {
    const specString = JSON.stringify(swaggerSpec);

    // Verify secrets, credentials, environment variables, or hashes are never exposed
    assert.strictEqual(specString.includes("mongodb+srv"), false);
    assert.strictEqual(specString.includes("cluster.mongodb.net"), false);
    assert.strictEqual(specString.includes("$2b$10$"), false); // bcrypt hash format
    assert.strictEqual(specString.includes("JWT_ACCESS_SECRET"), false);
    assert.strictEqual(specString.includes("JWT_REFRESH_SECRET"), false);
    assert.strictEqual(specString.includes("SMTP_PASS"), false);
  });

  test("GET /api-docs serves Swagger UI HTML when SWAGGER_ENABLED=true", async () => {
    const res = await fetch(`${baseUrl}/api-docs/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(
      html.includes("swagger-ui"),
      "Response should contain Swagger UI HTML"
    );
  });

  test("CORS: http://localhost:5173 remains an allowed origin with credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(
      res.headers.get("access-control-allow-origin"),
      "http://localhost:5173"
    );
    assert.strictEqual(
      res.headers.get("access-control-allow-credentials"),
      "true"
    );
  });

  test("CORS: http://localhost:3000 (Swagger origin) is an allowed origin with credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(
      res.headers.get("access-control-allow-origin"),
      "http://localhost:3000"
    );
    assert.strictEqual(
      res.headers.get("access-control-allow-credentials"),
      "true"
    );
  });

  test("CORS: Unauthorized external origins are blocked", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://evil-attacker.com",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Password123!",
      }),
    });
    assert.strictEqual(
      res.status,
      403,
      "Unauthorized origin should receive 403 Forbidden"
    );
    const data = await res.json();
    assert.ok(
      data.error.includes("CORS policy violation"),
      "Error message should mention CORS policy violation"
    );
  });

  test("Swagger Flow: POST /auth/login with Origin http://localhost:3000 succeeds and sets working cookies", async () => {
    const { createTestUser, parseCookies } = require("./testHelpers");
    const User = require("../models/User");
    const Session = require("../models/Session");

    await User.deleteMany({});
    await Session.deleteMany({});

    await createTestUser("swagger-user@example.com", "SecurePass123");

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "swagger-user@example.com",
        password: "SecurePass123",
      }),
    });

    assert.strictEqual(loginRes.status, 200, "Swagger login should return 200");
    assert.strictEqual(
      loginRes.headers.get("access-control-allow-origin"),
      "http://localhost:3000"
    );

    const cookies = parseCookies(loginRes);
    assert.ok(cookies.includes("accessToken"), "Must contain accessToken");
    assert.ok(cookies.includes("refreshToken"), "Must contain refreshToken");
    assert.ok(cookies.includes("familyId"), "Must contain familyId");

    // Call protected /auth/me with cookies from Swagger origin
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Cookie: cookies,
        Origin: "http://localhost:3000",
      },
    });

    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.email, "swagger-user@example.com");
  });
});
