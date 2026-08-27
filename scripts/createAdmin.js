require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not defined.');
  process.exit(1);
}

async function createAdmin() {
  try {
    await mongoose.connect(uri);

    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';

    if (!email || !password) {
      console.error('Usage: node scripts/createAdmin.js <email> <password> [name]');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.error('Error: A user with this email already exists.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      isVerified: true,
    });

    console.log(`Admin user created successfully for email: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
