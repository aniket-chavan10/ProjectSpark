const db = require('../dbconfigure'); // Import the database connection

// Define a function to insert a new village
const addVillage = (villageData, callback) => {
    const sql = `
        INSERT INTO villages (village_name, team_name, admin_name, email_address, phone_number, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const { village_name, team_name, admin_name, email_address, phone_number, status } = villageData;
    db.query(
        sql,
        [village_name, team_name, admin_name, email_address, phone_number, status],
        (err, result) => {
            callback(err, result);
        }
    );
};

module.exports = {
    addVillage,
};
