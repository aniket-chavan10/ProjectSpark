const db = require("../dbconfigure");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { addNotification } = require("../models/tournamentModel");
const tournamentModel = require("../models/tournamentModel");

// Add a new tournament (used by the master admin) and assign to organizing team
const addTournament = async (req, res) => {
  const { start_date, end_date, organizing_team } = req.body;

  // Validate required fields
  if (!start_date || !end_date || !organizing_team) {
    return res.status(400).json({
      error: "Start date, end date, and organizing team are required",
    });
  }

  // SQL queries
  const sqlGetAdminId = `
    SELECT admin_id FROM teams WHERE team_name = ?
  `;
  const sqlInsertTournament = `
    INSERT INTO tournaments (
      start_date, end_date, organizer_admin_id, name, organizing_team, banner_image, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const sqlUpdateAdmin = `
    UPDATE admins SET is_organizer = true WHERE id = ?
  `;

  const connection = await db.getConnection();

  try {
    // Step 1: Retrieve the admin ID for the organizing team
    const [teamResults] = await connection.query(sqlGetAdminId, [organizing_team]);

    if (teamResults.length === 0) {
      return res.status(404).json({ error: "Organizing team not found" });
    }

    const organizerAdminId = teamResults[0].admin_id;

    // Start transaction
    await connection.beginTransaction();

    // Step 2: Insert the tournament
    const [insertResult] = await connection.execute(sqlInsertTournament, [
      start_date,
      end_date,
      organizerAdminId,
      null, // Tournament name to be added later
      organizing_team,
      null, // Banner image placeholder
      "pending", // Default status
    ]);

    const tournamentId = insertResult.insertId;

    // Step 3: Update admin's organizer status
    await connection.execute(sqlUpdateAdmin, [organizerAdminId]);

    // Commit transaction
    await connection.commit();

    res.status(201).json({
      message: "Tournament added and assigned successfully",
      tournamentId,
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) await connection.rollback();

    res.status(500).json({
      error: "Error adding tournament",
      details: error.message || error,
    });
  } finally {
    // Release the connection
    if (connection) connection.release();
  }
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
  const { name, organizing_team, banner_image, status, start_date, end_date } =
    req.body;
  const tournamentId = req.params.id; // Tournament ID from the route parameter

  // Ensure that the tournament belongs to the admin (if needed)
  const checkTournamentOwnershipQuery = `
    SELECT * FROM tournaments 
    WHERE id = ? AND organizing_team = ?
  `;

  db.query(
    checkTournamentOwnershipQuery,
    [tournamentId, organizing_team],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error checking tournament ownership", details: err });
      }

      if (results.length === 0) {
        return res.status(403).json({
          error: "You do not have permission to update this tournament",
        });
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
          return res
            .status(500)
            .json({ error: "Error updating tournament", details: err });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: "Tournament not found or you don't have permission",
          });
        }

        res.status(200).json({ message: "Tournament updated successfully" });
      });
    }
  );
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

const tournamentOrganizer = async (req, res) => {
  const adminId = req.admin.id; // Admin ID extracted from token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  const { name } = req.body;
  const bannerImage = req.file ? req.file.path : null;

  if (!name && !bannerImage) {
    return res.status(400).json({
      error:
        "At least one of name or banner image is required to update the tournament.",
    });
  }

  try {
    const [tournaments] = await db.query(
      `SELECT id, organizer_admin_id FROM tournaments WHERE organizer_admin_id = ?`,
      [adminId]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({ error: "No tournaments found for this admin" });
    }

    const tournament = tournaments[0];
    if (tournament.organizer_admin_id !== adminId) {
      return res.status(403).json({
        error: "You do not have permission to update this tournament",
      });
    }

    const updateFields = [];
    const params = [];
    if (name) {
      updateFields.push("name = ?");
      params.push(name);
    }
    if (bannerImage) {
      updateFields.push("banner_image = ?");
      params.push(bannerImage);
    }
    params.push(tournament.id);

    const updateSql = `UPDATE tournaments SET ${updateFields.join(", ")} WHERE id = ?`;
    const [updateResult] = await db.query(updateSql, params);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Notify other admins
    const [admins] = await db.query(`SELECT id FROM admins WHERE id != ?`, [
      adminId,
    ]);

    if (admins.length > 0) {
      const message = `A new tournament "${name}" has been updated. Apply now!`;
      const notifications = admins.map((admin) => [
        admin.id,
        message,
        tournament.id,
        false,
        new Date(),
      ]);

      await db.query(
        `
        INSERT INTO notifications (recipient_admin_id, message, tournament_id, is_read, created_at)
        VALUES ?
      `,
        [notifications]
      );
    }

    return res.status(200).json({
      message: "Tournament details updated successfully and admins notified.",
      updatedFields: { name, banner_image: bannerImage },
    });
  } catch (err) {
    return res.status(500).json({
      error: "An unexpected error occurred",
      details: err.message,
    });
  }
};


const getAssignedTournaments = async (req, res) => {
  const adminId = req.admin?.id; // Extract admin ID from the request

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  const sql = `
    SELECT 
      id AS tournamentId,
      name AS tournamentName,
      start_date AS startDate,
      end_date AS endDate,
      organizing_team AS organizingTeam,
      banner_image AS bannerImage,
      status
    FROM tournaments
    WHERE organizer_admin_id = ?
  `;

  try {
    const [results] = await db.query(sql, [adminId]);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No tournaments assigned to this admin" });
    }

    res.status(200).json({
      message: "Assigned tournaments fetched successfully",
      tournaments: results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching assigned tournaments",
      details: error.message || error,
    });
  }
};

const getTournamentInvitations = async (req, res) => {
  const adminId = req.admin?.id; // Extract admin ID from the token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required." });
  }

  const sql = `
    SELECT 
      n.id AS notification_id,
      n.message,
      n.tournament_id,
      n.is_read,
      n.created_at,
      t.name AS tournament_name,
      t.banner_image,
      t.available_slots
    FROM notifications n
    JOIN tournaments t ON n.tournament_id = t.id
    WHERE n.recipient_admin_id = ? AND n.is_read = FALSE
    ORDER BY n.created_at DESC
  `;

  try {
    const [results] = await db.query(sql, [adminId]);

    const invitations = results.map((invitation) => ({
      notificationId: invitation.notification_id,
      message: invitation.message,
      tournamentId: invitation.tournament_id,
      tournamentName: invitation.tournament_name,
      bannerImage: invitation.banner_image,
      availableSlots: invitation.available_slots,
      isRead: !!invitation.is_read,
      createdAt: invitation.created_at,
      applyUrl: `/tournaments/apply/${invitation.tournament_id}`, // Application link for the tournament
    }));

    res.status(200).json({
      message: "Tournament invitations fetched successfully.",
      invitations,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching notifications.",
      details: error.message || error,
    });
  }
};

const applyForTournament = async (req, res) => {
  const { tournamentId, teamId } = req.body;

  if (!tournamentId || !teamId) {
    return res
      .status(400)
      .json({ error: "Tournament ID and Team ID are required." });
  }

  try {
    // Check if the team has already applied for the tournament
    const sqlCheckParticipant = `
      SELECT id 
      FROM tournament_participants 
      WHERE tournament_id = ? AND team_id = ?
    `;

    const [results] = await db.query(sqlCheckParticipant, [tournamentId, teamId]);

    if (results.length > 0) {
      return res
        .status(400)
        .json({ error: "Team has already applied for this tournament." });
    }

    // Apply the team to the tournament
    const sqlInsertParticipant = `
      INSERT INTO tournament_participants (tournament_id, team_id, created_at)
      VALUES (?, ?, ?)
    `;

    const [insertResult] = await db.query(sqlInsertParticipant, [
      tournamentId,
      teamId,
      new Date(),
    ]);

    if (insertResult.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to apply the team to the tournament." });
    }

    res.status(200).json({
      message: "Team successfully applied for the tournament.",
      tournamentId,
      teamId,
    });
  } catch (err) {
    res.status(500).json({
      error: "An unexpected error occurred.",
      details: err.message,
    });
  }
};


const getAppliedTeams = async (req, res) => {
  const { tournamentId } = req.params;

  if (!tournamentId) {
    return res.status(400).json({ error: "Tournament ID is required." });
  }

  try {
    const sqlGetAppliedTeams = `
      SELECT 
        tp.team_id,
        t.team_name AS team_name,
        t.logo AS team_logo
      FROM tournament_participants tp
      JOIN teams t ON tp.team_id = t.id
      WHERE tp.tournament_id = ?
    `;

    const [results] = await db.query(sqlGetAppliedTeams, [tournamentId]);

    if (results.length === 0) {
      return res.status(404).json({
        message: "No teams have applied for this tournament.",
      });
    }

    res.status(200).json({
      message: "Applied teams fetched successfully.",
      teams: results,
    });
  } catch (err) {
    console.error("Error fetching applied teams:", err);
    res.status(500).json({
      error: "Error fetching applied teams.",
      details: err.message,
    });
  }
};


const assignGroupsToTeams = async (req, res) => {
  const { tournamentId, groupAssignments, random } = req.body;

  if (!tournamentId) {
    return res.status(400).json({ error: "Tournament ID is required." });
  }

  try {
    // Retrieve the list of teams participating in the tournament
    const sqlGetTeams = `
      SELECT id, team_id, group_name
      FROM tournament_participants
      WHERE tournament_id = ?
    `;

    const [teams] = await db.query(sqlGetTeams, [tournamentId]);

    if (teams.length !== 32) {
      return res.status(400).json({
        error: "Tournament must have exactly 32 teams to assign groups.",
      });
    }

    let assignments = [];

    // Random assignment logic
    if (random) {
      const groupNames = ["A", "B", "C", "D"];
      const shuffledTeams = teams.sort(() => Math.random() - 0.5);
      assignments = shuffledTeams.map((team, index) => ({
        id: team.id,
        groupName: groupNames[index % groupNames.length],
      }));
    }
    // Manual assignment logic
    else if (groupAssignments?.length) {
      const groupNames = ["A", "B", "C", "D"];
      const groupCounts = {};

      // Validate and process groupAssignments
      try {
        assignments = groupAssignments.map(({ teamId, groupName }) => {
          if (!groupNames.includes(groupName)) {
            throw new Error(`Invalid group name: ${groupName}`);
          }

          const team = teams.find((t) => t.team_id === teamId);
          if (!team) {
            throw new Error(`Team ID ${teamId} not found.`);
          }

          // Track group sizes
          groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;
          if (groupCounts[groupName] > 8) {
            throw new Error(`Group ${groupName} exceeds the limit of 8 teams.`);
          }

          return { id: team.id, groupName };
        });
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    } else {
      return res.status(400).json({ error: "Invalid group assignments." });
    }

    // Update the database with group assignments
    const sqlAssignGroup = `
      UPDATE tournament_participants
      SET group_name = ?
      WHERE id = ?
    `;

    console.log("Assignments to be updated:", assignments);

    // Execute SQL update for each assignment
    const updatePromises = assignments.map(({ id, groupName }) =>
      db.query(sqlAssignGroup, [groupName, id])
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      message: "Groups assigned successfully.",
      assignedTeams: assignments,
    });
  } catch (error) {
    console.error("Error assigning groups to teams:", error.message);
    res.status(500).json({
      error: "Error assigning groups to teams.",
      details: error.message,
    });
  }
};

const getGroupsAssignedTeams = async (req, res) => {
  const { tournamentId } = req.params;

  if (!tournamentId) {
    return res.status(400).json({ error: "Tournament ID is required." });
  }

  try {
    // Retrieve the list of teams, their names, and their assigned groups in the tournament
    const sqlGetAssignedTeams = `
      SELECT t.id, t.team_name, tp.group_name
      FROM tournament_participants tp
      JOIN teams t ON tp.team_id = t.id
      WHERE tp.tournament_id = ?
    `;

    const [teams] = await db.query(sqlGetAssignedTeams, [tournamentId]);

    if (teams.length === 0) {
      return res.status(404).json({ error: "No teams found for this tournament." });
    }

    // Group the teams by their assigned group name
    const groupsAssignedTeams = teams.reduce((acc, team) => {
      const { group_name, team_name, id } = team;
      if (!acc[group_name]) {
        acc[group_name] = [];
      }
      acc[group_name].push({
        id,
        team_name, // Adding team name to the response
        group_name
      });
      return acc;
    }, {});

    // Send the response with teams grouped by their assigned group
    res.status(200).json({
      message: "Groups and assigned teams fetched successfully.",
      groupsAssignedTeams,
    });
  } catch (error) {
    console.error("Error retrieving assigned teams:", error.message);
    res.status(500).json({
      error: "Error retrieving assigned teams.",
      details: error.message,
    });
  }
};






const createMatch = (req, res) => {
  console.log("Request Body:", req.body);

  const matches = req.body;

  if (!Array.isArray(matches) || matches.length === 0) {
    return res
      .status(400)
      .json({ error: "Request body must be a non-empty array of matches." });
  }

  const errors = [];
  const successes = [];

  matches.forEach((match, index) => {
    const {
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
    } = match;

    // Validate required fields
    if (
      !tournament_id ||
      !round_number ||
      (!team1_id && !dependent_match1_id) || // At least one should be provided
      (!team2_id && !dependent_match2_id) || // At least one should be provided
      !match_date ||
      !match_time ||
      !venue
    ) {
      errors.push({ index, error: "All fields are required for this match." });
      return;
    }

    const groupNameValue = group_name || null;

    const insertMatch = () => {
      tournamentModel.createTournamentMatch(
        tournament_id,
        round_number,
        groupNameValue,
        team1_id,
        team2_id,
        match_date,
        match_time,
        venue,
        dependent_match1_id,
        dependent_match2_id,
        (err, result) => {
          if (err) {
            console.error("Error creating match:", err);
            errors.push({
              index,
              error: "Error creating match.",
              details: err,
            });
          } else {
            successes.push({ index, result });
          }

          // If all matches have been processed, respond
          if (successes.length + errors.length === matches.length) {
            return res.status(200).json({ successes, errors });
          }
        }
      );
    };

    if (round_number <= 3) {
      // Validation for rounds 1 to 3: Teams must be from the same group
      const sqlCheckGroups = `
        SELECT team_id, group_name
        FROM tournament_participants
        WHERE tournament_id = ? AND team_id IN (?, ?)
      `;

      db.query(
        sqlCheckGroups,
        [tournament_id, team1_id || 0, team2_id || 0],
        (err, results) => {
          if (err) {
            console.error("Error fetching teams' group names:", err);
            errors.push({
              index,
              error: "Error validating teams' group names.",
              details: err,
            });
          } else if (results.length !== 2) {
            errors.push({
              index,
              error:
                "Both teams must be participants in the tournament, or dependencies must be valid.",
            });
          } else {
            const [team1, team2] = results;
            if (team1.group_name !== team2.group_name) {
              errors.push({
                index,
                error:
                  "For rounds 1 to 3, matches can only be created between teams in the same group.",
              });
            } else {
              insertMatch();
            }
          }

          if (successes.length + errors.length === matches.length) {
            return res.status(200).json({ successes, errors });
          }
        }
      );
    } else {
      // For rounds beyond 3, no group validation is required
      insertMatch();
    }
  });
};

const scheduleTournamentMatches = async (req, res) => {
  const { tournamentId, matches } = req.body;

  if (!tournamentId || !matches || !Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({
      error: "Tournament ID and matches array are required.",
    });
  }

  const matchDependencies = {
    3: { dependent_match1_id: 1, dependent_match2_id: 2, round: 2 },
    6: { dependent_match1_id: 4, dependent_match2_id: 5, round: 2 },
    7: { dependent_match1_id: 3, dependent_match2_id: 6, round: 3 },
    10: { dependent_match1_id: 8, dependent_match2_id: 9, round: 2 },
    13: { dependent_match1_id: 11, dependent_match2_id: 12, round: 2 },
    14: { dependent_match1_id: 10, dependent_match2_id: 13, round: 3 },
    17: { dependent_match1_id: 15, dependent_match2_id: 16, round: 2 },
    20: { dependent_match1_id: 18, dependent_match2_id: 19, round: 2 },
    21: { dependent_match1_id: 17, dependent_match2_id: 20, round: 3 },
    24: { dependent_match1_id: 22, dependent_match2_id: 23, round: 2 },
    27: { dependent_match1_id: 25, dependent_match2_id: 26, round: 2 },
    28: { dependent_match1_id: 24, dependent_match2_id: 27, round: 3 },
    29: { dependent_match1_id: 7, dependent_match2_id: 21, round: 4 },
    30: { dependent_match1_id: 14, dependent_match2_id: 28, round: 4 },
    31: { dependent_match1_id: 29, dependent_match2_id: 30, round: 5 },
  };

  const sqlGetGroupForTeam = `
    SELECT group_name FROM tournament_participants 
    WHERE tournament_id = ? AND team_id = ?
  `;

  const sqlInsertMatch = `
    INSERT INTO tournament_matches 
    (tournament_id, round_number, group_name, team1_id, team2_id, match_no, venue, dependent_match1_id, dependent_match2_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    // Insert provided first-round matches
    for (const match of matches) {
      const team1GroupResult = await db.execute(sqlGetGroupForTeam, [tournamentId, match.team1Id]);
      const team2GroupResult = await db.execute(sqlGetGroupForTeam, [tournamentId, match.team2Id]);

      // Log the results to check group names
      console.log("team1GroupResult:", team1GroupResult);
      console.log("team2GroupResult:", team2GroupResult);

      const team1Group = team1GroupResult[0]?.[0]?.group_name || null; // Fixing access to group_name
      const team2Group = team2GroupResult[0]?.[0]?.group_name || null; // Fixing access to group_name

      console.log(`team1Group: ${team1Group}, team2Group: ${team2Group}`);

      // Check if teams belong to the same group
      if (team1Group !== team2Group) {
        return res.status(400).json({
          error: `Teams ${match.team1Id} and ${match.team2Id} do not belong to the same group.`,
        });
      }

      // Insert the match into the tournament
      await db.execute(sqlInsertMatch, [
        tournamentId,
        1, // First round
        team1Group, // Group name fetched from the database
        match.team1Id,
        match.team2Id,
        match.match_no,
        match.venue || "Default Venue",
        null, // No dependencies for round 1
        null,
        "scheduled",
      ]);
    }

    // Generate and insert placeholders for dependent matches
    for (const [match_no, dependencies] of Object.entries(matchDependencies)) {
      await db.execute(sqlInsertMatch, [
        tournamentId,
        dependencies.round, // Set the round number based on the dependencies object
        null, // No group yet
        null, // No team1
        null, // No team2
        match_no,
        "TBD Venue", // Placeholder
        dependencies.dependent_match1_id,
        dependencies.dependent_match2_id,
        "scheduled", // Placeholder status
      ]);
    }

    res.status(200).json({
      message: "Tournament matches scheduled successfully!",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error scheduling matches.",
      details: error.message || error,
    });
  }
};







const  updateMatchDateTime  = async (req, res) => {
  const { matches } = req.body;

  // Validate request payload
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({
      error: "An array of matches with matchId, matchDate, and matchTime is required.",
    });
  }

  const sqlUpdateMatch = `
    UPDATE tournament_matches 
    SET match_date = ?, match_time = ? 
    WHERE id = ?
  `;

  try {
    const results = [];
    for (const match of matches) {
      const { matchId, matchDate, matchTime } = match;

      // Validate each match payload
      if (!matchId || !matchDate || !matchTime) {
        results.push({
          matchId,
          status: "error",
          error: "Invalid match data (matchId, matchDate, and matchTime are required).",
        });
        continue;
      }

      try {
        const [result] = await db.execute(sqlUpdateMatch, [
          matchDate,
          matchTime,
          matchId,
        ]);

        if (result.affectedRows === 0) {
          results.push({
            matchId,
            status: "not_found",
            message: "Match not found or no changes made.",
          });
        } else {
          results.push({
            matchId,
            status: "success",
            message: "Match updated successfully.",
          });
        }
      } catch (error) {
        results.push({
          matchId,
          status: "error",
          error: error.message || "Database error.",
        });
      }
    }

    res.status(200).json({
      message: "Matches processed.",
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error updating matches.",
      details: error.message || error,
    });
  }
};





// sample controller just to check 

const updateMatchResult = async (req, res) => {
  const { matchId, winnerTeamId } = req.body;

  if (!matchId || !winnerTeamId) {
    return res.status(400).json({
      error: "Match ID and Winner Team ID are required.",
    });
  }

  const sqlUpdateMatch = `
    UPDATE tournament_matches
    SET winner_team_id = ?, status = 'completed'
    WHERE id = ?
  `;

  const sqlGetDependentMatches = `
    SELECT id, dependent_match1_id, dependent_match2_id, team1_id, team2_id
    FROM tournament_matches
    WHERE dependent_match1_id = ? OR dependent_match2_id = ?
  `;

  const sqlUpdateDependentMatch = `
    UPDATE tournament_matches
    SET 
      team1_id = CASE WHEN dependent_match1_id = ? THEN ? ELSE team1_id END,
      team2_id = CASE WHEN dependent_match2_id = ? THEN ? ELSE team2_id END
    WHERE id = ?
  `;

  try {
    // Step 1: Update the match result
    await db.execute(sqlUpdateMatch, [winnerTeamId, matchId]);

    // Step 2: Retrieve dependent matches
    const [dependentMatches] = await db.query(sqlGetDependentMatches, [matchId, matchId]);

    if (dependentMatches.length === 0) {
      return res.status(200).json({
        message: "Match result updated successfully. No dependent matches found.",
      });
    }

    // Step 3: Update dependent matches
    const updatePromises = dependentMatches.map((match) => {
      // Check if the completed match is dependent match 1 or dependent match 2
      const isDependentMatch1 = match.dependent_match1_id === matchId;
      const isDependentMatch2 = match.dependent_match2_id === matchId;

      return db.execute(sqlUpdateDependentMatch, [
        isDependentMatch1 ? matchId : null,
        isDependentMatch1 ? winnerTeamId : null,
        isDependentMatch2 ? matchId : null,
        isDependentMatch2 ? winnerTeamId : null,
        match.id,
      ]);
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      message: "Match result updated and dependent matches updated successfully.",
      winnerTeamId,
      updatedMatchId: matchId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error updating match result.",
      details: error.message || error,
    });
  }
};





module.exports = {
  addTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  tournamentOrganizer,
  getAssignedTournaments,
  getTournamentInvitations,
  applyForTournament,
  createMatch,
  assignGroupsToTeams,
  getAppliedTeams,
  scheduleTournamentMatches,
  updateMatchResult,
  getGroupsAssignedTeams,
  updateMatchDateTime 
};
