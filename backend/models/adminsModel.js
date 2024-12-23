const db = require('../dbconfigure'); // Import database configuration
const bcrypt = require('bcryptjs'); // Import bcrypt for hashing passwords

// Function to add a new admin
const addAdmin = (adminName, email, password, phone, teamName, callback) => {
    console.log({ adminName, email, password, phone, teamName }); // Log the parameters
    const sql = 'INSERT INTO admins (admin_name, email, password, phone, team_name) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [adminName, email, password, phone, teamName], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, result); // Return the result of the insertion
    });
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
