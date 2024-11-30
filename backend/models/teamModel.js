const db = require('../config/database');

// Function to create a new team
const createTeam = async (team) => {
    const query = `
        INSERT INTO teams (village_id, admin_id, team_name, logo_image, banner_image)
        VALUES (?, ?, ?, ?, ?)
    `;
    await db.execute(query, [
        team.village_id,
        team.admin_id,
        team.team_name,
        team.logo_image,
        team.banner_image,
    ]);
};

module.exports = { createTeam };
