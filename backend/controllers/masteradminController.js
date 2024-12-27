const {
  addMasterAdmin,
  authenticateMasterAdmin,
} = require("../models/masteradminsModel");
const { addTeam } = require("../models/teamsModel"); // Ensure this import matches your file structure
const { addAdmin } = require("../models/adminsModel"); // Ensure this import matches your file structure
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../dbconfigure");

const registerMasterAdmin = (req, res) => {
  const { username, password, email_address } = req.body;

  // Ensure all required fields are provided
  if (!username || !password || !email_address) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Create a new admin object and pass it to the model
  const newAdmin = {
    username,
    password, // No hashing done here
    email_address,
  };

  // Call the model function to add the admin to the database
  addMasterAdmin(newAdmin, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to register master admin" });
    }
    res.status(201).json({ message: "Master admin registered successfully" });
  });
};

// Controller to log in a master admin
const loginMasterAdmin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  authenticateMasterAdmin(username, password, (err, admin) => {
    if (err) {
      return res.status(500).json({ error: "An error occurred" });
    }

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, role: "master-admin" });
  });
};


// Controller to get all villages
const getAllVillages = (req, res) => {
  console.log("Fetching villages...");

  const sql = "SELECT * FROM villages";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Error fetching villages" });
    }

    if (results.length === 0) {
      console.log("No villages found.");
      return res.status(404).json({ message: "No villages available." });
    }

    console.log("Fetched villages:", results);
    res.status(200).json(results); // Send the result as response
  });
};

const updateVillageStatus = (req, res) => {
  const { status } = req.body;
  const villageId = req.params.id;

  if (!villageId || !status) {
    return res.status(400).json({ error: "Village ID and status are required" });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
  }

  const sqlGetVillage = "SELECT * FROM villages WHERE id = ?";
  db.query(sqlGetVillage, [villageId], (err, villageResult) => {
    if (err) return res.status(500).json({ error: "Error fetching village data" });
    if (villageResult.length === 0) return res.status(404).json({ error: "Village not found" });

    const village = villageResult[0];
    const villageName = village.village_name || "default";
    const teamName = village.team_name || `team_${villageName.toLowerCase()}`;
    const adminName = village.admin_name || `admin_${villageName.toLowerCase()}`;
    const email = village.email || `admin_${villageName.toLowerCase()}@example.com`;
    const phone = village.phone || "0000000000";

    if (status === "approved") {
      db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: "Error starting transaction" });

        const generatedPassword = `admin_${villageName.toLowerCase()}`;
        const hashedPassword = bcrypt.hashSync(generatedPassword, 10);

        addAdmin(adminName, email, hashedPassword, phone, teamName, (err, adminResult) => {
          if (err) return handleError(res, db, "Failed to create admin", err);

          const adminId = adminResult.insertId;
          addTeam(teamName, adminId, (err, teamResult) => {
            if (err) return handleError(res, db, "Failed to create team", err);

            const sqlUpdateVillage = "UPDATE villages SET status = ? WHERE id = ?";
            db.query(sqlUpdateVillage, [status, villageId], (err) => {
              if (err) return handleError(res, db, "Failed to update village status", err);

              db.commit((err) => {
                if (err) return handleError(res, db, "Error committing transaction", err, false);

                res.status(200).json({
                  message: "Village approved successfully, admin and team created",
                  teamId: teamResult.insertId,
                  adminId,
                });
              });
            });
          });
        });
      });
    } else {
      const sqlUpdateVillage = "UPDATE villages SET status = ? WHERE id = ?";
      db.query(sqlUpdateVillage, [status, villageId], (err) => {
        if (err) return res.status(500).json({ error: "Failed to update village status", details: err });

        res.status(200).json({ message: "Village rejected successfully" });
      });
    }
  });
};

module.exports = {
  registerMasterAdmin,
  loginMasterAdmin,
  updateVillageStatus,
  getAllVillages,
};
