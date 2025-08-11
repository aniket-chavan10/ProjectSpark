const tournamentParticipantsService = require('../services/tournamentParticipantsService');

exports.applyForTournament = async (req, res) => {
  try {
    const teamId = req.user.id; // OR map from admin to their team
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
    const adminId = req.user.id; 
    const tournaments = await tournamentParticipantsService.getOpenTournamentsForAdmin(adminId);
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching tournaments' });
  }
};
