const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const c = require("../controllers/overlayController");

router.get("/:matchId", c.getData);
router.put("/:matchId/scene", verifyToken, c.setScene);
router.put("/:matchId/player-of-match", verifyToken, c.setPlayerOfMatch);

module.exports = router;
