const express = require("express");
const todoRouter = require("./routes/todos");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());

// Tighten body parser limit
app.use(express.json({ limit: "1kb" }));

// Rate limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
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