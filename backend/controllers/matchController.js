const matchService = require("../services/matchService");
const { sendScoringError } = require("../utils/errors");

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
