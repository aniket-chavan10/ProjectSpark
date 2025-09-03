const db = require('../dbconfigure'); // Import database configuration
const bcrypt = require('bcryptjs'); // Import bcrypt for hashing passwords

const addAdmin = async (adminName, email, password, phone, teamName, connection) => {
    const checkSql = 'SELECT * FROM admins WHERE team_name = ?';
    const [existingTeam] = await connection.query(checkSql, [teamName]);

    if (existingTeam.length > 0) {
        throw new Error(`Team name "${teamName}" already exists.`);
    }

    const sql = 'INSERT INTO admins (admin_name, email, password, phone, team_name) VALUES (?, ?, ?, ?, ?)';
    try {
        const [result] = await connection.query(sql, [adminName, email, password, phone, teamName]);
        return result; // Return the result to get the insertId
    } catch (err) {
        throw new Error('Error adding admin: ' + err.message);
    }
};




// Function to retrieve an admin by ID
const getAdminById = (adminId, callback) => {
    const sql = 'SELECT * FROM admins WHERE id = ?';
    db.query(sql, [adminId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, result[0]); // Return the single admin record
    });
};

module.exports = {
    addAdmin,
    getAdminById
};
