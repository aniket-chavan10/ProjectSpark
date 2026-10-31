const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");

router.get("/overview", c.overview);
router.get("/announcements", c.announcements);
router.get("/teams", c.teams);
router.get("/teams/:id", c.team);
router.get("/tournaments", c.tournaments);
router.get("/tournaments/:id", c.tournament);
router.get("/matches", c.matches);
router.get("/matches/:id", c.match);
router.get("/fixtures", c.upcoming);
router.get("/rankings/teams", c.teamRankings);
router.get("/rankings/players", c.playerRankings);
router.get("/players/:id", c.player);
router.get("/rankings/ratings", c.playerRatings);
router.get("/awards", c.awards);
router.get("/sponsors", c.sponsors);

module.exports = router;
