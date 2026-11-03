const matchService = require("../services/matchService");
const { sendScoringError } = require("../utils/errors");
const tieBreak = require("../services/tieBreakService");
const superOver = require("../services/superOverService");
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

// Every screen watching the match (scoreboard, overlay, public page) gets the fresh scoreboard, super over included.
async function broadcastScore(req, matchId) {
  const io = req.app.get("socketio");
  if (!io) return;
  const conn = await dbPool.getConnection();
  try {
    io.to(`match_${matchId}`).emit("scoreUpdate", await liveScoreService.getLiveScoreboard(conn, matchId));
  } catch (err) {
    console.error("Could not send the scoreboard after a tie-break change:", err.message);
  } finally {
    conn.release();
  }
}

// A match that ended level: what rule applies, and settling it (super over, batted first, host's pick).
exports.getTieBreak = handle("Could not load the tie-break", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  return { ...(await tieBreak.status(matchId)), superOver: await superOver.status(matchId) };
});

exports.resolveTieBreak = handle("Could not settle the tie", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const out = await tieBreak.resolve(matchId, req.body, req.user && req.user.id);
  await broadcastScore(req, matchId);
  return out;
});

// The super over, played ball by ball. Each call answers with the new state and tells the stream.
const playSuperOver = (fallback, act) =>
  handle(fallback, 200, async (req) => {
    const matchId = intParam(req, "matchId");
    const state = await act(matchId, req);
    await broadcastScore(req, matchId);
    return { superOver: state };
  });

exports.startSuperOver = playSuperOver("Could not start the super over", (id) => superOver.start(id));
exports.superOverBall = playSuperOver("Could not record the ball", (id, req) => superOver.ball(id, req.body));
exports.undoSuperOverBall = playSuperOver("Could not take the ball back", (id) => superOver.undo(id));
exports.setSuperOverPlayers = playSuperOver("Could not set the players", (id, req) => superOver.setPlayers(id, req.body));
exports.nextSuperOver = playSuperOver("Could not start the next super over", (id) => superOver.nextRound(id));
exports.resetSuperOver = playSuperOver("Could not remove the super over", (id) => superOver.reset(id));

exports.confirmSuperOver = handle("Could not confirm the result", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const out = await superOver.confirm(matchId, req.user && req.user.id);
  await broadcastScore(req, matchId);
  return { ...out, superOver: await superOver.status(matchId) };
});
