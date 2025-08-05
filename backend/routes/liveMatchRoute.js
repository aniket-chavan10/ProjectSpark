// routes/liveMatchRoutes.js
const express = require("express");
const router = express.Router();
const liveMatchController = require("../controllers/liveMatchController");


router.post("/set-initial-players", liveMatchController.setInitialPlayers);
router.post("/set-new-batsman", liveMatchController.setNewBatsman);
router.post("/set-new-bowler", liveMatchController.setNewBowler);

module.exports = router;
