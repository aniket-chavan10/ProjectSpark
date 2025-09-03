const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  getAllAdminsAndTeams,
  getAdminById,
} = require("../controllers/adminController");


const { getPlayersByTeam } = require("../controllers/playersController");

const verifyAdminToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.post("/login", loginAdmin);

router.get("/all", verifyAdminToken, getAllAdminsAndTeams);

router.get("/profile", verifyAdminToken, getAdminById);

router.get("/players", verifyAdminToken, getPlayersByTeam);

module.exports = router;
