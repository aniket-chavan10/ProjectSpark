const express = require("express");
const router = express.Router();
const {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
} = require("../controllers/tournamentController");

const verifyAdminToken = require("../middlewares/authMiddleware");

// Route to add a new tournament (Master Admin only)
router.post("/add", addTournament);

// Route to get all tournaments
router.get("/all", getAllTournaments);

// Route to get a specific tournament by ID
router.get("/:id", getTournamentById);

// Route to update a tournament (Organizer Admin)
router.put("/update/:id", updateTournament);

// Route to delete a tournament
router.delete("/delete/:id", deleteTournament);



module.exports = router;
