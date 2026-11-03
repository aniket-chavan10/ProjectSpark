const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  getAllAdminsAndTeams,
  getAdminById,
  updateTeamLogo,
} = require("../controllers/adminController");


const { getPlayersByTeam } = require("../controllers/playersController");

const verifyAdminToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.post("/login", loginAdmin);

router.get("/all", verifyAdminToken, getAllAdminsAndTeams);

router.get("/profile", verifyAdminToken, getAdminById);

router.get("/players", verifyAdminToken, getPlayersByTeam);

// the team picture (shown on scorecards, rankings and the broadcast overlay)
router.put("/teams/logo", verifyAdminToken, upload.safe("logo"), updateTeamLogo);

module.exports = router;
