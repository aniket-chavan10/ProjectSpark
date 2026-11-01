const jwt = require("jsonwebtoken"); // Ensure jwt is imported

const verifyAdminToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", ""); // Extract token from Authorization header

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

    // An overlay-operator key (see overlayOperatorAuth) only opens the overlay of one match, nothing else.
    if (decoded.scope) {
      return res.status(403).json({ error: "This key cannot be used here" });
    }

    // Attach decoded admin info to request object
    req.user = decoded; // Use 'user' to match downstream code

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Invalid token:", error);
    res.status(400).json({ error: "Invalid token" });
  }
};

module.exports = verifyAdminToken;
