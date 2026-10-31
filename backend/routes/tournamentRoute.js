const express = require("express");
const router = express.Router();
const tournamentController = require("../controllers/tournamentController");
const scheduleController = require("../controllers/tournamentScheduleController");
const verifyAdminToken = require("../middlewares/authMiddleware"); // Auth middleware
const upload = require("../middlewares/uploadMiddleware"); // saves the banner image to /uploads

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

// Match scheduling: host only, except the standings which anyone can read
router.get("/tournaments/:tournamentId/schedule-plan", verifyAdminToken, scheduleController.getSchedulePlan);
router.post("/tournaments/:tournamentId/schedule/preview", verifyAdminToken, scheduleController.previewSchedule);
router.post("/tournaments/:tournamentId/schedule/check", verifyAdminToken, scheduleController.checkSchedule);
router.post("/tournaments/:tournamentId/schedule", verifyAdminToken, scheduleController.saveSchedule);
router.get("/tournaments/:tournamentId/standings", scheduleController.getStandings);
router.get("/tournaments/:tournamentId/tie-rules", verifyAdminToken, scheduleController.getTieRules);
router.put("/tournaments/:tournamentId/tie-rules", verifyAdminToken, scheduleController.setTieRules);

router.get(
  "/tournaments/:tournamentId/scheduled-matches",
   // ensure authorized access
  tournamentController.getScheduledMatches
);

router.get(
  "/:tournament_id/groups-with-teams",verifyAdminToken, tournamentController.getGroupsWithTeams
);


router.get("/tournaments/:tournamentId/progress", verifyAdminToken, tournamentController.getTournamentProgress);
router.post("/tournaments/:tournamentId/progress", verifyAdminToken, tournamentController.updateTournamentProgress);

module.exports = router;
