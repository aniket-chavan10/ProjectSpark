const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../dbconfigure');

// Controller to handle admin login
const loginAdmin = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const sql = 'SELECT * FROM admins WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error accessing the database', details: err });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = results[0];

        // Check if the provided password matches the hashed password
        const isPasswordValid = bcrypt.compareSync(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token valid for 1 hour
        );

        // Set the token as an HTTP-only cookie for security
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            maxAge: 3600000, // 1 hour in milliseconds
        });

        res.status(200).json({
            message: 'Login successful',
            token, // Optionally send the token in the response body for debugging/testing
            admin: { id: admin.id, name: admin.admin_name, email: admin.email },
        });
    });
};

module.exports = { loginAdmin };
