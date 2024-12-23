const db = require('../dbconfigure'); // Import database configuration

// Function to add a new team
const addTeam = (teamName, adminId, callback) => {
    const sql = 'INSERT INTO teams (team_name, admin_id) VALUES (?, ?)';
    db.query(sql, [teamName, adminId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, result); // Return the result of the insertion
    });
};

// Function to retrieve a team by ID
const getTeamById = (teamId, callback) => {
    const sql = 'SELECT * FROM teams WHERE id = ?';
    db.query(sql, [teamId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, result[0]); // Return the single team record
    });
};

const getTeamByAdminId = (adminId, callback) => {
    const sql = 'SELECT * FROM teams WHERE admin_id = ?';
    db.query(sql, [adminId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        if (result.length > 0) {
            // Assuming team_id is the primary key of teams table
            callback(null, result[0]); // Return the first team record associated with the admin
        } else {
            callback(null, null); // No team found
        }
    });
};

module.exports = {
    addTeam,
    getTeamById,
    getTeamByAdminId
};
