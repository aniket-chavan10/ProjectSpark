const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../dbconfigure");
const { addMasterAdmin } = require("../models/masteradminsModel");
const { addTeam } = require("../models/teamsModel");
const { addAdmin } = require("../models/adminsModel");

// Controller: Register Master Admin
const registerMasterAdmin = async (req, res) => {
  const { username, password, email_address } = req.body;

  if (!username || !password || !email_address) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const newAdmin = { username, password, email_address };

  try {
    await addMasterAdmin(newAdmin);
    res.status(201).json({ message: "Master admin registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to register master admin",
        details: error.message,
      });
  }
};

// Controller: Login Master Admin
const loginMasterAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, username, password FROM master_admins WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, role: "master-admin" });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "An error occurred during login",
        details: error.message,
      });
  }
};

// Controller: Get All Villages
const getAllVillages = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM villages");

    if (results.length === 0) {
      return res.status(404).json({ message: "No villages available." });
    }

    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching villages", details: error.message });
  }
};

const updateVillageStatus = async (req, res) => {
  const { status } = req.body;
  const villageId = req.params.id;

  if (!villageId || !status) {
    return res.status(400).json({ error: "Village ID and status are required" });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
  }

  try {
    const [villageResult] = await db.query("SELECT * FROM villages WHERE id = ?", [villageId]);

    if (villageResult.length === 0) {
      return res.status(404).json({ error: "Village not found" });
    }

    const village = villageResult[0];
    const villageName = village.village_name || "default";
    const teamName = village.team_name || `team_${villageName.toLowerCase()}`;
    const adminName = village.admin_name || `admin_${villageName.toLowerCase()}`;
    const email = village.email_address;  // Ensure this is not null
    const phone = village.phone || "0000000000";

    if (!email) {
      return res.status(400).json({ error: "Email is missing for this village" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (status === "approved") {
        const generatedPassword = `admin_${villageName.toLowerCase()}`;
        const hashedPassword = bcrypt.hashSync(generatedPassword, 10);

        // Insert admin first
        const adminResult = await addAdmin(adminName, email, hashedPassword, phone, teamName, connection);
        const adminId = adminResult.insertId;

        // Now insert the team with the adminId
        await addTeam(teamName, adminId, connection);

        // Update village status
        await connection.query("UPDATE villages SET status = ? WHERE id = ?", [status, villageId]);
        await connection.commit();
        res.status(200).json({
          message: "Village approved successfully, admin and team created",
          adminId,
        });
      } else {
        await connection.query("UPDATE villages SET status = ? WHERE id = ?", [status, villageId]);
        await connection.commit();
        res.status(200).json({ message: "Village rejected successfully" });
      }
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ error: "Failed to update village status", details: error.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: "Error updating village status", details: error.message });
  }
};



module.exports = {
  registerMasterAdmin,
  loginMasterAdmin,
  getAllVillages,
  updateVillageStatus,
};
