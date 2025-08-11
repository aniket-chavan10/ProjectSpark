const tournamentModel = require("../../models/tournamentModel");

exports.createTentativeTournament = async (organizerAdminId, startDate, endDate, role) => {
  if(role !== 'master_admin') {
    throw new Error("Only Master Admin can create tentative tournaments.");
  }
  const id = await tournamentModel.createTentativeTournament(
    organizerAdminId, startDate, endDate
  );
  return { id, organizer_admin_id: organizerAdminId, start_date: startDate, end_date: endDate, setup_status: "tentative" };
};

exports.getAllTournaments = async (role, adminId = null) => {
  return await tournamentModel.getAllTournamentsWithStatus(role, adminId);
};