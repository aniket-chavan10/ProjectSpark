const express = require('express');
const router = express.Router();
const verifyAdminToken = require('../middlewares/authMiddleware'); // Middleware to verify admin token
const { 
    createPlayer, 
    listPlayersByTeam, 
    getPlayer, 
    editPlayer, 
    removePlayer 
} = require('../controllers/playersController');

// Route to add a new player (Admin-only)
router.post('/', verifyAdminToken, createPlayer);

// Route to get all players of a team (Admin-only)
router.get('/team/:teamId', verifyAdminToken, listPlayersByTeam);

// Route to get a specific player's details (Admin-only)
router.get('/:playerId', verifyAdminToken, getPlayer);

// Route to update a player's details (Admin-only)
router.put('/:playerId', verifyAdminToken, editPlayer);

// Route to delete a player (Admin-only)
router.delete('/:playerId', verifyAdminToken, removePlayer);

module.exports = router;
