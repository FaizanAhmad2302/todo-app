const bcrypt = require("bcrypt");
const User = require("../models/User");
const Session = require("../models/Session");
const ResetToken = require("../models/ResetToken");

async function createTestUser(
  email = "test@example.com",
  password = "Password123!",
  role = "user"
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: "Test User",
    email: email.toLowerCase(),
    passwordHash,
    role,
    isActive: true,
    isVerified: true,
  });
  return user;
}

function parseCookies(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";

  const cookies = [];
  const parts = raw.split(",");
  for (const p of parts) {
    const match = p.match(/(accessToken|refreshToken|familyId)=([^;]+)/);
    if (match) {
      // Avoid duplicating cookies if split incorrectly
      if (!cookies.some((c) => c.startsWith(match[1]))) {
        cookies.push(`${match[1]}=${match[2]}`);
      }
    }
  }
  return cookies.join("; ");
}

async function loginUser(
  baseUrl,
  email = "test@example.com",
  password = "Password123!"
) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error("Failed to login in test");
  return parseCookies(res);
}

module.exports = {
  createTestUser,
  loginUser,
  parseCookies,
};
