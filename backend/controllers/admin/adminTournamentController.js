exports.applyForTournament = async (req, res) => {
  try {


    const { tournament_id, team_id } = req.body;

    if (!tournament_id || !team_id) {
      return res.status(400).json({ error: 'Tournament ID and Team ID are required' });
    }

    // Call service to apply
    const application = await tournamentParticipantsService.applyToTournament({ tournament_id, team_id });

    res.status(201).json({
      message: 'Applied to tournament successfully, payment pending',
      application,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOpenTournaments = async (req, res) => {
  try {
    // In your system admin_id = team_id
    const team_id = req.user.id;  // from JWT middleware
    if (!team_id) {
      return res.status(401).json({ error: "Team ID not found in token" });
    }

    const tournaments = await tournamentParticipantsService.getOpenTournaments(team_id);
    res.status(200).json(tournaments);
  } catch (error) {
    console.error("Error fetching open tournaments:", error);
    res.status(500).json({ error: "Failed to fetch open tournaments" });
  }
};
