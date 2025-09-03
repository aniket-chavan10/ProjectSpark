const express = require("express");
const router = express.Router();
const liveScoreController = require("../controllers/liveScoreController");

// GET live scoreboard data for a match (both innings)
router.get("/:matchId/scoreboard", liveScoreController.getLiveScore);

module.exports = router;
