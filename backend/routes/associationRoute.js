const express = require("express");
const router = express.Router();
const verifyMasterAdminToken = require("../middlewares/masterAdminAuth");
const c = require("../controllers/associationController");
const upload = require("../middlewares/uploadMiddleware");

// a bad or too large logo is the user's mistake: say so instead of a server error
const logo = upload.safe("logo");

router.use(verifyMasterAdminToken);

router.get("/announcements", c.listAnnouncements);
router.post("/announcements", c.createAnnouncement);
router.put("/announcements/:id", c.updateAnnouncement);
router.delete("/announcements/:id", c.deleteAnnouncement);

router.get("/bans", c.listBans);
router.get("/bans/search", c.searchBanSubjects);
router.post("/bans", c.createBan);
router.post("/bans/:id/revoke", c.revokeBan);

router.get("/points/rules", c.getPointsRules);
router.put("/points/rules", c.updatePointsRules);
router.post("/points/recalculate", c.recalculate);

router.post("/season-plan/release", c.releaseSeasonPlan);
router.put("/season-plan/:id", c.moveReservation);
router.post("/season-plan/:id/cancel", c.cancelReservation);

router.get("/awards/seasons", c.awardSeasons);
router.get("/awards", c.listAwards);
router.post("/awards/generate", c.generateAwards);
router.post("/awards/confirm", c.confirmAwards);
router.post("/awards/publish", c.publishAwards);
router.post("/awards/unpublish", c.unpublishAwards);
router.put("/awards/:key", c.setAwardWinner);

router.get("/sponsors", c.listSponsors);
router.post("/sponsors", logo, c.createSponsor);
router.put("/sponsors/:id", logo, c.updateSponsor);
router.delete("/sponsors/:id", c.removeSponsor);

router.get("/dashboard", c.dashboard);
router.get("/hosts", c.hosts);
router.get("/teams", c.allTeams);
router.get("/teams/:id", c.teamDetail);
router.get("/players", c.allPlayers);
router.get("/schedules", c.allSchedules);

module.exports = router;
