const db = require("../dbconfigure");

// Add a new tournament (used by the master admin)
const addTournament = (tournamentData, callback) => {
  const sql = `
    INSERT INTO tournaments (
        start_date, end_date, organizer_admin_id, name, organizing_team, banner_image, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    tournamentData.start_date,
    tournamentData.end_date,
    tournamentData.organizer_admin_id,
    tournamentData.name || null, // Name can be null initially
    tournamentData.organizing_team, // Organizing team is required
    tournamentData.banner_image || null, // Banner image can be null initially
    tournamentData.status || "pending", // Default status
  ];
  db.query(sql, params, callback);
};

// Get all tournaments
const getAllTournaments = (callback) => {
  const sql = "SELECT * FROM tournaments";
  db.query(sql, callback);
};

// Get a tournament by ID
const getTournamentById = (tournamentId, callback) => {
  const sql = "SELECT * FROM tournaments WHERE id = ?";
  db.query(sql, [tournamentId], callback);
};

// Update tournament details (used by the assigned admin)
const updateTournament = (tournamentId, updatedData, callback) => {
  const sql = `
    UPDATE tournaments SET 
        name = ?, organizing_team = ?, banner_image = ?, status = ?, 
        start_date = ?, end_date = ?
    WHERE id = ?
  `;
  const params = [
    updatedData.name,
    updatedData.organizing_team, // Include organizing team in updates
    updatedData.banner_image,
    updatedData.status,
    updatedData.start_date,
    updatedData.end_date,
    tournamentId,
  ];
  db.query(sql, params, callback);
};

// Delete a tournament
const deleteTournament = (tournamentId, callback) => {
  const sql = "DELETE FROM tournaments WHERE id = ?";
  db.query(sql, [tournamentId], callback);
};

module.exports = {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
};
