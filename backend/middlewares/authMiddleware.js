const jwt = require("jsonwebtoken"); // Ensure jwt is imported

const verifyAdminToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", ""); // Extract token from Authorization header

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

    // Attach decoded admin info to request object
    // In verifyAdminToken middleware
    req.user = decoded; // Use 'user' to match downstream code
    // Assuming the token contains the 'id' or 'adminId' in the payload as 'id'

    console.log("Decoded Admin Info:", decoded); // Debugging log to ensure correct token data

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Invalid token:", error);
    res.status(400).json({ error: "Invalid token" });
  }
};

module.exports = verifyAdminToken;
