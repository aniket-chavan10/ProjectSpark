const tournamentService = require("../../services/master/masterTournamentService");

exports.createTentativeTournament = async (req, res) => {
  try {
    const { organizer_admin_id, start_date, end_date } = req.body;
    const role = req.user.role; // Assuming you store role in JWT
    const result = await tournamentService.createTentativeTournament(
      organizer_admin_id, start_date, end_date, role
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};



exports.getAllTournaments = async (req, res) => {
  try {
    const role = req.user.role;
    const adminId = req.user.id;
    const tournaments = await tournamentService.getAllTournaments(role, adminId);
    res.status(200).json({ success: true, data: tournaments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};