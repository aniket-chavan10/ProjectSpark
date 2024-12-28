const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  getAllAdminsAndTeams,
  updateTeamLogo,
  tournamentOrganizer,
} = require("../controllers/adminController");
const verifyAdminToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Admin login route
router.post("/login", loginAdmin);

// Fetch admin profile, protected route
router.get("/profile", verifyAdminToken, getAllAdminsAndTeams);

router.put(
  "/teams/logo",
  verifyAdminToken,
  upload.single("logo"),
  updateTeamLogo
);

router.put(
  "/tournaments/:id/update-details",
  upload.single("banner_image"), // Middleware to handle file upload
  tournamentOrganizer // Controller function
);

module.exports = router;
