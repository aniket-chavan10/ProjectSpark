const liveScoreService = require("../services/liveScoreService");
const dbPool = require("../dbconfigure"); // your DB pool or connection

exports.getLiveScore = async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match id" });

  try {
    const conn = await dbPool.getConnection();
    try {
      const liveScoreData = await liveScoreService.getLiveScoreboard(conn, matchId);
      res.json(liveScoreData);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Error fetching live score", err);
    res.status(500).json({ error: "Failed to fetch live score data" });
  }
};


// controllers/liveScorecardController.js
exports.getLiveScorecardState = async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match id" });

  const io = req.app.get("socketio");

  try {
    const conn = await dbPool.getConnection();
    try {
      // Fetch live scorecard state using matchId (calls updated service)
      const state = await liveScoreService.getLiveScorecardState(conn, matchId);

      // Emit socket event if new batsman is awaited, informing clients in match room
      if (io && state.awaitingNewBatsman) {
        io.to(`match_${state.matchId}`).emit("awaiting_new_batsman", {
          inningId: state.inningId,
          message: "New batsman selection is required",
          liveScoreState: state,
        });
      }

      // Emit socket event if new bowler is awaited, informing clients in match room
      if (io && state.awaitingNewBowler) {
        io.to(`match_${state.matchId}`).emit("awaiting_new_bowler", {
          inningId: state.inningId,
          message: "New bowler selection is required",
          liveScoreState: state,
        });
      }

      return res.json({ success: true, data: state });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Error in getLiveScorecardState:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
