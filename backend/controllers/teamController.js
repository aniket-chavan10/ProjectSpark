const db = require("../dbconfigure"); // Ensure the database configuration is imported

// Controller function to get all teams
const getAllTeams = (req, res) => {
    const sql = 'SELECT * FROM teams';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: "Error fetching teams",
                details: err,
            });
        }

        res.status(200).json(results); // Send all teams as a response
    });
};

module.exports = { getAllTeams };
