const db = require("../dbconfigure");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { addNotification} = require('../models/tournamentModel')

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
        return res.status(500).json({
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
                  res.status(500).json({
                    error: "Error updating admin status",
                    details: updateErr,
                  });
                });
              }

              // Commit transaction
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    res.status(500).json({
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
        return res
          .status(403)
          .json({
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
          return res
            .status(404)
            .json({
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

const tournamentOrganizer = (req, res) => {
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

  // Fetch the tournament based on adminId
  const sqlCheck = `
    SELECT id, organizer_admin_id FROM tournaments
    WHERE organizer_admin_id = ?
  `;

  db.query(sqlCheck, [adminId], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Error fetching tournaments for this admin",
        details: err,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "No tournaments found for this admin",
      });
    }

    const tournament = results[0];
    const tournamentId = tournament.id;

    if (tournament.organizer_admin_id !== adminId) {
      return res.status(403).json({
        error: "You do not have permission to update this tournament",
      });
    }

    let sql = "UPDATE tournaments SET ";
    const params = [];

    if (name) {
      sql += "name = ?";
      params.push(name);
    }

    if (bannerImage) {
      if (params.length > 0) sql += ", ";
      sql += "banner_image = ?";
      params.push(bannerImage);
    }

    sql += " WHERE id = ?";
    params.push(tournamentId);

    db.query(sql, params, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error updating tournament details", details: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Notify other admins (excluding the organizer)
      const notifyAdminsSql = `SELECT id FROM admins WHERE id != ?`;
      db.query(notifyAdminsSql, [adminId], (err, admins) => {
        if (err) {
          return res.status(500).json({
            error: "Error fetching admins for notification",
            details: err,
          });
        }

        const message = `A new tournament "${name}" has been updated. Apply now!`;
        const notifications = admins.map(admin => [admin.id, message, tournamentId, false, new Date()]);

        // Batch insert notifications
        const insertNotificationSql = `
          INSERT INTO notifications (recipient_admin_id, message, tournament_id, is_read, created_at)
          VALUES ?
        `;

        db.query(insertNotificationSql, [notifications], (err) => {
          if (err) {
            return res.status(500).json({
              error: "Error sending notifications to admins",
              details: err,
            });
          }

          res.status(200).json({
            message:
              "Tournament details updated successfully and admins notified.",
            updatedFields: { name, banner_image: bannerImage },
          });
        });
      });
    });
  });
};


const getAssignedTournaments = (req, res) => {
  const adminId = req.admin.id; // Extract admin ID from the request

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  const sql = `
    SELECT * 
    FROM tournaments 
    WHERE organizer_admin_id = ?
  `;

  db.query(sql, [adminId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching assigned tournaments", details: err });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No tournaments assigned to this admin" });
    }

    res.status(200).json(results);
  });
};


const getTournamentInvitations = (req, res) => {
  const adminId = req.admin.id; // Extract admin ID from the token

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

  db.query(sql, [adminId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching notifications.", details: err });
    }

    const invitations = results.map((invitation) => ({
      notificationId: invitation.notification_id,
      message: invitation.message,
      tournamentId: invitation.tournament_id,
      tournamentName: invitation.tournament_name,
      bannerImage: invitation.banner_image,
      availableSlots:invitation.available_slots,
      isRead: invitation.is_read,
      createdAt: invitation.created_at,
      applyUrl: `/tournaments/apply/${invitation.tournament_id}`, // Application link for the tournament
    }));

    res.status(200).json({
      message: "Tournament invitations fetched successfully.",
      invitations,
    });
  });
};

const applyForTournament = (req, res) => {
  const adminId = req.admin.id; // Extract admin ID from the token
  const { tournamentId } = req.body; // Tournament ID from the request body

  if (!adminId || !tournamentId) {
    return res.status(400).json({ error: "Admin ID and Tournament ID are required." });
  }

  // SQL query to check if the admin was invited to this tournament
  const checkInvitationSQL = `
    SELECT id 
    FROM notifications 
    WHERE recipient_admin_id = ? AND tournament_id = ? AND is_read = FALSE
  `;

  db.query(checkInvitationSQL, [adminId, tournamentId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error checking invitation.", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No valid invitation found for this tournament." });
    }

    // Get all notification IDs for this admin and tournament
    const notificationIds = results.map(row => row.id);

    // SQL query to mark all relevant invitations as applied
    const applyTournamentSQL = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id IN (?)
    `;

    db.query(applyTournamentSQL, [notificationIds], (err, updateResult) => {
      if (err) {
        return res.status(500).json({ error: "Error updating invitation status.", details: err });
      }

      // Check if the admin has already applied for this tournament
      const checkParticipationSQL = `
        SELECT id 
        FROM tournament_participants 
        WHERE admin_id = ? AND tournament_id = ?
      `;

      db.query(checkParticipationSQL, [adminId, tournamentId], (err, participationResults) => {
        if (err) {
          return res.status(500).json({ error: "Error checking participation.", details: err });
        }

        if (participationResults.length > 0) {
          return res.status(400).json({ error: "Admin has already applied for this tournament." });
        }

        // Check available slots for the tournament
        const checkSlotsSQL = `
          SELECT available_slots 
          FROM tournaments 
          WHERE id = ?
        `;

        db.query(checkSlotsSQL, [tournamentId], (err, slotResults) => {
          if (err) {
            return res.status(500).json({ error: "Error checking available slots.", details: err });
          }

          if (slotResults.length === 0 || slotResults[0].available_slots <= 0) {
            return res.status(400).json({ error: "No slots available for this tournament." });
          }

          const availableSlots = slotResults[0].available_slots;

          // Log the admin's application in the `tournament_participants` table
          const logApplicationSQL = `
            INSERT INTO tournament_participants (admin_id, tournament_id, applied_at)
            VALUES (?, ?, NOW())
          `;

          db.query(logApplicationSQL, [adminId, tournamentId], (err, logResult) => {
            if (err) {
              return res.status(500).json({ error: "Error logging application.", details: err });
            }

            // Reduce the available slots by 1
            const updateSlotsSQL = `
              UPDATE tournaments 
              SET available_slots = available_slots - 1 
              WHERE id = ?
            `;

            db.query(updateSlotsSQL, [tournamentId], (err, updateResult) => {
              if (err) {
                return res.status(500).json({ error: "Error updating available slots.", details: err });
              }

              res.status(200).json({
                message: "Successfully applied for the tournament.",
                application: {
                  adminId,
                  tournamentId,
                  appliedAt: new Date().toISOString(),
                  remainingSlots: availableSlots - 1,
                },
              });
            });
          });
        });
      });
    });
  });
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
  applyForTournament
};
