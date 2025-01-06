const express = require("express");
const router = express.Router();
const {
  registerMasterAdmin,
  loginMasterAdmin,
  getAllVillages,
  updateVillageStatus,
} = require("../controllers/masteradminController");
const {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
} = require("../controllers/tournamentController");

const verifyMasterAdminToken = require("../middlewares/masterAdminAuth");
// Route to register a new master admin
router.post("/register", registerMasterAdmin);

// Route to authenticate master admin (login)
router.post("/login", loginMasterAdmin);

// Route to approve or reject a village request (with village id in path)
router.get("/villages", verifyMasterAdminToken, getAllVillages);

router.put("/villages/update/:id", verifyMasterAdminToken, updateVillageStatus);

router.post("/tournament/add",verifyMasterAdminToken, addTournament);

// Route to get all tournaments
router.get("/tournament/all", getAllTournaments);

// Route to get a specific tournament by ID
router.get("/tournament/:id", getTournamentById);

module.exports = router;
