const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const { getAllTodosAdmin } = require('../todo');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/disable', async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { isActive }, 
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If deactivating, immediately revoke all their sessions
    if (!isActive) {
      await Session.updateMany({ userId: user._id }, { revoked: true });
    }

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    res.status(200).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/todos', async (req, res) => {
  try {
    const todos = await getAllTodosAdmin();
    res.status(200).json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all todos' });
  }
});

module.exports = router;
