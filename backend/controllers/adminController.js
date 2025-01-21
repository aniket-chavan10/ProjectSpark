const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../dbconfigure");

// Controller: Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = `
    SELECT 
      a.id AS admin_id, 
      a.admin_name, 
      a.email, 
      a.password, 
      a.role, 
      t.id AS team_id
    FROM admins a
    JOIN teams t ON a.team_name = t.team_name
    WHERE a.email = ?
  `;

  try {
    const [results] = await db.query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const admin = results[0];

    const isPasswordValid = bcrypt.compareSync(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: admin.admin_id,
        role: admin.role,
        team_id: admin.team_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: admin.role,
      team_id: admin.team_id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error accessing the database", details: error.message });
  }
};

// Controller: Get All Admins and Teams
const getAllAdminsAndTeams = async (req, res) => {
  const sql = `
    SELECT a.id AS admin_id, a.admin_name, a.email, a.role, 
           t.id AS team_id, t.team_name, t.logo
    FROM admins a
    LEFT JOIN teams t ON a.id = t.admin_id
  `;

  try {
    const [results] = await db.query(sql);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Error fetching data", details: error.message });
  }
};

// Controller: Update Team Logo
const updateTeamLogo = async (req, res) => {
  const { id: adminId } = req.admin;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const logoPath = req.file.path;

  const sql = `
    UPDATE teams
    SET logo = ?
    WHERE admin_id = ?
  `;

  try {
    const [result] = await db.query(sql, [logoPath, adminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No team associated with this admin" });
    }

    res.status(200).json({
      message: "Logo updated successfully",
      logo: logoPath,
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating team logo", details: error.message });
  }
};

// Controller: Get Admin by ID
const getAdminById = async (req, res) => {
  const adminId = req.admin.id;

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

  try {
    const [results] = await db.query(sql, [adminId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    res.status(500).json({ error: "Error fetching data", details: error.message });
  }
};

module.exports = {
  loginAdmin,
  getAllAdminsAndTeams,
  updateTeamLogo,
  getAdminById,
};
