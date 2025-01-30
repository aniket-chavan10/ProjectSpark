// models/villageModel.js

const mysql = require('mysql2'); // Or whatever database you're using

const pool = mysql.createPool({ /* your db config */ });

const addVillage = (villageData) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO villages (village_name, team_name, admin_name, email_address, phone_number, status) VALUES (?, ?, ?, ?, ?, ?)';
        pool.execute(query, [villageData.village_name, villageData.team_name, villageData.admin_name, villageData.email_address, villageData.phone_number, villageData.status], (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

module.exports = {
    addVillage
};
