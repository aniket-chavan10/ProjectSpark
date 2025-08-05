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
