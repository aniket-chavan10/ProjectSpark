const ballService = require('../services/ballEventService');
const liveScoreService = require('../services/liveScoreService');
const dbPool = require('../dbconfigure'); // your DB pool/connection

exports.registerBallEvent = async (req, res) => {
  const io = req.app.get("socketio"); // Get Socket.IO instance
  const inputData = req.body;

  let conn;
  try {
    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    // Sanitize input: convert undefined to null
    Object.keys(inputData).forEach((key) => {
      if (inputData[key] === undefined) inputData[key] = null;
    });

    // Register the ball event (DB + business logic)
    await ballService.registerBallEvent(conn, inputData);

    // Fetch updated live scoreboard data with enriched info
    const liveScoreData = await liveScoreService.getLiveScoreboard(conn, inputData.matchId);

    await conn.commit();

    // Emit updated live scoreboard to clients in the appropriate match room
    io.to(`match_${inputData.matchId}`).emit("scoreUpdate", liveScoreData);

    // Respond with success and fresh live scoreboard data
    res.status(201).json({ success: true, data: liveScoreData });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("Ball Event Error:", err);
    res.status(500).json({ success: false, message: "Failed to register ball event" });
  } finally {
    if (conn) conn.release();
  }
};
