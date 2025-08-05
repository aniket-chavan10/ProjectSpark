// models/villageModel.js
const db = require("../dbconfigure"); // Assuming this is your DB configuration

// Function to add a new village to the database
const addVillage = async (villageData) => {
    const { village_name, team_name, admin_name, email_address, phone_number, status } = villageData;

    try {
        const [result] = await db.query(
            `INSERT INTO villages (village_name, team_name, admin_name, email_address, phone_number, status) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [village_name, team_name, admin_name, email_address, phone_number, status]
        );
        return result;
    } catch (err) {
        throw new Error(`Error adding village: ${err.message}`);
    }
};

module.exports = {
    addVillage,
};
