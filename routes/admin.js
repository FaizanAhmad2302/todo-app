const express = require("express");
const mongoose = require("mongoose");
const { authenticate, requireAdmin } = require("../middleware/auth");
const User = require("../models/User");
const Session = require("../models/Session");
const Todo = require("../models/Todo");
const { getAllTodosAdmin, validateDueDate } = require("../todo");

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all normal users (Admin-only)
 *     description: |
 *       Returns all user accounts with `role: "user"`. Admin accounts are excluded from this list.
 *       Sensitive fields (passwordHash, otpHash) are excluded from the response via database projection.
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of user accounts (admins excluded)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserAdmin'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" }, "-passwordHash -otpHash");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * @swagger
 * /admin/users/{id}/disable:
 *   patch:
 *     summary: Enable or disable a user account (Admin-only)
 *     description: |
 *       Sets the `isActive` status of a user account. When deactivating a user (`isActive: false`),
 *       all of their active sessions are immediately revoked.
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminDisableUserRequest'
 *     responses:
 *       200:
 *         description: User status updated (passwordHash excluded from response)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAdmin'
 *       400:
 *         description: isActive must be a boolean
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
 *         description: Forbidden — admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/users/:id/disable", async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If deactivating, immediately revoke all their sessions
    if (!isActive) {
      await Session.updateMany({ userId: user._id }, { revoked: true });
    }

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    res.status(200).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * @swagger
 * /admin/todos:
 *   get:
 *     summary: List all todos across all users (Admin-only)
 *     description: |
 *       Returns every todo in the system sorted by todoNumber, regardless of ownership.
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ["dueDate"]
 *         required: false
 *         description: Sort the returned todos. Currently supports "dueDate".
 *     responses:
 *       200:
 *         description: Array of all todos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/todos", async (req, res) => {
  try {
    const sort = req.query.sort;
    const todos = await getAllTodosAdmin(sort);
    res.status(200).json(todos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all todos" });
  }
});

/**
 * @swagger
 * /admin/todos/{id}:
 *   patch:
 *     summary: Edit any todo's title or completion status (Admin-only)
 *     description: |
 *       Allows an admin to edit the title and/or completed status of any todo.
 *       The todo's ownership (userId) cannot be changed — the endpoint only accepts title and completed fields.
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
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
 *             $ref: '#/components/schemas/AdminTodoUpdateRequest'
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: No valid fields provided, invalid title, invalid completed type, or invalid ID
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
 *         description: Forbidden — admin access required
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/todos/:id", async (req, res) => {
  try {
    const { title, completed, dueDate } = req.body;
    const updateData = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      updateData.title = title.trim();
    }
    if (completed !== undefined) {
      if (typeof completed !== "boolean") {
        return res.status(400).json({ error: "completed must be a boolean" });
      }
      updateData.completed = completed;
    }
    if (dueDate !== undefined) {
      const validatedDueDate = validateDueDate(dueDate, false);
      if (validatedDueDate === null) {
        updateData.$unset = { dueDate: 1 };
      } else {
        updateData.dueDate = validatedDueDate;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided" });
    }

    const todoId = parseInt(req.params.id, 10);
    if (isNaN(todoId)) {
      return res.status(400).json({ error: "Invalid Todo ID" });
    }

    const todo = await Todo.findOneAndUpdate(
      { todoNumber: todoId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(200).json(todo);
  } catch (err) {
    res.status(500).json({ error: "Failed to update todo" });
  }
});

/**
 * @swagger
 * /admin/todos/{id}:
 *   delete:
 *     summary: Permanently delete any todo (Admin-only)
 *     description: |
 *       Permanently deletes a todo by its todoNumber, regardless of ownership.
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
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
 *         description: Invalid Todo ID
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
 *         description: Forbidden — admin access required
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/todos/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id, 10);
    if (isNaN(todoId)) {
      return res.status(400).json({ error: "Invalid Todo ID" });
    }

    const result = await Todo.findOneAndDelete({ todoNumber: todoId });
    if (!result) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Permanently delete a normal user and cascade (Admin-only)
 *     description: |
 *       Permanently deletes a user account and all associated data (todos, sessions) in an atomic
 *       MongoDB transaction.
 *
 *       **Restrictions:**
 *       - Admins cannot delete themselves (returns 403)
 *       - Admins cannot delete other admins (returns 403)
 *       - Only users with `role: "user"` can be deleted
 *
 *       **Admin-only.** Normal authenticated users receive 403 Forbidden.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the user to delete
 *     responses:
 *       204:
 *         description: User and all associated data permanently deleted (no response body)
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Cannot delete self, cannot delete another admin, or not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/users/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: "Admins cannot delete themselves" });
    }

    const targetUser = await User.findById(targetUserId).session(session);
    if (!targetUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role === "admin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: "Cannot delete another admin" });
    }

    await User.findByIdAndDelete(targetUserId).session(session);
    await Todo.deleteMany({ userId: targetUserId }).session(session);
    await Session.deleteMany({ userId: targetUserId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(204).send();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
