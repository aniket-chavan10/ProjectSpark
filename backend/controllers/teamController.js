const db = require("../dbconfigure");

const getAllTeams = async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Execute the query to fetch all teams
    const [teams] = await connection.query("SELECT * FROM teams");

    // Send all teams as a response
    res.status(200).json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch teams", details: error.message });
  } finally {
    // Release the connection to the pool
    connection.release();
  }
};

module.exports = { getAllTeams };
