const {
  addPlayerCore,
  getAllPlayersCore,
  getPlayerCoreById,
  updatePlayerCore,
  deletePlayerCore,
  getPlayerByEmailCore
} = require("../models/playersModel");

const crypto = require("crypto"); // For generating a secure random password
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const bcrypt = require("bcrypt"); // For sending emails

const createPlayer = async (req, res) => {
    const playerData = req.body;
  
    // Log player data for debugging
    console.log("Player Data:", playerData);
  
    // Validate required fields
    const requiredFields = ["full_name", "mobile_number", "email"];
    const missingFields = requiredFields.filter((field) => !playerData[field]);
  
    if (missingFields.length) {
      return res
        .status(400)
        .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }
  
    // Generate a secure random password
    const generatedPassword = crypto.randomBytes(8).toString("hex"); // 16-character password
    console.log("Generated Password:", generatedPassword); // Debug log for generated password
  
    try {
      // Hash the generated password before storing it
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      playerData.password = hashedPassword;
  
      // Default values for optional fields
      playerData.is_banned = playerData.is_banned || false;
      playerData.banned_until = playerData.banned_until || null;
  
      // Add player to the database
      addPlayerCore(playerData, async (err, result) => {
        if (err) {
          console.error("Error adding player:", err);
          return res
            .status(500)
            .json({ error: "Failed to add player", details: err });
        }
  
        const playerId = result.insertId;
  
        // Send an email to the player
        try {
          const transporter = nodemailer.createTransport({
            service: "Gmail", // Use your email service provider
            auth: {
              user: process.env.EMAIL_USER, // Your email address
              pass: process.env.EMAIL_PASS, // Your email password or app-specific password
            },
          });
  
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: playerData.email,
            subject: "Welcome to the Jaoli Cricket Association",
            text: `Hi ${playerData.full_name},\n\nYou have been successfully added to the Cricket Association system.\nHere are your login credentials:\n\nEmail: ${playerData.email}\nPassword: ${generatedPassword}\n\nPlease log in and change your password at your earliest convenience.\n\nBest regards,\nJaoli Cricket Association Team`,
          };
  
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${playerData.email}`);
        } catch (mailError) {
          console.error("Error sending email:", mailError);
          return res.status(500).json({
            error: "Player added successfully but failed to send email",
            playerId,
          });
        }
  
        res.status(201).json({
          message: "Player added successfully and email sent",
          playerId,
        });
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected error occurred", details: error });
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

      // Generate JWT token
      const token = jwt.sign(
        { playerId: playerData.id, email: playerData.email },
        process.env.JWT_SECRET, // Use a secure secret stored in environment variables
        { expiresIn: "1h" } // Token expiration time
      );

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

module.exports = {
    createPlayer,
    playerLogin,
    getAllPlayers,
    getPlayerById,
    updatePlayer,
    deletePlayer,
    playerLogin
};
