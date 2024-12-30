const db = require("../dbconfigure");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Add a new tournament (used by the master admin) and assign to organizing team
const addTournament = (req, res) => {
  const { start_date, end_date, organizing_team, organizer_admin_id } =
    req.body;

  if (!start_date || !end_date || !organizing_team) {
    return res.status(400).json({
      error: "Start date, end date, and organizing team are required",
    });
  }

  // Step 1: Retrieve the admin ID using the organizing team's name
  const sqlGetAdminId = `
    SELECT admin_id FROM teams WHERE team_name = ?
  `;

  db.query(sqlGetAdminId, [organizing_team], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching admin ID for the team", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const adminId = results[0].admin_id;

    // Step 2: Proceed with tournament insertion using the admin ID retrieved
    const tournamentData = {
      start_date,
      end_date,
      organizer_admin_id: adminId, // Set the retrieved admin_id here
      name: null, // Will be added by the organizer later
      organizing_team,
      banner_image: null,
      status: "pending",
    };

    const sqlInsertTournament = `
      INSERT INTO tournaments (
          start_date, end_date, organizer_admin_id, name, organizing_team, banner_image, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const sqlUpdateAdmin = `
      UPDATE admins SET is_organizer = true WHERE id = ?
    `;

    db.beginTransaction((transactionErr) => {
      if (transactionErr) {
        return res
          .status(500)
          .json({
            error: "Transaction initialization failed",
            details: transactionErr,
          });
      }

      // Step 3: Insert the tournament
      db.query(
        sqlInsertTournament,
        [
          tournamentData.start_date,
          tournamentData.end_date,
          tournamentData.organizer_admin_id,
          tournamentData.name,
          tournamentData.organizing_team,
          tournamentData.banner_image,
          tournamentData.status,
        ],
        (insertErr, insertResult) => {
          if (insertErr) {
            return db.rollback(() => {
              res
                .status(500)
                .json({ error: "Error adding tournament", details: insertErr });
            });
          }

          const tournamentId = insertResult.insertId;

          // Step 4: Update the admin's `is_organizing` status
          db.query(
            sqlUpdateAdmin,
            [tournamentData.organizer_admin_id],
            (updateErr) => {
              if (updateErr) {
                return db.rollback(() => {
                  res
                    .status(500)
                    .json({
                      error: "Error updating admin status",
                      details: updateErr,
                    });
                });
              }

              // Commit transaction
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    res
                      .status(500)
                      .json({
                        error: "Error committing transaction",
                        details: commitErr,
                      });
                  });
                }

                res.status(201).json({
                  message: "Tournament added and assigned successfully",
                  tournamentId,
                });
              });
            }
          );
        }
      );
    });
  });
};

// Get all tournaments
const getAllTournaments = (req, res) => {
  const sql = "SELECT * FROM tournaments";

  db.query(sql, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching tournaments", details: err });
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
      return res
        .status(500)
        .json({ error: "Error fetching tournament", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.status(200).json(results[0]);
  });
};


const updateTournament = (req, res) => {
  // Extract admin ID from the request (assuming the token middleware sets req.admin)
  const adminId = req.admin.id; // Admin ID extracted from the token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  // Extract data from request body
  const { name, organizing_team, banner_image, status, start_date, end_date } = req.body;
  const tournamentId = req.params.id; // Tournament ID from the route parameter

  // Ensure that the tournament belongs to the admin (if needed)
  const checkTournamentOwnershipQuery = `
    SELECT * FROM tournaments 
    WHERE id = ? AND organizing_team = ?
  `;

  db.query(checkTournamentOwnershipQuery, [tournamentId, organizing_team], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error checking tournament ownership", details: err });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: "You do not have permission to update this tournament" });
    }

    // Update query
    const sql = `
      UPDATE tournaments SET 
          name = ?, organizing_team = ?, banner_image = ?, status = ?, 
          start_date = ?, end_date = ? 
      WHERE id = ? AND organizing_team = ?
    `;

    const params = [
      name,
      organizing_team,
      banner_image,
      status,
      start_date,
      end_date,
      tournamentId, // Use the tournament ID
      organizing_team, // Ensure it's the correct organizing team
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Error updating tournament", details: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tournament not found or you don't have permission" });
      }

      res.status(200).json({ message: "Tournament updated successfully" });
    });
  });
};

// Delete a tournament
const deleteTournament = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM tournaments WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error deleting tournament", details: err });
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
