const allowedOrigins = Array.from(
  new Set(
    [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      process.env.PORT ? `http://localhost:${process.env.PORT}` : null,
      process.env.BACKEND_URL,
    ].filter(Boolean)
  )
);

const csrfProtection = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  // Allow safe methods without origin checks
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");
  const referer = req.get("Referer");

  // We require either an Origin or a Referer for state-changing requests.
  if (!origin && !referer) {
    return res
      .status(403)
      .json({ error: "CSRF Protection: Missing Origin or Referer header" });
  }

  let requestOrigin = null;

  if (origin) {
    requestOrigin = origin;
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      requestOrigin = refererUrl.origin;
    } catch (err) {
      return res
        .status(403)
        .json({ error: "CSRF Protection: Malformed Referer header" });
    }
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    return res
      .status(403)
      .json({ error: `CSRF Protection: Unauthorized Origin ${requestOrigin}` });
  }

  next();
};

module.exports = {
  csrfProtection,
  allowedOrigins,
};
