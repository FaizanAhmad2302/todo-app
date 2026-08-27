const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const ResetToken = require('../models/ResetToken');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => process.env.NODE_ENV === 'test' ? 1000 : parseInt(process.env.AUTH_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req, res) => process.env.NODE_ENV === 'test' ? 1000 : parseInt(process.env.RESET_RATE_LIMIT || 3),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests, please try again later.' },
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const ACCESS_LIFETIME = '15m'; 
const REFRESH_LIFETIME = '7d';
const ACCESS_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// Cookie options
const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge,
});

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'user', // strictly enforced
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const familyId = crypto.randomBytes(40).toString('hex');
    const accessToken = jwt.sign({ id: user._id, role: user.role, familyId }, ACCESS_SECRET, { expiresIn: ACCESS_LIFETIME });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
    });

    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_LIFETIME_MS));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_LIFETIME_MS));
    res.cookie('familyId', familyId, getCookieOptions(REFRESH_LIFETIME_MS));

    res.status(200).json({ 
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const familyId = req.cookies.familyId;
    if (familyId) {
      await Session.updateMany({ familyId }, { revoked: true });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('familyId');
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, familyId } = req.cookies;

    if (!refreshToken || !familyId) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const sessions = await Session.find({ familyId }).sort({ createdAt: -1 });
    
    if (sessions.length === 0) {
      res.clearCookie('accessToken'); res.clearCookie('refreshToken'); res.clearCookie('familyId');
      return res.status(401).json({ error: 'Session not found' });
    }

    const isFamilyRevoked = sessions.some(s => s.revoked);
    if (isFamilyRevoked) {
      await Session.updateMany({ familyId }, { revoked: true });
      res.clearCookie('accessToken'); res.clearCookie('refreshToken'); res.clearCookie('familyId');
      return res.status(401).json({ error: 'Session revoked (Reuse detected)' });
    }

    let currentSession = null;
    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        currentSession = session;
        break;
      }
    }

    if (!currentSession) {
      await Session.updateMany({ familyId }, { revoked: true });
      res.clearCookie('accessToken'); res.clearCookie('refreshToken'); res.clearCookie('familyId');
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date() > currentSession.expiresAt) {
      await Session.updateOne({ _id: currentSession._id }, { revoked: true });
      res.clearCookie('accessToken'); res.clearCookie('refreshToken'); res.clearCookie('familyId');
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = await User.findById(currentSession.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User inactive' });
    }

    // Rotate: strictly revoke old session atomically before issuing new
    await Session.updateOne({ _id: currentSession._id }, { revoked: true });

    const newAccessToken = jwt.sign({ id: user._id, role: user.role, familyId: currentSession.familyId }, ACCESS_SECRET, { expiresIn: ACCESS_LIFETIME });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await Session.create({
      userId: user._id,
      refreshTokenHash: newRefreshTokenHash,
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
    });

    res.cookie('accessToken', newAccessToken, getCookieOptions(ACCESS_LIFETIME_MS));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(REFRESH_LIFETIME_MS));
    
    res.status(200).json({ message: 'Token refreshed' });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(resetToken, 10);

    await ResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    console.log(`[DEVELOPMENT ONLY] Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid input or password too short' });
    }

    const resetTokens = await ResetToken.find({ expiresAt: { $gt: new Date() } });
    let validTokenDoc = null;

    for (const doc of resetTokens) {
      if (await bcrypt.compare(token, doc.tokenHash)) {
        validTokenDoc = doc;
        break;
      }
    }

    if (!validTokenDoc) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = await User.findById(validTokenDoc.userId);
    if (!user) return res.status(400).json({ error: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Revoke reset token
    await ResetToken.deleteOne({ _id: validTokenDoc._id });

    // Security: Revoke all existing sessions for this user!
    await Session.updateMany({ userId: user._id }, { revoked: true });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// A route just to get the current user based on the access token (used on frontend startup)
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }
  });
});

module.exports = router;
