const jwt = require("jsonwebtoken");

// Only a logged-in team admin (the representative of one team) may pass. The team comes from the token,
// so a request can never act for another team. Master-admin and player tokens are refused.
module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Please log in", message: "Please log in" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: "Your login has expired. Please log in again.", message: "Your login has expired. Please log in again." });
  }

  if (!decoded.team_id || decoded.role === "player") {
    return res.status(403).json({ success: false, error: "Only a team admin can do this", message: "Only a team admin can do this" });
  }
  req.team = { adminId: decoded.id, teamId: Number(decoded.team_id) };
  next();
};
