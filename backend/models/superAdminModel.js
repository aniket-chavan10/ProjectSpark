const db = require('../config/database');  // Your MySQL connection

// Get superadmin by email and password
const getSuperadminByEmail = async (email) => {
    const query = `SELECT * FROM users WHERE email = ? AND role = 'superadmin'`;
    const [rows] = await db.execute(query, [email]);
    return rows[0];  // Return the first matching row
};

// Insert a new user (for superadmin creation)
const insertSuperadmin = async (email, password, role) => {
    const query = `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`;
    const [result] = await db.execute(query, [email, password, role]);
    return result;
};

module.exports = {
    getSuperadminByEmail,
    insertSuperadmin
};
