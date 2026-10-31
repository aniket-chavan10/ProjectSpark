const liveScoreService = require("../services/liveScoreService");
const scorecardService = require("../services/scorecardService");
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

// GET the full scorecard: batting with how out, bowling, extras, fall of wickets
exports.getScorecard = async (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);
  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match id" });

  try {
    const conn = await dbPool.getConnection();
    try {
      res.json(await scorecardService.getScorecard(conn, matchId));
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Error fetching scorecard", err);
    const missing = err.message === "Match not found";
    res.status(missing ? 404 : 500).json({ error: missing ? err.message : "Failed to fetch the scorecard" });
  }
};
