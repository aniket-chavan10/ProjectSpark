const replacement = require("../services/replacementService");
const { handle, intParam } = require("../utils/handle");

// The host of a tournament swaps a team that backs out for another one. All routes: host only (admin token).
const tid = (req) => intParam(req, "tournamentId");

// GET  /tournaments/:tournamentId/replacements                       what has been swapped so far
exports.history = handle("Could not load the replacements", 200, (req) => replacement.history(tid(req), req.user.id).then((items) => ({ items })));

// GET  /tournaments/:tournamentId/replacement-candidates?q=          teams that can be brought in
exports.candidates = handle("Could not load the teams", 200, (req) => replacement.candidates(tid(req), req.user.id, req.query.q).then((items) => ({ items })));

// GET  /tournaments/:tournamentId/teams/:teamId/replacement-preview  what the swap would change
exports.preview = handle("Could not check the team", 200, (req) => replacement.preview(tid(req), req.user.id, intParam(req, "teamId")));

// POST /tournaments/:tournamentId/replace-team   { outTeamId, inTeamId, reason }
exports.replace = handle("Could not replace the team", 200, async (req) => ({ message: "Team replaced", ...(await replacement.replace(tid(req), req.user.id, req.body || {})) }));
