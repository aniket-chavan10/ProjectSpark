const db = require('../config/database');

// Add a new village to the database
const addVillageToDB = async (village) => {
    const query = `
        INSERT INTO villages (village_name, team_name, admin_name, email, phone, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        village.village_name,
        village.team_name,
        village.admin_name,
        village.email,
        village.phone,
        village.status,
    ]);
    return result;
};

// Retrieve all villages from the database
const getAllVillagesFromDB = async () => {
    const query = `
        SELECT id, village_name, team_name, admin_name, email, phone, status
        FROM villages
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getVillageById = async (id) => {
    const query = 'SELECT * FROM villages WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Assuming `id` is unique
};

const updateVillageStatus = async (id, status) => {
    const query = 'UPDATE villages SET status = ? WHERE id = ?';
    await db.execute(query, [status, id]);
};


const findVillageByEmailOrPhone = async (email, phone) => {
    const query = 'SELECT * FROM villages WHERE email = ? OR phone = ?';
    const values = [email, phone];
    return db.execute(query, values); // Execute with parameters
};


module.exports = {
    addVillageToDB,
    getAllVillagesFromDB,
    findVillageByEmailOrPhone,
    getVillageById,
    updateVillageStatus,
};
