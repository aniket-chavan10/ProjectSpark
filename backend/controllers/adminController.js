const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../dbconfigure");

const loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Modified SQL query to join admins with teams based on team_name and fetch team_id
  const sql = `
        SELECT 
            a.id AS admin_id, 
            a.admin_name, 
            a.email, 
            a.password, 
            a.role, 
            t.id AS team_id  -- Get team_id from the teams table
        FROM admins a
        JOIN teams t ON a.team_name = t.team_name  -- Join with teams based on team_name
        WHERE a.email = ?
    `;

  db.query(sql, [email], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error accessing the database", details: err });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const admin = results[0];

    // Check if password matches
    const isPasswordValid = bcrypt.compareSync(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT Token (including team_id)
    const token = jwt.sign(
      {
        id: admin.admin_id, // Admin ID
        role: admin.role, // Admin Role
        team_id: admin.team_id, // Team ID
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token valid for 1 hour
    );

    // Set the token as an HTTP-only cookie (optional for security)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "strict",
      maxAge: 3600000, // 1 hour in milliseconds
    });

    // Return token, role, and team_id in the response
    res.status(200).json({
      message: "Login successful",
      token, // Send the token
      role: admin.role, // Send the role
      team_id: admin.team_id, // Send the team_id
    });
  });
};

const getAllAdminsAndTeams = (req, res) => {
  const sql = `
        SELECT a.id AS admin_id, a.admin_name, a.email, a.role, 
               t.id AS team_id, t.team_name,t.logo
        FROM admins a
        LEFT JOIN teams t ON a.id = t.admin_id
    `;

  db.query(sql, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching data", details: err });
    }

    res.status(200).json(results);
  });
};

const updateTeamLogo = (req, res) => {
  const { id: adminId } = req.admin; // Extract admin ID from the token payload

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const logoPath = req.file.path; // File path saved by Multer

  const sql = `
        UPDATE teams
        SET logo = ?
        WHERE admin_id = ?
    `;

  db.query(sql, [logoPath, adminId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error updating team logo", details: err });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No team associated with this admin" });
    }

    res.status(200).json({
      message: "Logo updated successfully",
      logo: logoPath,
    });
  });
};

module.exports = { loginAdmin, getAllAdminsAndTeams, updateTeamLogo };
