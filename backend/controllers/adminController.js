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

const getAdminById = (req, res) => {
  const adminId = req.admin.id; // Extract the adminId from the token payload

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is missing" });
  }

  const sql = `
    SELECT a.id AS admin_id, a.admin_name, a.email, a.role, 
           t.id AS team_id, t.team_name, t.logo
    FROM admins a
    LEFT JOIN teams t ON a.id = t.admin_id
    WHERE a.id = ?
  `;

  db.query(sql, [adminId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching data", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json(results[0]); // Send the admin profile data
  });
};

const tournamentOrganizer = (req, res) => {
  const adminId = req.admin.id; // Admin ID extracted from the token

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  console.log("Admin ID from token:", adminId); // Log admin ID from token for debugging

  const { name } = req.body; // Name provided in request body
  const bannerImage = req.file ? req.file.path : null; // Banner image file uploaded (optional)

  console.log("Name to update:", name); // Log name to update for debugging
  console.log("Banner image to update:", bannerImage); // Log banner image for debugging

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

    // Log the result of fetching tournaments
    console.log("Admin's tournaments:", results);

    if (results.length === 0) {
      return res.status(404).json({
        error: "No tournaments found for this admin",
      });
    }

    // Assume we are working with the first tournament for simplicity
    const tournament = results[0];
    const tournamentId = tournament.id;

    // Check if the admin is the organizer of this tournament
    if (tournament.organizer_admin_id !== adminId) {
      return res.status(403).json({
        error: "You do not have permission to update this tournament",
      });
    }

    // Construct SQL and parameters for the update
    let sql = "UPDATE tournaments SET ";
    const params = [];

    if (name) {
      sql += "name = ?";
      params.push(name);
    }

    if (bannerImage) {
      if (params.length > 0) sql += ", "; // Add comma if name is already in the query
      sql += "banner_image = ?";
      params.push(bannerImage);
    }

    sql += " WHERE id = ?";
    params.push(tournamentId);

    // Log the SQL and parameters before executing the update
    console.log("SQL to update tournament:", sql);
    console.log("Parameters for update:", params);

    // Execute the update query
    db.query(sql, params, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error updating tournament details", details: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      res.status(200).json({
        message: "Tournament details updated successfully",
        updatedFields: { name, banner_image: bannerImage },
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
  loginAdmin,
  getAllAdminsAndTeams,
  updateTeamLogo,
  tournamentOrganizer,
  getAssignedTournaments,
  getAdminById,
  getPlayersByTeam,
};
