const express = require("express");
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

  if (completed === null) {
    return res
      .status(400)
      .json({ error: "completed must be \"true\" or \"false\"" });
  }

  if (completed === true) {
    const todos = await getCompletedTodos();
    return res.status(200).json(todos);
  }

  if (completed === false) {
    const todos = await getIncompleteTodos();
    return res.status(200).json(todos);
  }

  const todos = await getTodos();
  res.status(200).json(todos);
});

// GET /todos/:id
router.get("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);

  const todo = await getTodo(todoNumber);

  if (!todo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  res.status(200).json(todo);
});

// POST /todos
router.post("/", async (req, res) => {
  const { title } = req.body;

  const todoNumber = await addTodo(title);
  const todo = await getTodo(todoNumber);

  res.status(201).json(todo);
});

// PATCH /todos/:id
router.patch("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);

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

  const updatedTodo = await updateTodo(todoNumber, { title, completed });

  if (!updatedTodo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  res.status(200).json(updatedTodo);
});

// DELETE /todos/:id
router.delete("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);

  const todo = await getTodo(todoNumber);

  if (!todo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  await deleteTodo(todoNumber);
  res.status(204).send();
});

// DELETE /todos
// DELETE /todos?completed=true
// DELETE /todos?completed=false
router.delete("/", async (req, res) => {
  const completed = parseCompleted(req.query.completed);

  if (completed === null) {
    return res
      .status(400)
      .json({ error: "completed must be \"true\" or \"false\"" });
  }

  if (completed === true) {
    await deleteCompletedTodos();
    return res.status(204).send();
  }

  if (completed === false) {
    await deleteIncompleteTodos();
    return res.status(204).send();
  }

  await deleteAllTodos();
  res.status(204).send();
});

module.exports = router;