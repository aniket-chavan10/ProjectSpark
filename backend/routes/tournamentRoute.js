const express = require("express");
const router = express.Router();
const tournamentController = require("../controllers/tournamentController");
const verifyAdminToken = require("../middlewares/authMiddleware"); // Auth middleware
const multer = require("multer");
const upload = multer();

router.post(
  "/",
  verifyAdminToken,
  upload.single("banner_image"),
  tournamentController.createTournamentFromSchedule
);

router.get(
  "/",
  verifyAdminToken,
  tournamentController.getTournamentsByOrganizer
);

router.get(
  "/admin/tournament",
  verifyAdminToken,
  tournamentController.getOpenTournaments
);

router.get(
  "/:tournamentId",
  verifyAdminToken,
  tournamentController.getTournamentById
);

router.put(
  "/:tournamentId",
  verifyAdminToken,
  tournamentController.updateTournament
);

router.delete(
  "/:tournamentId",
  verifyAdminToken,
  tournamentController.deleteTournament
);

router.get(
  "/tournaments/:tournament_id/applied-teams",
  verifyAdminToken,
  tournamentController.getAppliedTeams
);

// Auto-assign groups
router.post(
  "/tournaments/:tournamentId/group",
  verifyAdminToken,
  tournamentController.assignTournamentGroups
);

// Generate knockout schedule
router.post(
  "/tournaments/:tournamentId/generate-knockout-schedule",
  tournamentController.scheduleKnockoutMatches
);

router.get(
  "/tournaments/:tournamentId/scheduled-matches",
  verifyAdminToken, // ensure authorized access
  tournamentController.getScheduledMatches
);

router.get(
  "/:tournament_id/groups-with-teams",verifyAdminToken, tournamentController.getGroupsWithTeams
);


router.get("/tournaments/:tournamentId/progress", verifyAdminToken, tournamentController.getTournamentProgress);
router.post("/tournaments/:tournamentId/progress", verifyAdminToken, tournamentController.updateTournamentProgress);

module.exports = router;
