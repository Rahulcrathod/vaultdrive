export function requireAuth(req, res, next) {
  // Check session or Authorization header for flexibility
  let userId = req.session?.userId;

  if (!userId && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      userId = parts[1];
    }
  }

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required. Please log in."
    });
  }

  req.userId = userId;
  next();
}
