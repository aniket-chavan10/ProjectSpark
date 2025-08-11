const express = require('express');
const router = express.Router();
const tournamentParticipantsController = require('../controllers/tournamentParticipantsController');
const verifyAdminToken = require("../middlewares/authMiddleware");


router.post('/apply', verifyAdminToken, tournamentParticipantsController.applyForTournament);

router.get('/apply', verifyAdminToken, tournamentParticipantsController.getDashboardTournaments);

module.exports = router;
