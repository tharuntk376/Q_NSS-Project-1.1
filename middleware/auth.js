const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key_123";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // console.log("Auth header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  // console.log("Token received:", token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // console.log("Token decoded:", decoded);
    req.user = decoded; // { id, name, iat, exp }
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ message: "Invalid or expired token"});
  }
};

module.exports = authMiddleware;
