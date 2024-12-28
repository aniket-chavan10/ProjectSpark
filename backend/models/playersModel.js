const db = require("../dbconfigure");

const addPlayerCore = (playerData, callback) => {
  const sql = `
        INSERT INTO players_core (
            full_name, mobile_number, email, profile_picture, password, is_banned, banned_until, team_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  const params = [
    playerData.full_name,
    playerData.mobile_number,
    playerData.email,
    playerData.profile_picture,
    playerData.password,
    playerData.is_banned || false,
    playerData.banned_until || null,
    playerData.team_name, // Include team_name here
  ];
  db.query(sql, params, callback);
};

const getPlayerByEmailCore = (email, callback) => {
  const query = "SELECT * FROM players_core WHERE email = ?";
  db.query(query, [email], callback);
};
// Get all players
const getAllPlayersCore = (callback) => {
  const sql = "SELECT * FROM players_core";
  db.query(sql, callback);
};

// Get a player by ID
const getPlayerCoreById = (playerId, callback) => {
  const sql = "SELECT * FROM players_core WHERE player_id = ?";
  db.query(sql, [playerId], callback);
};

// Update player details
const updatePlayerCore = (playerId, updatedData, callback) => {
  const sql = `
        UPDATE players_core SET 
            full_name = ?, mobile_number = ?, email = ?, 
            profile_picture = ?, password = ?, 
            is_banned = ?, banned_until = ?
        WHERE player_id = ?
    `;
  const params = [
    updatedData.full_name,
    updatedData.mobile_number,
    updatedData.email,
    updatedData.profile_picture,
    updatedData.password,
    updatedData.is_banned,
    updatedData.banned_until,
    playerId,
  ];
  db.query(sql, params, callback);
};

const deletePlayerCore = (playerId, callback) => {
  const sql = "DELETE FROM players_core WHERE player_id = ?";
  db.query(sql, [playerId], callback);
};

module.exports = {
  addPlayerCore,
  getAllPlayersCore,
  getPlayerCoreById,
  updatePlayerCore,
  deletePlayerCore,
  getPlayerByEmailCore
};
