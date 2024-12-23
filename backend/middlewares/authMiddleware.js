const jwt = require('jsonwebtoken');
const { getTeamByAdminId } = require('../models/teamsModel'); // Ensure correct path to teamsModel

const verifyAdminToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token after 'Bearer'

    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Failed to authenticate token' });
        }

        // Fetch the team using the admin_id from the decoded token
        getTeamByAdminId(decoded.id, (err, team) => {
            if (err || !team) {
                return res.status(500).json({ error: 'Team not found for admin' });
            }

            // Attach the team_id to the request object
            req.team_id = team.id; // Assuming 'id' is the team_id field in teams table
            next();
        });
    });
};

module.exports = verifyAdminToken;
