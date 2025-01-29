const db = require("../dbconfigure");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const {
  addPlayerCore,
  getAllPlayersCore,
  getPlayerCoreById,
  updatePlayerCore,
  deletePlayerCore,
  getPlayerByEmailCore,
} = require("../models/playersModel");

const createPlayer = async (req, res) => {
  const playerData = req.body;
  const file = req.file;

  // Validate required fields
  const requiredFields = ["full_name", "mobile_number", "email"];
  const missingFields = requiredFields.filter((field) => !playerData[field]);

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  // Validate and decode token
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;
    if (!adminId) return res.status(400).json({ error: "Invalid token" });

    // Get a connection from the pool
    const connection = await db.getConnection();
    try {
      // Fetch team name for the admin
      const [adminResult] = await connection.query(
        "SELECT team_name FROM admins WHERE id = ?",
        [adminId]
      );

      if (adminResult.length === 0) {
        return res.status(404).json({ error: "Admin not found" });
      }

      const teamName = adminResult[0].team_name;
      if (!teamName) {
        return res
          .status(400)
          .json({ error: "Admin is not associated with any team" });
      }

      // Generate password and hash it
      const generatedPassword = crypto.randomBytes(8).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Prepare player data
      playerData.team_name = teamName;
      playerData.password = hashedPassword;
      playerData.profile_picture = file?.path || null;
      playerData.is_banned = playerData.is_banned || false;
      playerData.banned_until = playerData.banned_until || null;

      // Insert player into database
      const [result] = await connection.query(
        `
        INSERT INTO players_core 
        (full_name, mobile_number, email, profile_picture, password, is_banned, banned_until, team_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
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

      // Send email with credentials
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: playerData.email,
        subject: "Welcome to the Jaoli Cricket Association",
        text: `Hi ${playerData.full_name},\n\nYou have been added to the Cricket Association system.\nLogin Credentials:\nEmail: ${playerData.email}\nPassword: ${generatedPassword}\n\nBest,\nJaoli Cricket Association`,
      });

      res
        .status(201)
        .json({
          message: "Player added and email sent",
          playerId: result.insertId,
        });
    } finally {
      connection.release(); // Always release the connection
    }
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({
      error: "Unexpected error occurred",
      details: error.message,
    });
  }
};

const playerLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const connection = await db.getConnection();
  try {
    const [players] = await connection.query(
      "SELECT player_id, email, password FROM players_core WHERE email = ?",
      [email]
    );

    if (players.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    const playerData = players[0];
    const isPasswordMatch = await bcrypt.compare(password, playerData.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: playerData.player_id, email: playerData.email, role: "player" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ error: "Unexpected error occurred", details: error.message });
  } finally {
    connection.release();
  }
};

const getAllPlayers = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [players] = await connection.query("SELECT * FROM players_core");
    res.status(200).json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch players", details: error.message });
  } finally {
    connection.release();
  }
};

// Get Player by ID
const getPlayerById = async (req, res) => {
  const playerId = req.params.id;

  const connection = await db.getConnection();
  try {
    const [player] = await connection.query(
      "SELECT * FROM players_core WHERE player_id = ?",
      [playerId]
    );

    if (player.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json(player[0]);
  } catch (error) {
    console.error("Error fetching player:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch player", details: error.message });
  } finally {
    connection.release();
  }
};

const updatePlayer = async (req, res) => {
  const playerId = req.params.id;
  const updatedData = req.body;

  const connection = await db.getConnection();
  try {
    const [result] = await connection.query(
      "UPDATE players_core SET ? WHERE player_id = ?",
      [updatedData, playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json({ message: "Player updated successfully" });
  } catch (error) {
    console.error("Error updating player:", error);
    res
      .status(500)
      .json({ error: "Failed to update player", details: error.message });
  } finally {
    connection.release();
  }
};

const deletePlayer = async (req, res) => {
  const playerId = req.params.id;

  const connection = await db.getConnection();
  try {
    const [result] = await connection.query(
      "DELETE FROM players_core WHERE player_id = ?",
      [playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.status(200).json({ message: "Player deleted successfully" });
  } catch (error) {
    console.error("Error deleting player:", error);
    res
      .status(500)
      .json({ error: "Failed to delete player", details: error.message });
  } finally {
    connection.release();
  }
};

const getPlayersByTeam = async (req, res) => {
  const adminId = req.admin?.id;

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  try {
    const connection = await db.getConnection(); // Get a connection from the pool

    try {
      // Fetch the team name for the given admin ID
      const [admins] = await connection.query(
        "SELECT team_name FROM admins WHERE id = ?",
        [adminId]
      );

      if (admins.length === 0) {
        return res.status(404).json({ error: "Admin not found" });
      }

      const teamName = admins[0].team_name;

      // Fetch players for the corresponding team
      const [players] = await connection.query(
        "SELECT * FROM players_core WHERE team_name = ?",
        [teamName]
      );

      // Return an empty array instead of 404 if no players found
      res.status(200).json({
        message:
          players.length > 0
            ? "Players fetched successfully"
            : "No players found for the team",
        players,
      });
    } finally {
      connection.release(); // Release the connection back to the pool
    }
  } catch (error) {
    console.error("Database error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch players", details: error.message });
  }
};

module.exports = {
  createPlayer,
  playerLogin,
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  getPlayersByTeam,
};
