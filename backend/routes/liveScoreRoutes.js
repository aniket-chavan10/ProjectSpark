const express = require("express");
const router = express.Router();
const liveScoreController = require("../controllers/liveScoreController");

// GET live scoreboard data for a match (both innings)
router.get("/:matchId/scoreboard", liveScoreController.getLiveScore);

// GET the full scorecard of a match
router.get("/:matchId/scorecard", liveScoreController.getScorecard);

module.exports = router;
