const express = require("express");
const todoRouter = require("./routes/todos");

const app = express();

app.use(express.json());

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