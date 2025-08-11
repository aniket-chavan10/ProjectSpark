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
  "/tournaments/:tournamentId/auto-group",
  verifyAdminToken,
  tournamentController.autoGroupTournamentParticipants
);

// Manual group assignment
router.post(
  "/tournaments/:tournamentId/manual-group",
  verifyAdminToken,
  tournamentController.manualGroupTournamentParticipants
);

// Generate knockout schedule
router.post(
  "/tournaments/:tournamentId/generate-knockout-schedule",
  verifyAdminToken,
  tournamentController.scheduleKnockoutMatches
);

module.exports = router;
