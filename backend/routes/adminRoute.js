const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  getAllAdminsAndTeams,
  updateTeamLogo,
  getAdminById,
} = require("../controllers/adminController");

const {
  tournamentOrganizer,
  getAssignedTournaments,
  getTournamentInvitations,
  applyForTournament
} = require("../controllers/tournamentController");

const { getPlayersByTeam } = require("../controllers/playersController");
const { getNotifications } = require("../controllers/notificationController");


const verifyAdminToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");



router.post("/login", loginAdmin);

router.get("/all", verifyAdminToken, getAllAdminsAndTeams);

router.get("/profile", verifyAdminToken, getAdminById);

router.get("/players", verifyAdminToken, getPlayersByTeam);

router.get("/tournaments/assigned/", verifyAdminToken, getAssignedTournaments);

router.get("/notifications", verifyAdminToken, getNotifications);

router.get("/tournaments/invitations", verifyAdminToken, getTournamentInvitations);

router.post("/tournaments/invitations/apply", verifyAdminToken, applyForTournament);


router.put(
  "/teams/logo",
  verifyAdminToken,
  upload.single("logo"),
  updateTeamLogo
);

router.put(
  "/tournaments/update-details",
  upload.single("banner_image"),
  verifyAdminToken, // Middleware to handle file upload
  tournamentOrganizer // Controller function
);

module.exports = router;
