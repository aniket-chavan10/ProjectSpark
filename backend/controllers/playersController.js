const { addPlayer, getPlayersByTeam, getPlayerById, updatePlayer, deletePlayer } = require('../models/playersModel');

// Add a new player

const createPlayer = (req, res) => {
  const playerData = req.body;

  // Use the team_id from the middleware (no need to pass it in the request body anymore)
  playerData.team_id = req.team_id;

  // Log player data to check the team_id
  console.log('Player Data:', playerData);

  // Validate required fields
  const requiredFields = ['full_name', 'mobile_number', 'email', 'date_of_birth', 'primary_role', 'batting_hand', 'aadhar_number', 'jersey_number'];
  const missingFields = requiredFields.filter((field) => !playerData[field]);

  if (missingFields.length) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
  }

  addPlayer(playerData, (err, result) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to add player', details: err });
      }
      res.status(201).json({ message: 'Player added successfully', playerId: result.insertId });
  });
};



// Get all players for a team
const listPlayersByTeam = (req, res) => {
    const teamId = req.params.teamId;

    if (!teamId) {
        return res.status(400).json({ error: 'Team ID is required' });
    }

    getPlayersByTeam(teamId, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch players', details: err });
        }
        res.status(200).json(results);
    });
};

// Get player details
const getPlayer = (req, res) => {
    const playerId = req.params.playerId;

    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
    }

    getPlayerById(playerId, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch player details', details: err });
        }
        if (!result.length) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.status(200).json(result[0]);
    });
};

// Update player details
const editPlayer = (req, res) => {
    const playerId = req.params.playerId;
    const updatedData = req.body;

    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
    }

    updatePlayer(playerId, updatedData, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update player', details: err });
        }
        res.status(200).json({ message: 'Player updated successfully' });
    });
};

// Delete a player
const removePlayer = (req, res) => {
    const playerId = req.params.playerId;

    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
    }

    deletePlayer(playerId, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete player', details: err });
        }
        res.status(200).json({ message: 'Player deleted successfully' });
    });
};

module.exports = {
    createPlayer,
    listPlayersByTeam,
    getPlayer,
    editPlayer,
    removePlayer,
};
