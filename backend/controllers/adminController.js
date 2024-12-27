const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../dbconfigure');



const loginAdmin = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const sql = `
        SELECT id AS admin_id, admin_name, email, password, role
        FROM admins
        WHERE email = ?
    `;

    db.query(sql, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error accessing the database', details: err });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = results[0];

        // Check if password matches
        const isPasswordValid = bcrypt.compareSync(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT Token (no sensitive data included)
        const token = jwt.sign(
            {
                id: admin.admin_id, // Include only the admin ID and role
                role: admin.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }  // Token valid for 1 hour
        );

        // Set the token as an HTTP-only cookie (optional for security)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour in milliseconds
        });

        // Return token and role in the response
        res.status(200).json({
            message: 'Login successful',
            token,    // Send the token
            role: admin.role,  // Send the role
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
            return res.status(500).json({ error: 'Error fetching data', details: err });
        }

        res.status(200).json(results);
    });
};

const updateTeamLogo = (req, res) => {
    const { id: adminId } = req.admin; // Extract admin ID from the token payload

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoPath = req.file.path; // File path saved by Multer

    const sql = `
        UPDATE teams
        SET logo = ?
        WHERE admin_id = ?
    `;

    db.query(sql, [logoPath, adminId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error updating team logo', details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No team associated with this admin' });
        }

        res.status(200).json({
            message: 'Logo updated successfully',
            logo: logoPath,
        });
    });
};



module.exports = { loginAdmin, getAllAdminsAndTeams,updateTeamLogo };
