const express = require("express");
const mongoose = require("mongoose");
const { authenticate, requireAdmin } = require("../middleware/auth");
const User = require("../models/User");
const Session = require("../models/Session");
const Todo = require("../models/Todo");
const { getAllTodosAdmin } = require("../todo");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" }, "-passwordHash -otpHash");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

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

router.get("/todos", async (req, res) => {
  try {
    const todos = await getAllTodosAdmin();
    res.status(200).json(todos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all todos" });
  }
});

router.patch("/todos/:id", async (req, res) => {
  try {
    const { title, completed } = req.body;
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
