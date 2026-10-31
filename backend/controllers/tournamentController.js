const tournamentService = require('../services/tournamentService');
const scheduleService = require('../services/tournamentScheduleService');

exports.createTournamentFromSchedule = async (req, res) => {
  try {
    const organizerAdminId = req.user.id;
    const { tentative_id, name, venue } = req.body;
    const banner_image = req.file ? `uploads/${req.file.filename}` : null;

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



exports.assignTournamentGroups = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    const organizerAdminId = req.user.id; // from authentication middleware
    const { assignments } = req.body; // e.g., [{ team_id: 1, group_name: 'A' }, {...}]

    if (!assignments) {
      return res.status(400).json({ error: 'Assignments are required' });
    }

    const result = await tournamentService.assignGroups(
      tournamentId,
      organizerAdminId,
      assignments
    );

    res.status(200).json({ message: 'Groups assigned successfully', result });
  } catch (error) {
    console.error('Error assigning groups:', error);
    res.status(400).json({ error: error.message });
  }
};




exports.getScheduledMatches = async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId, 10);
    if (!tournamentId) {
      return res.status(400).json({ error: "tournamentId parameter is required" });
    }

    const matches = await tournamentService.getScheduledMatchesByTournament(tournamentId);
    res.json({ matches });
  } catch (error) {
    console.error("Error fetching scheduled matches:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// controllers/tournamentController.js

exports.getGroupsWithTeams = async (req, res) => {
  try {
    const organizerAdminId = req.user.id; // assuming JWT middleware sets req.user
    const { tournament_id } = req.params;

    if (!tournament_id) {
      return res.status(400).json({ error: "tournament_id is required" });
    }

    const groups = await tournamentService.getGroupsWithTeamsForOrganizer(
      organizerAdminId,
      tournament_id
    );

    res.json(groups);
  } catch (err) {
    console.error("Error in getGroupsWithTeams:", err);
    res.status(400).json({ error: err.message });
  }
};



exports.updateTournamentProgress = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await scheduleService.assertOrganizer(tournamentId, req.user.id);
    const updates = req.body;
    if (!tournamentId) return res.status(400).json({ error: "tournament_id missing" });

    const result = await tournamentService.createOrUpdateTournamentProgress(tournamentId, updates);
    res.json({ success: true, progress: result });
  } catch (err) {
    console.error("progress update error", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.getTournamentProgress = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await scheduleService.assertOrganizer(tournamentId, req.user.id);
    if (!tournamentId) return res.status(400).json({ error: "tournament_id missing" });

    const result = await tournamentService.getTournamentProgress(tournamentId);
    res.json({ progress: result });
  } catch (err) {
    console.error("progress fetch error", err);
    res.status(err.status || 500).json({ error: err.message });
  }
};
