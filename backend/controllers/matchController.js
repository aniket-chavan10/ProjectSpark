const matchService = require("../services/matchService");
const { sendScoringError } = require("../utils/errors");
const tieBreak = require("../services/tieBreakService");
const liveScoreService = require("../services/liveScoreService");
const dbPool = require("../dbconfigure");
const { handle, intParam } = require("../utils/handle");

exports.setToss = async (req, res) => {
  const { matchId } = req.params;
  const { tossWinnerId, tossDecision } = req.body;

  try {
    const result = await matchService.setToss(matchId, tossWinnerId, tossDecision);

    // Tell clients in both rooms: the fixture room (tournament_matches.id) and the live match room (matches.match_id)
    const io = req.app.get("socketio");
    if (io) {
      const payload = {
        message: "Toss result updated successfully",
        matchId: result.matchId,
        fixtureId: Number(matchId),
        tossWinnerId,
        tossDecision,
        ...result,
      };
      io.to(`match_${matchId}`).emit("toss_updated", payload);
      io.to(`match_${result.matchId}`).emit("toss_updated", payload);
    } else {
      console.warn("Socket.io instance not found on app");
    }

    // The scorer needs the new match and innings ids to carry on
    res.status(200).json({ message: "Toss result updated successfully", ...result });
  } catch (err) {
    console.error("Toss Update Error:", err.message);
    sendScoringError(res, err, "Failed to record toss");
  }
};

// A match that ended level: what rule applies, and settling it (super over scores, batted first, host's pick).
exports.getTieBreak = handle("Could not load the tie-break", 200, (req) => tieBreak.status(intParam(req, "matchId")));

exports.resolveTieBreak = handle("Could not settle the tie", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const out = await tieBreak.resolve(matchId, req.body, req.user && req.user.id);
  // every screen watching the match gets the settled result
  const io = req.app.get("socketio");
  if (io) {
    const conn = await dbPool.getConnection();
    try {
      io.to(`match_${matchId}`).emit("scoreUpdate", await liveScoreService.getLiveScoreboard(conn, matchId));
    } finally {
      conn.release();
    }
  }
  return out;
});
