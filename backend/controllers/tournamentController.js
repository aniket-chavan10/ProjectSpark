const db = require("../dbconfigure");

// Add a new tournament (by master admin)
const addTournament = (req, res) => {
  const { start_date, end_date, organizer_admin_id } = req.body;

  if (!start_date || !end_date || !organizer_admin_id) {
    return res
      .status(400)
      .json({ error: "Start date, end date, and organizer admin ID are required" });
  }

  const tournamentData = {
    start_date,
    end_date,
    organizer_admin_id,
    name: null, // Will be added by the organizer later
    banner_image: null,
    status: "pending",
  };

  const sql = `
    INSERT INTO tournaments (
        start_date, end_date, organizer_admin_id, name, banner_image, status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    tournamentData.start_date,
    tournamentData.end_date,
    tournamentData.organizer_admin_id,
    tournamentData.name,
    tournamentData.banner_image,
    tournamentData.status,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error adding tournament", details: err });
    }

    res.status(201).json({
      message: "Tournament added successfully",
      tournamentId: result.insertId,
    });
  });
};

// Get all tournaments
const getAllTournaments = (req, res) => {
  const sql = "SELECT * FROM tournaments";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching tournaments", details: err });
    }

    res.status(200).json(results);
  });
};

// Get a tournament by ID
const getTournamentById = (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM tournaments WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching tournament", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.status(200).json(results[0]);
  });
};

// Update tournament details (used by organizer admin)
const updateTournament = (req, res) => {
  const { id } = req.params;
  const { name, banner_image, status, start_date, end_date } = req.body;

  const sql = `
    UPDATE tournaments SET 
        name = ?, banner_image = ?, status = ?, 
        start_date = ?, end_date = ?
    WHERE id = ?
  `;

  const params = [name, banner_image, status, start_date, end_date, id];

  db.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error updating tournament", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.status(200).json({ message: "Tournament updated successfully" });
  });
};

// Delete a tournament
const deleteTournament = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM tournaments WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting tournament", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.status(200).json({ message: "Tournament deleted successfully" });
  });
};

module.exports = {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
};
