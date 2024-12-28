const express = require('express');
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const verifyAdminToken = require('../middlewares/authMiddleware'); // Middleware to verify admin token
const {
    createPlayer,
    playerLogin,
    getAllPlayers,
    getPlayerById,
    updatePlayer,
    deletePlayer
} = require('../controllers/playersController');

// Route to add a new player (Admin-only)
router.post('/', verifyAdminToken,upload.single("profile_picture"), createPlayer);

router.post('/login',  playerLogin);

// Route to get all players (Admin-only)
router.get('/',verifyAdminToken,  getAllPlayers);

// Route to get a specific player's details (Admin-only)
router.get('/:id', verifyAdminToken, getPlayerById);

// Route to update a player's details (Admin-only)
router.put('/:id', verifyAdminToken, updatePlayer);

// Route to delete a player (Admin-only)
router.delete('/:id', verifyAdminToken, deletePlayer);

module.exports = router;
