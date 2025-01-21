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
  const file = req.file;

  const requiredFields = ["full_name", "mobile_number", "email"];
  const missingFields = requiredFields.filter((field) => !playerData[field]);

  if (missingFields.length) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;
    if (!adminId) return res.status(400).json({ error: "Invalid token" });

    const [adminResult] = await db
      .promise()
      .query("SELECT team_name FROM admins WHERE id = ?", [adminId]);

    if (!adminResult.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const teamName = adminResult[0].team_name;
    if (!teamName) {
      return res
        .status(400)
        .json({ error: "Admin is not associated with any team" });
    }

    playerData.team_name = teamName;
    const generatedPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    playerData.password = hashedPassword;
    playerData.profile_picture = file?.path || null;
    playerData.is_banned = playerData.is_banned || false;
    playerData.banned_until = playerData.banned_until || null;

    const [result] = await db.promise().query(
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

    res.status(201).json({ message: "Player added and email sent", playerId: result.insertId });
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({ error: "Unexpected error occurred", details: error.message });
  }
};

const playerLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [players] = await getPlayerByEmailCore(email);
    if (!players || players.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    const playerData = players[0];
    const isPasswordMatch = await bcrypt.compare(password, playerData.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const payload = {
      id: playerData.player_id,
      email: playerData.email,
      role: "player",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Unexpected error occurred", details: error.message });
  }
};

const getAllPlayers = async (req, res) => {
  try {
    const [players] = await getAllPlayersCore();
    res.status(200).json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Failed to fetch players", details: error.message });
  }
};

const getPlayerById = async (req, res) => {
  const playerId = req.params.id;

  try {
    const [player] = await getPlayerCoreById(playerId);
    if (!player || player.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.status(200).json(player[0]);
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({ error: "Failed to fetch player", details: error.message });
  }
};

const updatePlayer = async (req, res) => {
  const playerId = req.params.id;
  const updatedData = req.body;

  try {
    const [result] = await updatePlayerCore(playerId, updatedData);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.status(200).json({ message: "Player updated successfully" });
  } catch (error) {
    console.error("Error updating player:", error);
    res.status(500).json({ error: "Failed to update player", details: error.message });
  }
};

const deletePlayer = async (req, res) => {
  const playerId = req.params.id;

  try {
    const [result] = await deletePlayerCore(playerId);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.status(200).json({ message: "Player deleted successfully" });
  } catch (error) {
    console.error("Error deleting player:", error);
    res.status(500).json({ error: "Failed to delete player", details: error.message });
  }
};

const getPlayersByTeam = async (req, res) => {
  const adminId = req.admin?.id;

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  try {
    const [admins] = await db.promise().query("SELECT team_name FROM admins WHERE id = ?", [adminId]);
    if (!admins.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const teamName = admins[0].team_name;
    const [players] = await db.promise().query("SELECT * FROM players_core WHERE team_name = ?", [teamName]);

    if (!players.length) {
      return res.status(404).json({ error: "No players found for the team" });
    }

    res.status(200).json({ message: "Players fetched successfully", players });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Failed to fetch players", details: error.message });
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
