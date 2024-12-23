const db = require('../dbconfigure');

// Add a new player
const addPlayer = (playerData, callback) => {
    const sql = `
        INSERT INTO players (
            full_name, mobile_number, email, instagram_handle, 
            date_of_birth, primary_role, team_role, batting_hand, 
            bowling_hand, bowling_type, aadhar_number, team_id, 
            profile_image, jersey_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        playerData.full_name,
        playerData.mobile_number,
        playerData.email,
        playerData.instagram_handle,
        playerData.date_of_birth,
        playerData.primary_role,
        playerData.team_role,
        playerData.batting_hand,
        playerData.bowling_hand,
        playerData.bowling_type,
        playerData.aadhar_number,
        playerData.team_id,
        playerData.profile_image,
        playerData.jersey_number,
    ];
    db.query(sql, params, callback);
};

// Get all players for a specific team
const getPlayersByTeam = (teamId, callback) => {
    const sql = 'SELECT * FROM players WHERE team_id = ?';
    db.query(sql, [teamId], callback);
};

// Get player details by ID
const getPlayerById = (playerId, callback) => {
    const sql = 'SELECT * FROM players WHERE player_id = ?';
    db.query(sql, [playerId], callback);
};

// Update player details
const updatePlayer = (playerId, updatedData, callback) => {
    const sql = `
        UPDATE players SET 
            full_name = ?, mobile_number = ?, email = ?, 
            instagram_handle = ?, date_of_birth = ?, 
            primary_role = ?, team_role = ?, batting_hand = ?, 
            bowling_hand = ?, bowling_type = ?, aadhar_number = ?, 
            profile_image = ?, jersey_number = ?
        WHERE player_id = ?
    `;
    const params = [
        updatedData.full_name,
        updatedData.mobile_number,
        updatedData.email,
        updatedData.instagram_handle,
        updatedData.date_of_birth,
        updatedData.primary_role,
        updatedData.team_role,
        updatedData.batting_hand,
        updatedData.bowling_hand,
        updatedData.bowling_type,
        updatedData.aadhar_number,
        updatedData.profile_image,
        updatedData.jersey_number,
        playerId,
    ];
    db.query(sql, params, callback);
};

// Delete player by ID
const deletePlayer = (playerId, callback) => {
    const sql = 'DELETE FROM players WHERE player_id = ?';
    db.query(sql, [playerId], callback);
};

module.exports = {
    addPlayer,
    getPlayersByTeam,
    getPlayerById,
    updatePlayer,
    deletePlayer,
};
