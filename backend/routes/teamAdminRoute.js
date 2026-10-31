const express = require("express");
const router = express.Router();
const requireTeamAdmin = require("../middlewares/teamAdminAuth");
const upload = require("../middlewares/uploadMiddleware");
const controller = require("../controllers/teamAdminController");

// a bad or too large photo is the user's mistake: say so instead of a server error
const photo = (req, res, next) =>
  upload.single("profile_picture")(req, res, (err) => (err ? res.status(400).json({ success: false, error: err.message, message: err.message }) : next()));

router.use(requireTeamAdmin);

// the team's own players
router.get("/players", controller.listPlayers);
router.post("/players", photo, controller.createPlayer);
router.put("/players/:playerId", photo, controller.updatePlayer);
router.delete("/players/:playerId", controller.removePlayer);

// tournaments the team is in, and its squad (playing XI + reserves) for each
router.get("/tournaments", controller.myTournaments);
router.get("/tournaments/:tournamentId/matches", controller.myMatches);
router.get("/tournaments/:tournamentId/squad", controller.getTournamentSquad);
router.put("/tournaments/:tournamentId/squad", controller.saveTournamentSquad);

// the squad for one match (changeable until the toss)
router.get("/matches/:fixtureId/squad", controller.getMatchSquad);
router.put("/matches/:fixtureId/squad", controller.saveMatchSquad);
router.delete("/matches/:fixtureId/squad", controller.resetMatchSquad);

module.exports = router;
