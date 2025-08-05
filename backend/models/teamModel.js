// models/teamModel.js

const db = require("../dbconfigure");

/**
 * Get a team by its ID from the database
 * @param {object} conn - Database connection or pool connection
 * @param {number} teamId - The ID of the team to fetch
 * @returns {Promise<object|null>} - Returns team object or null if not found
 */
async function getTeamById(conn, teamId) {
  const query = `SELECT id, team_name, logo FROM teams WHERE id = ? LIMIT 1`;
  const [rows] = await conn.execute(query, [teamId]);

  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

module.exports = { getTeamById };
