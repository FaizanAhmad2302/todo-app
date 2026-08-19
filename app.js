const express = require("express");
const todoRouter = require("./routes/todos");

const app = express();

app.use(express.json());

app.use("/todos", todoRouter);

app.use((err, req, res, next) => {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

module.exports = app;