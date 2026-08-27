const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const ResetToken = require('../models/ResetToken');
const rateLimit = require('express-rate-limit');
const { sendOtpEmail } = require('../utils/emailService');

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

const ms = require('ms');

const USER_ACCESS_TOKEN_LIFETIME = process.env.USER_ACCESS_TOKEN_LIFETIME || '15m';
const ADMIN_ACCESS_TOKEN_LIFETIME = process.env.ADMIN_ACCESS_TOKEN_LIFETIME || '24h';
const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || '7d';

// Validate lifespans at startup
const _userMs = ms(USER_ACCESS_TOKEN_LIFETIME);
const _adminMs = ms(ADMIN_ACCESS_TOKEN_LIFETIME);
const _refreshMs = ms(REFRESH_TOKEN_LIFETIME);

if (!_userMs || !_adminMs || !_refreshMs) {
  console.error("CRITICAL ERROR: Invalid token lifetime configuration in environment variables.");
  process.exit(1);
}

const getLifetimes = (role) => {
  const accessStr = role === 'admin' ? ADMIN_ACCESS_TOKEN_LIFETIME : USER_ACCESS_TOKEN_LIFETIME;
  return {
    accessStr,
    accessMs: ms(accessStr),
    refreshStr: REFRESH_TOKEN_LIFETIME,
    refreshMs: ms(REFRESH_TOKEN_LIFETIME),
  };
};

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

    const emailLower = email.toLowerCase().trim();
    let user = await User.findOne({ email: emailLower });

    if (user && (user.isVerified || user.role === 'admin')) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (user) {
      // User exists but isn't verified, update their info and resend OTP
      user.name = name.trim();
      user.passwordHash = passwordHash;
      user.otpHash = otpHash;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: emailLower,
        passwordHash,
        role: 'user', // strictly enforced
        isVerified: false,
        otpHash,
        otpExpiresAt,
      });
    }

    await sendOtpEmail(user.email, otp, 'Signup').catch(console.error);

    res.status(201).json({ message: 'OTP sent to email', requiresOtp: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Invalid email or OTP' });
    if (user.isVerified) return res.status(400).json({ error: 'User is already verified' });

    if (!user.otpHash || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'OTP expired or invalid. Please sign up again.' });
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) return res.status(400).json({ error: 'Invalid email or OTP' });

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Generate tokens and log them in immediately
    const lifetimes = getLifetimes(user.role);
    const familyId = crypto.randomBytes(40).toString('hex');
    const accessToken = jwt.sign({ id: user._id, role: user.role, familyId }, ACCESS_SECRET, { expiresIn: lifetimes.accessStr });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      familyId,
      expiresAt: new Date(Date.now() + lifetimes.refreshMs),
    });

    res.cookie('accessToken', accessToken, getCookieOptions(lifetimes.accessMs));
    res.cookie('refreshToken', refreshToken, getCookieOptions(lifetimes.refreshMs));
    res.cookie('familyId', familyId, getCookieOptions(lifetimes.refreshMs));

    res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({ error: 'Please verify your email first', requiresOtp: true, email: user.email });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const lifetimes = getLifetimes(user.role);
    const familyId = crypto.randomBytes(40).toString('hex');
    const accessToken = jwt.sign({ id: user._id, role: user.role, familyId }, ACCESS_SECRET, { expiresIn: lifetimes.accessStr });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      familyId,
      expiresAt: new Date(Date.now() + lifetimes.refreshMs),
    });

    res.cookie('accessToken', accessToken, getCookieOptions(lifetimes.accessMs));
    res.cookie('refreshToken', refreshToken, getCookieOptions(lifetimes.refreshMs));
    res.cookie('familyId', familyId, getCookieOptions(lifetimes.refreshMs));

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

    const lifetimes = getLifetimes(user.role);
    const newAccessToken = jwt.sign({ id: user._id, role: user.role, familyId: currentSession.familyId }, ACCESS_SECRET, { expiresIn: lifetimes.accessStr });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await Session.create({
      userId: user._id,
      refreshTokenHash: newRefreshTokenHash,
      familyId,
      expiresAt: new Date(Date.now() + lifetimes.refreshMs),
    });

    res.cookie('accessToken', newAccessToken, getCookieOptions(lifetimes.accessMs));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(lifetimes.refreshMs));

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
      return res.status(200).json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpHash = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendOtpEmail(user.email, otp, 'Password Reset').catch(console.error);

    res.status(200).json({ message: 'If that email is registered, a reset code has been sent.', requiresOtp: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid input or password too short' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (!user.otpHash || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

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
    user: req.user
  });
});

module.exports = router;
