const tournamentService = require('../services/tournamentService');

exports.createTournamentFromSchedule = async (req, res) => {
  try {
    const organizerAdminId = req.user.id;
    const { tentative_id, name, venue } = req.body;
    const banner_image = req.file ? req.file.path : null;

    if (!tentative_id || !name || !venue ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await tournamentService.createTournamentFromSchedule(
      organizerAdminId,
      { tentative_id, name, venue, banner_image }
    );

    res.status(201).json({ message: 'Tournament created', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Server error while creating tournament' });
  }
};

// controllers/tournamentController.js
exports.getTournamentsByOrganizer = async (req, res) => {
  try {
    const organizerAdminId = req.user.id;
    const tournaments = await tournamentService.getTournamentsByOrganizer(organizerAdminId);
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching tournaments for organizer" });
  }
};


exports.getTournamentById = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const organizer_admin_id = req.user.id;
    const userRole = req.user.role;

    const tournament = await tournamentService.getTournamentById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Only allow organizer or masterAdmin to get details
    if (tournament.organizer_admin_id !== organizer_admin_id && userRole !== 'masterAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Server error while fetching tournament' });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const updateData = req.body;
    const organizer_admin_id = req.user.id;
    const userRole = req.user.role;

    const tournament = await tournamentService.getTournamentById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.organizer_admin_id !== organizer_admin_id && userRole !== 'masterAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedTournament = await tournamentService.updateTournament(tournamentId, updateData);
    res.json(updatedTournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Server error while updating tournament' });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const organizer_admin_id = req.user.id;
    const userRole = req.user.role;

    const tournament = await tournamentService.getTournamentById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.organizer_admin_id !== organizer_admin_id && userRole !== 'masterAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await tournamentService.deleteTournament(tournamentId);
    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Server error while deleting tournament' });
  }
};


exports.getOpenTournaments = async (req, res) => {
  try {
    const openTournaments = await tournamentService.getOpenTournaments();
    res.json(openTournaments);
  } catch (error) {
    console.error('Error fetching open tournaments:', error);
    res.status(500).json({ error: 'Server error while fetching open tournaments' });
  }
};


exports.getAppliedTeams = async (req, res) => {
  try {
    const organizerAdminId = req.user.id;
    const { tournament_id } = req.params;

    if (!tournament_id) {
      return res.status(400).json({ error: "tournament_id is required" });
    }

    const teams = await tournamentService.getAppliedTeamsForOrganizer(
      organizerAdminId,
      tournament_id
    );

    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};




exports.autoGroupTournamentParticipants = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const organizer_admin_id = req.user.id; // from auth middleware

    const assignments = await tournamentService.autoAssignGroups(tournamentId, organizer_admin_id);

    res.json({
      message: 'Groups assigned successfully',
      assignments
    });
  } catch (error) {
    console.error('Error assigning groups:', error);
    res.status(400).json({ error: error.message });
  }
};


exports.manualGroupTournamentParticipants = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const organizer_admin_id = req.user.id; // from authentication middleware
    
    const groupAssignments = req.body.assignments; 
 

    if (!Array.isArray(groupAssignments)) {
      return res.status(400).json({ error: 'Assignments must be an array.' });
    }

    const updatedAssignments = await tournamentService.manualAssignGroups(
      tournamentId,
      organizer_admin_id,
      groupAssignments
    );

    res.json({
      message: 'Groups assigned manually successfully',
      assignments: updatedAssignments,
    });
  } catch (error) {
    console.error('Error assigning groups manually:', error);
    res.status(400).json({ error: error.message });
  }
};


exports.scheduleKnockoutMatches = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId, 10);
    const { matches } = req.body;

    if (!tournamentId || !matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: "Tournament ID and matches array are required" });
    }

    const result = await tournamentService.scheduleKnockoutMatches(tournamentId, matches);

    res.status(201).json({
      message: "Knockout matches scheduled successfully",
      matches: result,
    });
  } catch (error) {
    console.error("Error scheduling knockout matches:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
