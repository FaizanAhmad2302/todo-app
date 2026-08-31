const express = require("express");
const todoRouter = require("./routes/todos");

const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const profileRouter = require("./routes/profile");
const categoriesRouter = require("./routes/categories");
const tagsRouter = require("./routes/tags");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const { csrfProtection, allowedOrigins } = require("./middleware/csrf");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests) if desired,
      // but for strict browser security we check if it's in the allowed list.
      // Since it's an API meant for our frontend, we strict check.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        const corsError = new Error(
          "CORS policy violation: Unauthorized origin"
        );
        corsError.status = 403;
        callback(corsError);
      }
    },
    credentials: true,
  })
);
app.use(csrfProtection);
app.use(cookieParser());
app.use(helmet());

// Tighten body parser limit
app.use(express.json({ limit: "1kb" }));

// Rate limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "test" ? 5000 : 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many write requests, please try again later." },
});

// Apply rate limiting to all write methods
app.use((req, res, next) => {
  if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Swagger UI — conditionally mounted based on environment variable (or in test environment)
if (process.env.SWAGGER_ENABLED === "true" || process.env.NODE_ENV === "test") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/profile", profileRouter);
app.use("/categories", categoriesRouter);
app.use("/tags", tagsRouter);
app.use("/todos", todoRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  let message;
  if (status === 500) {
    message = "Internal server error";
  } else if (err.type === "entity.parse.failed") {
    message = "Invalid JSON in request body";
  } else {
    message = err.message;
  }

  res.status(status).json({ error: message });
});

module.exports = app;
