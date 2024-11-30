const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Admin login controller using username (email)
 */
const loginAdmin = async (req, res) => {
    const { username, password } = req.body; // Expecting "username" instead of "email"

    try {
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Please provide username and password.' });
        }

        // Fetch admin details from the database using the email provided in the username field
        const query = 'SELECT * FROM admins WHERE email = ?';
        const [rows] = await db.execute(query, [username]); // Use "username" to query the email field
        const admin = rows[0];

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            process.env.JWT_SECRET, // Ensure a strong secret in your environment file
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            admin: { id: admin.id, email: admin.email, admin_name: admin.admin_name },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

module.exports = { loginAdmin };
