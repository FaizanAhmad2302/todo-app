const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  addTodo,
  getTodos,
  getTodo,
  updateTodo,
  deleteTodo,
  deleteAllTodos,
  getCompletedTodos,
  getIncompleteTodos,
  deleteCompletedTodos,
  deleteIncompleteTodos,
} = require("../todo");

const router = express.Router();

// ALL /todos routes require authentication
router.use(authenticate);

function parseCompleted(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}

// GET /todos
// GET /todos?completed=true
// GET /todos?completed=false
router.get("/", async (req, res) => {
  const completed = parseCompleted(req.query.completed);
  const userId = req.user.id;

  if (completed === null) {
    return res
      .status(400)
      .json({ error: 'completed must be "true" or "false"' });
  }

  if (completed === true) {
    const todos = await getCompletedTodos(userId);
    return res.status(200).json(todos);
  }

  if (completed === false) {
    const todos = await getIncompleteTodos(userId);
    return res.status(200).json(todos);
  }

  const todos = await getTodos(userId);
  res.status(200).json(todos);
});

// GET /todos/:id
router.get("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);
  const userId = req.user.id;

  const todo = await getTodo(userId, todoNumber);

  if (!todo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  res.status(200).json(todo);
});

// POST /todos
router.post("/", async (req, res) => {
  const { title } = req.body;
  const userId = req.user.id;

  const todoNumber = await addTodo(userId, title);
  const todo = await getTodo(userId, todoNumber);

  res.status(201).json(todo);
});

// PATCH /todos/:id
router.patch("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);
  const userId = req.user.id;

  const { title, completed } = req.body;

  const allowedFields = ["title", "completed"];
  const unknownFields = Object.keys(req.body).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unknownFields.length > 0) {
    return res.status(400).json({
      error: `Unknown fields are not allowed: ${unknownFields.join(", ")}`,
    });
  }

  if (title === undefined && completed === undefined) {
    return res
      .status(400)
      .json({ error: "At least one field (title or completed) is required" });
  }

  if (completed !== undefined && typeof completed !== "boolean") {
    return res.status(400).json({ error: "Completed must be a boolean" });
  }

  const updatedTodo = await updateTodo(userId, todoNumber, {
    title,
    completed,
  });

  if (!updatedTodo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  res.status(200).json(updatedTodo);
});

// DELETE /todos/:id
router.delete("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);
  const userId = req.user.id;

  const todo = await getTodo(userId, todoNumber);

  if (!todo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  await deleteTodo(userId, todoNumber);
  res.status(204).send();
});

// DELETE /todos?completed=true&confirm=true
// DELETE /todos?completed=false&confirm=true
router.delete("/", async (req, res) => {
  const confirm = req.query.confirm === "true";
  const userId = req.user.id;

  if (!confirm) {
    return res
      .status(403)
      .json({ error: "Missing ?confirm=true parameter for bulk deletion" });
  }

  const completed = parseCompleted(req.query.completed);

  if (completed === null) {
    return res
      .status(400)
      .json({ error: 'completed must be "true" or "false"' });
  }

  if (completed === true) {
    await deleteCompletedTodos(userId);
    return res.status(204).send();
  }

  if (completed === false) {
    await deleteIncompleteTodos(userId);
    return res.status(204).send();
  }

  return res.status(403).json({
    error: "Unfiltered bulk deletion of all todos is disabled via HTTP",
  });
});

module.exports = router;
