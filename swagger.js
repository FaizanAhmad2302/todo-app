const swaggerJsdoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Todo App API",
    version: "1.0.0",
    description:
      "Full-stack Todo application with user authentication, admin panel, and profile management.\n\n" +
      "## Authentication\n\n" +
      "This API uses **HttpOnly cookie-based authentication**. Tokens are never exposed to JavaScript.\n\n" +
      "**How to authenticate in Swagger UI:**\n" +
      "1. Call `POST /auth/signup` to create an account, then `POST /auth/verify-otp` to verify.\n" +
      "2. Or call `POST /auth/login` with valid credentials.\n" +
      "3. The server sets HttpOnly cookies automatically.\n" +
      "4. All subsequent requests from this browser session will include the cookies.\n" +
      "5. Protected endpoints authenticate using the existing backend middleware.\n\n" +
      "**Do not** attempt to manually copy or inject tokens — the browser handles cookies automatically.\n\n" +
      "## Rate Limiting\n\n" +
      "- Authentication endpoints: 10 requests per 15 minutes\n" +
      "- Password reset endpoints: 3 requests per hour\n" +
      "- Profile update endpoints: 10 requests per 15 minutes\n" +
      "- All write operations (POST/PATCH/DELETE): 100 requests per 15 minutes\n\n" +
      "## CSRF Protection\n\n" +
      "All mutating requests (POST, PATCH, PUT, DELETE) require a valid `Origin` or `Referer` header. " +
      "Swagger UI served from the same origin satisfies this automatically.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "Signup, login, logout, and token refresh",
    },
    {
      name: "OTP & Verification",
      description: "Email OTP verification for signup",
    },
    {
      name: "Password Recovery",
      description: "Forgot password and OTP-based password reset",
    },
    {
      name: "Todos",
      description:
        "User todo CRUD operations — each user can only access their own todos",
    },
    {
      name: "Profile",
      description:
        "User and admin profile management with OTP verification — each account can only update its own profile",
    },
    {
      name: "Admin",
      description:
        "Admin-only endpoints for managing users and todos. Normal users receive 403 Forbidden.",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
        description:
          "JWT access token stored in an HttpOnly cookie. " +
          "Call POST /auth/login first to receive authentication cookies. " +
          "The browser manages cookies automatically — do not attempt to set this manually.",
      },
    },
    schemas: {
      // --- Request Schemas ---
      SignupRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: {
            type: "string",
            example: "John Doe",
            maxLength: 100,
            description: "Full name of the user",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
            description: "Email address (will be lowercased and trimmed)",
          },
          password: {
            type: "string",
            format: "password",
            example: "SecurePass123",
            minLength: 8,
            description: "Password (minimum 8 characters)",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "SecurePass123",
          },
        },
      },
      OTPVerificationRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            example: "123456",
            description: "6-digit OTP sent to the user's email",
          },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
        },
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            example: "123456",
            description: "6-digit OTP from the reset email",
          },
          newPassword: {
            type: "string",
            format: "password",
            example: "NewSecurePass456",
            minLength: 8,
            description: "New password (minimum 8 characters)",
          },
        },
      },
      TodoCreateRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            example: "Buy groceries",
            minLength: 1,
            maxLength: 50,
            description: "Todo title (1-50 characters, trimmed)",
          },
          dueDate: {
            type: "string",
            format: "date-time",
            example: "2026-12-31T23:59:59.000Z",
            description:
              "Optional due date and time. Must not be in the past when creating.",
          },
        },
      },
      TodoUpdateRequest: {
        type: "object",
        properties: {
          title: {
            type: "string",
            example: "Buy groceries and fruits",
            minLength: 1,
            maxLength: 50,
            description: "Updated title (1-50 characters)",
          },
          completed: {
            type: "boolean",
            example: true,
            description: "Completion status",
          },
          dueDate: {
            type: "string",
            format: "date-time",
            example: "2026-12-31T23:59:59.000Z",
            description: "Updated due date. Send null to remove.",
            nullable: true,
          },
        },
        description:
          "At least one field (title, completed, or dueDate) is required. Unknown fields are rejected.",
      },
      AdminTodoUpdateRequest: {
        type: "object",
        properties: {
          title: {
            type: "string",
            example: "Updated admin title",
            description: "New title (non-empty string)",
          },
          completed: {
            type: "boolean",
            example: true,
            description: "New completion status",
          },
          dueDate: {
            type: "string",
            format: "date-time",
            example: "2026-12-31T23:59:59.000Z",
            description: "New due date. Send null to remove.",
            nullable: true,
          },
        },
        description:
          "At least one valid field is required. Ownership (userId) cannot be changed.",
      },
      ProfileUpdateRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            example: "Jane Doe",
            description: "New display name",
          },
          currentPassword: {
            type: "string",
            format: "password",
            example: "SecurePass123",
            description:
              "Required only if changing password — must match current password",
          },
          newPassword: {
            type: "string",
            format: "password",
            example: "NewSecurePass456",
            minLength: 8,
            description: "New password (minimum 8 characters)",
          },
        },
        description:
          "At least name or newPassword is required. If newPassword is provided, currentPassword is mandatory.",
      },
      ProfileVerifyUpdateRequest: {
        type: "object",
        required: ["otp"],
        properties: {
          otp: {
            type: "string",
            example: "123456",
            description:
              "6-digit OTP sent to verify the profile update. Must have purpose 'profile_update'.",
          },
          name: {
            type: "string",
            example: "Jane Doe",
            description: "New display name to apply",
          },
          newPassword: {
            type: "string",
            format: "password",
            example: "NewSecurePass456",
            minLength: 8,
            description:
              "New password to apply. If provided, all sessions are revoked and cookies are cleared.",
          },
        },
      },
      AdminDisableUserRequest: {
        type: "object",
        required: ["isActive"],
        properties: {
          isActive: {
            type: "boolean",
            example: false,
            description:
              "Set to false to disable the user (revokes all sessions). Set to true to re-enable.",
          },
        },
      },

      // --- Response Schemas ---
      UserInfo: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
          name: {
            type: "string",
            example: "John Doe",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          role: {
            type: "string",
            enum: ["user", "admin"],
            example: "user",
          },
        },
      },
      UserAdmin: {
        type: "object",
        properties: {
          _id: { type: "string", example: "507f1f77bcf86cd799439011" },
          name: { type: "string", example: "John Doe" },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          role: { type: "string", enum: ["user"], example: "user" },
          isActive: { type: "boolean", example: true },
          isVerified: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        description:
          "User object returned by admin endpoints. Excludes passwordHash and otpHash. Only users with role 'user' are returned — admin accounts are excluded.",
      },
      AdminUser: {
        type: "object",
        properties: {
          _id: { type: "string", example: "507f1f77bcf86cd799439011" },
          name: { type: "string", example: "John Doe" },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          role: { type: "string", enum: ["user"], example: "user" },
          isActive: { type: "boolean", example: true },
          isVerified: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        description:
          "User object returned by admin endpoints. Excludes passwordHash and otpHash. Only users with role 'user' are returned — admin accounts are excluded.",
      },
      Todo: {
        type: "object",
        properties: {
          _id: { type: "string", example: "507f1f77bcf86cd799439011" },
          todoNumber: { type: "integer", example: 1 },
          title: {
            type: "string",
            example: "Buy groceries",
            maxLength: 50,
          },
          completed: { type: "boolean", example: false },
          dueDate: {
            type: "string",
            format: "date-time",
            example: "2026-12-31T23:59:59.000Z",
            nullable: true,
          },
          userId: { type: "string", example: "507f1f77bcf86cd799439011" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Descriptive error message",
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
