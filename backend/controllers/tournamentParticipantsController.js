const tournamentParticipantsService = require('../services/tournamentParticipantsService');

exports.applyForTournament = async (req, res) => {
  try {
    const teamId = req.user.team_id; // the team of the logged-in admin (set in the login token)
    if (!teamId) {
      return res.status(400).json({ error: "Your login is not linked to a team" });
    }
    const { tournament_id } = req.body;

    if (!tournament_id) {
      return res.status(400).json({ error: 'tournament_id is required' });
    }

    const result = await tournamentParticipantsService.applyForTournament(tournament_id, teamId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};


exports.getDashboardTournaments = async (req, res) => {
  try {
    const teamId = req.user.team_id;
    const tournaments = await tournamentParticipantsService.getOpenTournamentsForAdmin(teamId);
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching tournaments' });
  }
};
