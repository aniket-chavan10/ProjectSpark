const {
  addPlayerCore,
  getAllPlayersCore,
  getPlayerCoreById,
  updatePlayerCore,
  deletePlayerCore,
  getPlayerByEmailCore,
} = require("../models/playersModel");

const db = require("../dbconfigure");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const createPlayer = async (req, res) => {
  const playerData = req.body;
  const file = req.file; // Access the uploaded file

  // Validate required fields
  const requiredFields = ["full_name", "mobile_number", "email"];
  const missingFields = requiredFields.filter((field) => !playerData[field]);

  if (missingFields.length) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  // Extract and validate the token
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Decode the token to get the admin ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the secret
    const adminId = decoded.id;

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID not available in token" });
    }

    // Fetch the team_name for the admin from the database
    const [adminResult] = await db
      .promise()
      .query(`SELECT team_name FROM admins WHERE id = ?`, [adminId]);

    if (!adminResult.length) {
      return res
        .status(400)
        .json({ error: `Admin with ID ${adminId} does not exist` });
    }

    const teamName = adminResult[0].team_name;

    if (!teamName) {
      return res
        .status(400)
        .json({ error: "Admin is not associated with any team" });
    }

    // Add the team_name to the player data
    playerData.team_name = teamName;

    // Generate a secure random password
    const generatedPassword = crypto.randomBytes(8).toString("hex");

    // Hash the generated password before storing it
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    playerData.password = hashedPassword;

    // Default values for optional fields
    playerData.is_banned = playerData.is_banned || false;
    playerData.banned_until = playerData.banned_until || null;

    // Save the file path if a file is uploaded
    if (file) {
      playerData.profile_picture = file.path; // Match database column name
    }

    // Add player to the database
    const [result] = await db.promise().query(
      `INSERT INTO players_core (full_name, mobile_number, email, profile_picture, password, is_banned, banned_until, team_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

      [
        playerData.full_name,
        playerData.mobile_number,
        playerData.email,
        playerData.profile_picture,
        playerData.password,
        playerData.is_banned,
        playerData.banned_until,
        playerData.team_name,
      ]
    );

    const playerId = result.insertId;

    // Send an email to the player
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: playerData.email,
      subject: "Welcome to the Jaoli Cricket Association",
      text: `Hi ${playerData.full_name},\n\nYou have been successfully added to the Cricket Association system.\nHere are your login credentials:\n\nEmail: ${playerData.email}\nPassword: ${generatedPassword}\n\nPlease log in and change your password at your earliest convenience.\n\nBest regards,\nJaoli Cricket Association Team`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Player added successfully and email sent",
      playerId,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ error: "Unexpected error occurred", details: error });
  }
};

const playerLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Fetch player by email
    getPlayerByEmailCore(email, async (err, player) => {
      if (err) {
        console.error("Error fetching player:", err);
        return res
          .status(500)
          .json({ error: "Failed to log in", details: err });
      }

      if (!player || player.length === 0) {
        return res.status(404).json({ error: "Player not found" });
      }

      const playerData = player[0];

      // Compare password
      const isPasswordMatch = await bcrypt.compare(
        password,
        playerData.password
      );

      if (!isPasswordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT token with role and player id
      const payload = {
        id: playerData.player_id, // Ensure 'id' is in the payload
        email: playerData.email,
        role: "player",
      };

      // Log the payload before signing for debugging
      console.log("Token Payload:", payload);

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({ message: "Login successful", token });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ error: "Unexpected error occurred", details: error });
  }
};

// Get all players
const getAllPlayers = (req, res) => {
  getAllPlayersCore((err, results) => {
    if (err) {
      console.error("Error fetching players:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch players", details: err });
    }
    res.status(200).json(results);
  });
};

// Get a player by ID
const getPlayerById = (req, res) => {
  const playerId = req.params.id;

  getPlayerCoreById(playerId, (err, result) => {
    if (err) {
      console.error("Error fetching player:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch player", details: err });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json(result[0]);
  });
};

// Update a player's details
const updatePlayer = (req, res) => {
  const playerId = req.params.id;
  const updatedData = req.body;

  updatePlayerCore(playerId, updatedData, (err, result) => {
    if (err) {
      console.error("Error updating player:", err);
      return res
        .status(500)
        .json({ error: "Failed to update player", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json({ message: "Player updated successfully" });
  });
};

// Delete a player by ID
const deletePlayer = (req, res) => {
  const playerId = req.params.id;

  deletePlayerCore(playerId, (err, result) => {
    if (err) {
      console.error("Error deleting player:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete player", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json({ message: "Player deleted successfully" });
  });
};

const getPlayersByTeam = (req, res) => {
  const adminId = req.admin.id; // Extract admin ID from token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  // Step 1: Fetch the admin's team name
  const getTeamNameSql = `
    SELECT team_name FROM admins
    WHERE id = ?
  `;

  db.query(getTeamNameSql, [adminId], (err, adminResults) => {
    if (err) {
      return res.status(500).json({
        error: "Error fetching admin details",
        details: err,
      });
    }

    if (adminResults.length === 0) {
      return res.status(404).json({
        error: "Admin not found",
      });
    }

    const teamName = adminResults[0].team_name;

    // Step 2: Fetch players by team name
    const getPlayersSql = `
      SELECT * FROM players_core
      WHERE team_name = ?
    `;

    db.query(getPlayersSql, [teamName], (err, playerResults) => {
      if (err) {
        return res.status(500).json({
          error: "Error fetching players",
          details: err,
        });
      }

      if (playerResults.length === 0) {
        return res.status(404).json({
          error: "No players found for the team",
        });
      }

      // Return the list of players
      res.status(200).json({
        message: "Players fetched successfully",
        players: playerResults,
      });
    });
  });
};

module.exports = {
  createPlayer,
  playerLogin,
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  playerLogin,
  getPlayersByTeam,
};
