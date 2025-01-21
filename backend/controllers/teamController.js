const db = require("../dbconfigure"); // Ensure the database configuration is imported

// Controller function to get all teams using async/await
const getAllTeams = async (req, res) => {
    try {
        // Execute the query to fetch all teams
        const [results] = await db.promise().query('SELECT * FROM teams');

        // Send all teams as a response
        res.status(200).json(results);
    } catch (err) {
        // Handle any errors that occur during the query
        res.status(500).json({
            error: "Error fetching teams",
            details: err,
        });
    }
};

module.exports = { getAllTeams };
