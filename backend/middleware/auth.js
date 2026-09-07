const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret";

const authenticate = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ error: "User is not active or does not exist" });
    }

    if (decoded.familyId) {
      const Session = require("../models/Session");
      const activeSession = await Session.findOne({
        familyId: decoded.familyId,
        revoked: false,
      });
      if (!activeSession) {
        return res
          .status(401)
          .json({ error: "Session has been revoked or expired" });
      }
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    // If token is expired or invalid
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
};
