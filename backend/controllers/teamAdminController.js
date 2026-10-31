const playerService = require("../services/playerService");
const squadService = require("../services/squadService");
const { sendScoringError } = require("../utils/errors");
const notificationService = require("../services/notificationService");
const announcementService = require("../services/announcementService");
const publicService = require("../services/publicService");
const banService = require("../services/banService");
const db = require("../dbconfigure");
const teamDashboard = require("../services/teamDashboardService");

// run a service call for the logged-in team and answer with its result
const handle = (fallback, status, fn) => async (req, res) => {
  try {
    res.status(status).json(await fn(req));
  } catch (err) {
    if (!err.status) console.error(fallback, err);
    sendScoringError(res, err, fallback);
  }
};

const photoOf = (req) => (req.file ? `uploads/${req.file.filename}` : null);
const id = (req, key) => parseInt(req.params[key], 10);

/* ------------------------------- players ------------------------------- */
exports.listPlayers = handle("Could not load your players", 200, (req) => playerService.listPlayers(req.team.teamId));
exports.createPlayer = handle("Could not add the player", 201, (req) => playerService.createPlayer(req.team.teamId, req.body, photoOf(req)));
exports.updatePlayer = handle("Could not update the player", 200, (req) => playerService.updatePlayer(req.team.teamId, id(req, "playerId"), req.body, photoOf(req)));
exports.removePlayer = handle("Could not remove the player", 200, (req) => playerService.removePlayer(req.team.teamId, id(req, "playerId")));

/* -------------------------------- squads -------------------------------- */
exports.myTournaments = handle("Could not load your tournaments", 200, (req) => squadService.listMyTournaments(req.team.teamId));
exports.myMatches = handle("Could not load your matches", 200, (req) => squadService.listMyMatches(id(req, "tournamentId"), req.team.teamId));

exports.getTournamentSquad = handle("Could not load the squad", 200, (req) => squadService.getTournamentSquad(id(req, "tournamentId"), req.team.teamId));
exports.saveTournamentSquad = handle("Could not save the squad", 200, (req) => squadService.saveTournamentSquad(id(req, "tournamentId"), req.team.teamId, req.body));

exports.getMatchSquad = handle("Could not load the squad", 200, (req) => squadService.getMatchSquad(id(req, "fixtureId"), req.team.teamId));
exports.saveMatchSquad = handle("Could not save the squad", 200, (req) => squadService.saveMatchSquad(id(req, "fixtureId"), req.team.teamId, req.body));
exports.resetMatchSquad = handle("Could not reset the squad", 200, (req) => squadService.resetMatchSquad(id(req, "fixtureId"), req.team.teamId));

/* ---------------------------- notifications & news ---------------------------- */

exports.listNotifications = handle("Could not load your notifications", 200, (req) =>
  notificationService.listForTeam(req.team.teamId, { limit: req.query.limit, unreadOnly: req.query.unread === "1" })
);
exports.markNotificationsRead = handle("Could not update your notifications", 200, (req) => notificationService.markRead(req.team.teamId, req.body && req.body.ids));
exports.listAnnouncements = handle("Could not load the announcements", 200, () => announcementService.listActive(20));

// the team's own standing: rank, points, honours, upcoming matches, and whether it is banned
exports.overview = handle("Could not load your overview", 200, async (req) => {
  const profile = await publicService.teamProfile(req.team.teamId);
  const ban = await banService.activeTeamBan(db, req.team.teamId);
  // dates the association reserved for this team to host
  const [hosting] = await db.query(
    `SELECT id, start_date, end_date, status, tournament_id FROM tentative_tournament_schedules
     WHERE organizer_admin_id = ? AND status <> 'cancelled' AND end_date >= CURDATE() ORDER BY start_date`,
    [req.team.adminId]
  );
  return {
    ...profile,
    hosting: hosting.map((h) => ({ id: h.id, startDate: String(h.start_date).slice(0, 10), endDate: String(h.end_date).slice(0, 10), tournamentId: h.tournament_id || null })),
    ban: ban ? { reason: ban.reason, endsOn: ban.ends_on ? String(ban.ends_on).slice(0, 10) : null } : null,
  };
});

// the ranking table with the team's own row, where its points came from, its players' ratings, its hosting dates
exports.rankings = handle("Could not load the rankings", 200, (req) => teamDashboard.rankings(req.team.teamId, req.team.adminId, { season: req.query.season }));
