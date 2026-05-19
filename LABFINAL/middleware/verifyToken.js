const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers["authorization"];

  // Check if Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided. Use: Authorization: Bearer <token>",
    });
  }

  // Extract the token part after "Bearer "
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Token is missing.",
    });
  }

  try {
    // Verify token using secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Append decoded user info to req object for use in route handlers
    req.user = decoded;
    next();
  } catch (err) {
    // Token is invalid or expired
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }
    return res.status(403).json({
      success: false,
      message: "Invalid token. Access forbidden.",
    });
  }
}

module.exports = verifyToken;