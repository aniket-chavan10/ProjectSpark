const express = require("express");
const router = express.Router();
const tournamentController = require("../../controllers/master/masterTournamentController");
// Assume you have middleware for auth
const authMiddleware = require("../../middlewares/authMiddleware");

router.post(
  "/tentative",
  authMiddleware, // must set req.user.role
  tournamentController.createTentativeTournament
);

router.get(
  "/",
  authMiddleware,
  tournamentController.getAllTournaments
);


module.exports = router;