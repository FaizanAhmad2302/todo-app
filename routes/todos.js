const express = require("express");
const mongoose = require("mongoose");
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
const { getTodoHistory } = require("../services/TodoActivityService");

const router = express.Router();

// ALL /todos routes require authentication
router.use(authenticate);

function parseCompleted(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}

function parsePriority(value) {
  if (value === undefined) return undefined;
  if (["Low", "Medium", "High"].includes(value)) return value;
  return null;
}

// GET /todos
// GET /todos?completed=true
// GET /todos?completed=false
/**
 * @swagger
 * /todos:
 *   get:
 *     summary: List the authenticated user's todos
 *     description: |
 *       Returns all todos belonging to the authenticated user. Optionally filter by completion status.
 *       Each user can only see their own todos — ownership isolation is enforced server-side.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: completed
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         required: false
 *         description: Filter by completion status. Omit to return all todos.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ["dueDate", "priority"]
 *         required: false
 *         description: Sort the returned todos. Currently supports "dueDate" and "priority".
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: ["Low", "Medium", "High"]
 *         required: false
 *         description: Filter by priority.
 *     responses:
 *       200:
 *         description: Array of todos (may be empty)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Invalid completed query parameter value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
  const completed = parseCompleted(req.query.completed);
  const priority = parsePriority(req.query.priority);
  const userId = req.user.id;
  const sort = req.query.sort;
  const category = req.query.category;
  const tag = req.query.tag;

  if (completed === null) {
    return res
      .status(400)
      .json({ error: 'completed must be "true" or "false"' });
  }

  if (priority === null) {
    return res
      .status(400)
      .json({ error: 'priority must be "Low", "Medium", or "High"' });
  }

  if (category && !mongoose.Types.ObjectId.isValid(category)) {
    return res.status(400).json({ error: "Invalid category ID" });
  }

  if (tag && !mongoose.Types.ObjectId.isValid(tag)) {
    return res.status(400).json({ error: "Invalid tag ID" });
  }

  if (completed === true) {
    const todos = await getCompletedTodos(
      userId,
      sort,
      priority,
      category,
      tag
    );
    return res.status(200).json(todos);
  }

  if (completed === false) {
    const todos = await getIncompleteTodos(
      userId,
      sort,
      priority,
      category,
      tag
    );
    return res.status(200).json(todos);
  }

  const todos = await getTodos(userId, sort, priority, category, tag);
  return res.status(200).json(todos);
});

// GET /todos/:id
/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Get a single todo by its number
 *     description: |
 *       Returns a single todo by its todoNumber. The todo must belong to the authenticated user.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The todo number (positive integer)
 *     responses:
 *       200:
 *         description: The requested todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Invalid todo number (non-integer, negative, or decimal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res) => {
  const todoNumber = Number(req.params.id);
  const userId = req.user.id;

  const todo = await getTodo(userId, todoNumber);

  if (!todo) {
    return res.status(404).json({ error: `Todo ${todoNumber} not found` });
  }

  res.status(200).json(todo);
});

// GET /todos/:id/history
router.get("/:id/history", async (req, res) => {
  const todoNumber = Number(req.params.id);
  const userId = req.user.id;

  if (isNaN(todoNumber) || !Number.isInteger(todoNumber) || todoNumber < 1) {
    return res.status(400).json({ error: "Invalid todo number" });
  }

  const history = await getTodoHistory(userId, todoNumber);
  res.status(200).json(history);
});

// POST /todos
/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Create a new todo
 *     description: |
 *       Creates a new todo for the authenticated user. The title must be a non-empty string
 *       of at most 50 characters. A unique todoNumber is auto-assigned.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TodoCreateRequest'
 *     responses:
 *       201:
 *         description: Todo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Validation error (missing title, empty string, title too long, or invalid category/tag)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded (write operations)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
  const { title, dueDate, priority, categoryId, tags } = req.body || {};
  const userId = req.user.id;

  try {
    const todoNumber = await addTodo(
      userId,
      title,
      dueDate,
      priority,
      categoryId,
      tags
    );
    const todo = await getTodo(userId, todoNumber);
    return res.status(201).json(todo);
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// PATCH /todos/:id
/**
 * @swagger
 * /todos/{id}:
 *   patch:
 *     summary: Update a todo's title, completion status, due date, priority, category, and/or tags
 *     description: |
 *       Updates the title, completed status, due date, priority, categoryId, and/or tags of a todo.
 *       At least one field must be provided. Unknown fields in the request body are rejected with a 400 error.
 *       The todo must belong to the authenticated user.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The todo number (positive integer)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TodoUpdateRequest'
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: No fields provided, unknown fields, invalid completed type, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id", async (req, res) => {
  const userId = req.user.id;
  const todoNumber = parseInt(req.params.id, 10);

  if (isNaN(todoNumber)) {
    return res.status(400).json({ error: "Invalid todo ID" });
  }

  const { title, completed, dueDate, priority, categoryId, tags } =
    req.body || {};

  const allowedFields = [
    "title",
    "completed",
    "dueDate",
    "priority",
    "categoryId",
    "tags",
  ];
  const unknownFields = Object.keys(req.body).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unknownFields.length > 0) {
    return res.status(400).json({
      error: `Unknown fields are not allowed: ${unknownFields.join(", ")}`,
    });
  }

  if (
    title === undefined &&
    completed === undefined &&
    dueDate === undefined &&
    priority === undefined &&
    categoryId === undefined &&
    tags === undefined
  ) {
    return res.status(400).json({
      error:
        "At least one field (title, completed, dueDate, priority, categoryId, or tags) is required",
    });
  }

  if (completed !== undefined && typeof completed !== "boolean") {
    return res.status(400).json({ error: "Completed must be a boolean" });
  }

  try {
    const updatedTodo = await updateTodo(userId, todoNumber, {
      title,
      completed,
      dueDate,
      priority,
      categoryId,
      tags,
    });

    if (!updatedTodo) {
      return res.status(404).json({ error: `Todo ${todoNumber} not found` });
    }

    res.status(200).json(updatedTodo);
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// DELETE /todos/:id
/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Delete a specific todo
 *     description: |
 *       Permanently deletes a todo by its todoNumber. The todo must belong to the authenticated user.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The todo number (positive integer)
 *     responses:
 *       204:
 *         description: Todo deleted successfully (no response body)
 *       400:
 *         description: Invalid todo number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
/**
 * @swagger
 * /todos:
 *   delete:
 *     summary: Bulk delete todos by completion status
 *     description: |
 *       Deletes multiple todos filtered by completion status. Requires `confirm=true` query parameter
 *       as a safety measure. Unfiltered bulk deletion of all todos is disabled via HTTP.
 *     tags: [Todos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: completed
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter which todos to delete (completed or incomplete)
 *       - in: query
 *         name: confirm
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["true"]
 *         description: Safety confirmation parameter — must be "true"
 *     responses:
 *       204:
 *         description: Matching todos deleted successfully (no response body)
 *       400:
 *         description: Invalid completed query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Missing confirm=true parameter or unfiltered bulk deletion attempted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
