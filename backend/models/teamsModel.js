const db = require('../dbconfigure'); // Import database configuration

// Function to add a new team
const addTeam = async (teamName, adminId, connection) => {
    const sql = 'INSERT INTO teams (team_name, admin_id) VALUES (?, ?)';
    try {
        const [result] = await connection.query(sql, [teamName, adminId]);
        return result; // Return result to confirm team creation
    } catch (err) {
        throw new Error('Error adding team: ' + err.message);
    }
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
const getAllTeams = (callback) => {
    const sql = 'SELECT * FROM teams';
    db.query(sql, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results); // Return all teams as an array
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
