const jwt = require("jsonwebtoken");

// Who may change what is on air for a match: a logged-in admin, or someone holding an operator link made for
// THAT match by the scorer (/api/overlay/:matchId/operator-link). The link's key only works for the overlay
// of its own match, and expires; it opens no other screen and no other API.
module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, message: "Open the operator link again, or log in" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "This operator link has expired. Ask the scorer for a new one." });
  }

  if (decoded.scope === "overlay-operator") {
    if (Number(decoded.matchId) !== Number(req.params.matchId)) {
      return res.status(403).json({ success: false, message: "This operator link is for a different match" });
    }
    req.operator = { matchId: Number(decoded.matchId) };
    return next();
  }

  req.user = decoded;
  next();
};
