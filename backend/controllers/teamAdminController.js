const playerService = require("../services/playerService");
const squadService = require("../services/squadService");
const { sendScoringError } = require("../utils/errors");

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
