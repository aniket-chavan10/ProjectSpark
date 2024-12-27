const jwt = require("jsonwebtoken");

const verifyMasterAdminToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", ""); // Extract token from Authorization header

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

    // Attach decoded master admin info to request object
    req.masterAdmin = decoded;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Invalid token:", error);
    res.status(400).json({ error: "Invalid token" });
  }
};

module.exports = verifyMasterAdminToken;
