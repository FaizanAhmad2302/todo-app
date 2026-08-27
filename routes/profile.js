const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Session = require('../models/Session');
const rateLimit = require('express-rate-limit');
const { sendOtpEmail } = require('../utils/emailService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req, res) => process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many profile update attempts, please try again later.' },
});

router.use(authenticate);

// Admin profile management is now supported


router.post('/request-update', profileLimiter, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    if (!name && !newPassword) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpHash = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Explicitly set the purpose so this OTP cannot be used for signup/reset
    user.otpPurpose = 'profile_update';
    
    await user.save();

    await sendOtpEmail(user.email, otp, 'Profile Update').catch(console.error);

    res.status(200).json({ message: 'OTP sent to verify your update.', requiresOtp: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request update' });
  }
});

router.put('/verify-update', profileLimiter, async (req, res) => {
  try {
    const { otp, name, newPassword } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    if (user.otpPurpose !== 'profile_update') {
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }

    if (!user.otpHash || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'OTP expired or invalid' });
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    let passwordChanged = false;

    // Apply allowed updates only
    if (name && typeof name === 'string' && name.trim().length > 0) {
      user.name = name.trim();
    }
    
    if (newPassword && newPassword.length >= 8) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      passwordChanged = true;
    }

    // Clear OTP securely (one-time use)
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpPurpose = undefined;

    await user.save();

    if (passwordChanged) {
      // Security Requirement: Revoke ALL existing sessions (which inherently revokes current session)
      await Session.updateMany({ userId: user._id }, { revoked: true });
      
      // Clear cookies for the current request
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('familyId');
      
      return res.status(200).json({ 
        message: 'Password changed successfully. For your security, please log in again.', 
        passwordChanged: true 
      });
    }

    res.status(200).json({ 
      message: 'Profile updated successfully', 
      passwordChanged: false 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify update' });
  }
});

module.exports = router;
