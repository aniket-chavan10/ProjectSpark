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
const applyTeamToTournament = (tournamentId, teamId, callback) => {
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
                  message: "Team successfully applied for the tournament.",
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



const createTournamentMatch = (
  tournamentId,
  roundNumber,
  groupName,
  team1Id,
  team2Id,
  matchDate,
  matchTime,
  venue,
  dependentMatch1Id,
  dependentMatch2Id,
  callback
) => {
  const sqlInsertMatch = `
    INSERT INTO tournament_matches (
      tournament_id, 
      round_number, 
      group_name, 
      team1_id, 
      team2_id, 
      match_date, 
      match_time, 
      venue, 
      dependent_match1_id, 
      dependent_match2_id, 
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
  `;

  console.log("SQL Query:", sqlInsertMatch);
  console.log("Query Parameters:", [
    tournamentId,
    roundNumber,
    groupName,
    team1Id,
    team2Id,
    matchDate,
    matchTime,
    venue,
    dependentMatch1Id || null,
    dependentMatch2Id || null,
  ]);

  db.query(
    sqlInsertMatch,
    [
      tournamentId,
      roundNumber,
      groupName,
      team1Id,
      team2Id,
      matchDate,
      matchTime,
      venue,
      dependentMatch1Id || null,
      dependentMatch2Id || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Database Error:", err);
        return callback(err);
      }
      callback(null, {
        message: "Match created successfully",
        matchId: result.insertId,
      });
    }
  );
};

const scheduleMatches = (req, res) => {
  const { tournamentId, matches } = req.body;

  if (!tournamentId || !Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({ error: "Tournament ID and match details are required." });
  }

  // SQL query for inserting matches
  const sqlInsertMatch = `
    INSERT INTO tournament_matches (tournament_id, round_number, group_name, team1_id, team2_id, match_date, match_time, venue, status, dependent_match_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Prepare the match data
  const insertPromises = matches.map((match) => {
    let round_number;
    let dependent_match_id = null;

    // Determine the round number based on match number
    if ([3, 6, 10, 13, 17, 20, 24, 27].includes(match.match_number)) {
      round_number = 2;  // Second round
    } else if ([7, 14, 21, 28].includes(match.match_number)) {
      round_number = 3;  // Third round
    } else if ([29, 30].includes(match.match_number)) {
      round_number = 4;  // Semi-finals
    } else if (match.match_number === 31) {
      round_number = 5;  // Final
    } else {
      round_number = 1;  // First round
    }

    // If the match is from the second, third, or semi-final round, set the dependent match ID
    if ([7, 14, 21, 28, 29, 30].includes(match.match_number)) {
      // Set dependent match ID based on the round logic
      const dependentMatch = matches.find((m) => m.match_number === match.dependent_match_number);
      if (dependentMatch) {
        dependent_match_id = dependentMatch.match_number;
      }
    }

    return new Promise((resolve, reject) => {
      db.query(
        sqlInsertMatch,
        [
          tournamentId,
          round_number,
          match.group_name || null, // group_name is optional for knockout rounds
          match.team1_id,
          match.team2_id,
          match.match_date,
          match.match_time,
          match.venue,
          match.status || "scheduled", // Default status to "scheduled"
          dependent_match_id || null, // Dependent match ID is optional
        ],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  });

  // Wait for all insertions to complete
  Promise.all(insertPromises)
    .then(() => {
      res.status(200).json({
        message: "Matches scheduled successfully.",
        totalMatches: matches.length,
      });
    })
    .catch((error) => {
      res.status(500).json({
        error: "Error scheduling tournament matches.",
        details: error,
      });
    });
};



// Function to fetch matches for a tournament
const getTournamentMatches = (tournamentId, callback) => {
  const sqlGetMatches = `
    SELECT * FROM tournament_matches WHERE tournament_id = ?
  `;

  db.query(sqlGetMatches, [tournamentId], (err, results) => {
    if (err) {
      return callback(err);
    }
    callback(null, results);
  });
};

// Function to update the match status
const updateMatchStatus = (matchId, status, winnerTeamId, callback) => {
  const sqlUpdateStatus = `
    UPDATE tournament_matches
    SET status = ?, winner_team_id = ?
    WHERE id = ?
  `;

  db.query(sqlUpdateStatus, [status, winnerTeamId, matchId], (err, result) => {
    if (err) {
      return callback(err);
    }
    callback(null, { message: "Match status updated successfully" });
  });
};

// Function to get match details by match ID
const getMatchDetails = (matchId, callback) => {
  const sqlGetMatchDetails = `
    SELECT * FROM tournament_matches WHERE id = ?
  `;

  db.query(sqlGetMatchDetails, [matchId], (err, results) => {
    if (err) {
      return callback(err);
    }
    callback(null, results[0]);
  });
};

module.exports = {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  applyTeamToTournament,
  deleteTournament,
  addNotification,
  createTournamentMatch,
  scheduleMatches 
};
