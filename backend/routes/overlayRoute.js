const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const operatorAuth = require("../middlewares/overlayOperatorAuth");
const c = require("../controllers/overlayController");

// Reading is public: the streaming software has no login.
router.get("/:matchId", c.getData);

// The scorer (logged in) makes a link for the overlay operator; the operator uses its key on the two calls below.
router.post("/:matchId/operator-link", verifyToken, c.createOperatorLink);
router.put("/:matchId/scene", operatorAuth, c.setScene);
router.put("/:matchId/player-of-match", operatorAuth, c.setPlayerOfMatch);

module.exports = router;
