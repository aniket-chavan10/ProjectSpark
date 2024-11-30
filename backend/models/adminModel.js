const db = require('../config/database');

/**
 * Create a new admin in the database.
 * @param {Object} admin - The admin data.
 * @param {Object} connection - The database connection (used in transactions).
 * @returns {number} The ID of the newly created admin.
 */

const createAdmin = async (admin, connection) => {
    const query = `
        INSERT INTO admins (admin_name, email, phone, team_name, password)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(query, [
        admin.admin_name,
        admin.email,
        admin.phone,
        admin.team_name,
        admin.password, // Insert hashed password
    ]);
    return result.insertId; // Return the new admin ID
};

/**
 * Retrieve an admin by email.
 * @param {string} email - The email of the admin.
 * @returns {Object} The admin details if found.
 */
const getAdminByEmail = async (email) => {
    const query = `
        SELECT * FROM admins WHERE email = ?
    `;
    const [rows] = await db.execute(query, [email]);
    return rows[0];
};

/**
 * Update an admin's details by ID.
 * @param {number} id - The admin ID.
 * @param {Object} admin - The admin data to update.
 */
const updateAdminById = async (id, admin) => {
    const query = `
        UPDATE admins SET admin_name = ?, email = ?, phone = ?, team_name = ?, updated_at = NOW()
        WHERE id = ?
    `;
    await db.execute(query, [
        admin.admin_name,
        admin.email,
        admin.phone,
        admin.team_name,
        id,
    ]);
};

/**
 * Delete an admin by ID.
 * @param {number} id - The admin ID.
 */
const deleteAdminById = async (id) => {
    const query = `
        DELETE FROM admins WHERE id = ?
    `;
    await db.execute(query, [id]);
};

module.exports = {
    createAdmin,
    getAdminByEmail,
    updateAdminById,
    deleteAdminById,
};
