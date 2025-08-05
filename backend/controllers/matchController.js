const matchService = require("../services/matchService");

exports.setToss = async (req, res) => {
  const { matchId } = req.params;
  const { tossWinnerId, tossDecision } = req.body;

  console.log("setToss:", { matchId, tossWinnerId, tossDecision });

  try {
    await matchService.setToss(matchId, tossWinnerId, tossDecision);

    // Emit socket event to notify clients of toss update
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("toss_updated", {
        message: "Toss result updated successfully",
        matchId,
        tossWinnerId,
        tossDecision,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res.status(200).json({ message: "Toss result updated successfully" });
  } catch (err) {
    console.error("Toss Update Error:", err);
    res.status(500).json({ error: err.message });
  }
};
