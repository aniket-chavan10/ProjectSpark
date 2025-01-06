const db = require("../dbconfigure");

// Add a new tournament (used by the master admin)
const addTournament = (tournamentData, callback) => {
  const sql = `
    INSERT INTO tournaments (
        start_date, end_date, organizer_admin_id, name, organizing_team, 
        banner_image, status, total_slots, available_slots, application_deadline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    tournamentData.start_date,
    tournamentData.end_date,
    tournamentData.organizer_admin_id,
    tournamentData.name || null, // Name can be null initially
    tournamentData.organizing_team, // Organizing team is required
    tournamentData.banner_image || null, // Banner image can be null initially
    tournamentData.status || "pending", // Default status
    tournamentData.total_slots || 32, // Default total slots
    tournamentData.available_slots || 32, // Default available slots
    tournamentData.application_deadline || null, // Application deadline optional
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

// Apply for a tournament (first-come, first-served logic)
const applyForTournament = (tournamentId, teamId, callback) => {
  const sqlCheckSlots = `
    SELECT available_slots FROM tournaments WHERE id = ? FOR UPDATE
  `;
  const sqlInsertParticipant = `
    INSERT INTO tournament_participants (tournament_id, team_id) VALUES (?, ?)
  `;
  const sqlUpdateSlots = `
    UPDATE tournaments SET available_slots = available_slots - 1 WHERE id = ? AND available_slots > 0
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.beginTransaction((transactionErr) => {
      if (transactionErr) {
        connection.release();
        return callback(transactionErr);
      }

      connection.query(sqlCheckSlots, [tournamentId], (err, results) => {
        if (err || results[0].available_slots <= 0) {
          connection.rollback(() => connection.release());
          return callback(err || new Error("No slots available"));
        }

        connection.query(
          sqlInsertParticipant,
          [tournamentId, teamId],
          (err) => {
            if (err) {
              connection.rollback(() => connection.release());
              return callback(err);
            }

            connection.query(sqlUpdateSlots, [tournamentId], (err) => {
              if (err) {
                connection.rollback(() => connection.release());
                return callback(err);
              }

              connection.commit((err) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  return callback(err);
                }

                connection.release();
                callback(null, {
                  message: "Team successfully applied for the tournament",
                });
              });
            });
          }
        );
      });
    });
  });
};

// Update tournament details (used by the assigned admin)
const updateTournament = (tournamentId, updatedData, callback) => {
  const sql = `
    UPDATE tournaments SET 
        name = ?, organizing_team = ?, banner_image = ?, status = ?, 
        start_date = ?, end_date = ?, total_slots = ?, available_slots = ?, application_deadline = ?
    WHERE id = ?
  `;
  const params = [
    updatedData.name,
    updatedData.organizing_team, // Include organizing team in updates
    updatedData.banner_image,
    updatedData.status,
    updatedData.start_date,
    updatedData.end_date,
    updatedData.total_slots,
    updatedData.available_slots,
    updatedData.application_deadline,
    tournamentId,
  ];
  db.query(sql, params, callback);
};

const addNotification = (recipientAdminId, message, tournamentId, callback) => {
  const sql = `
    INSERT INTO notifications (recipient_admin_id, message, tournament_id)
    VALUES (?, ?, ?)
  `;
  const params = [recipientAdminId, message, tournamentId];
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
  applyForTournament,
  updateTournament,
  deleteTournament,
  addNotification,
};
