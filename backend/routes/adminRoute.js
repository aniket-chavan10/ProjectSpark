const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  getAllAdminsAndTeams,
  updateTeamLogo,
  tournamentOrganizer,
  getAssignedTournaments,
  getAdminById,
  getPlayersByTeam
} = require("../controllers/adminController");
const verifyAdminToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Admin login route
router.post("/login", loginAdmin);

// Fetch admin profile, protected route
router.get("/all", verifyAdminToken, getAllAdminsAndTeams);

router.get("/profile/", verifyAdminToken, getAdminById);

router.get("/tournaments/assigned/", verifyAdminToken, getAssignedTournaments);

router.get("/players", verifyAdminToken, getPlayersByTeam);

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
