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

exports.undoLastBallEvent = async (req, res) => {
  const io = req.app.get("socketio"); // Get Socket.IO instance
  const { inningId, matchId } = req.body;

  if (!inningId || !matchId) {
    return res.status(400).json({ success: false, message: "inningId and matchId are required" });
  }

  let conn;
  try {
    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    // Call service method to undo last ball event
    await ballService.undoLastBallEvent(conn, inningId, matchId);

    // Fetch updated live scoreboard data with enriched info
    const liveScoreData = await liveScoreService.getLiveScoreboard(conn, matchId);

    await conn.commit();

    // Emit updated live scoreboard to clients in the appropriate match room
    io.to(`match_${matchId}`).emit("scoreUpdate", liveScoreData);

    // Respond with success and fresh live scoreboard data
    res.status(200).json({ success: true, data: liveScoreData });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("Undo Last Ball Event Error:", err);
    res.status(500).json({ success: false, message: "Failed to undo last ball event" });
  } finally {
    if (conn) conn.release();
  }
};

exports.changeStriker = async (req, res) => {
  const io = req.app.get("socketio");
  const { inningId, newStrikerId } = req.body;

  if (!inningId || !newStrikerId) {
    return res.status(400).json({ success: false, message: "inningId and newStrikerId are required" });
  }

  let conn;
  try {
    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    await ballService.changeStriker(conn, inningId, newStrikerId);

    // Fetch updated live scoreboard data for the inning's match
    const [[inningRow]] = await conn.execute(
      `SELECT match_id FROM innings WHERE inning_id = ? LIMIT 1`,
      [inningId]
    );
    if (!inningRow) throw new Error("Inning not found");

    const liveScoreData = await liveScoreService.getLiveScoreboard(conn, inningRow.match_id);

    await conn.commit();

    io.to(`match_${inningRow.match_id}`).emit("scoreUpdate", liveScoreData);

    res.status(200).json({ success: true, data: liveScoreData });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("Change Striker Error:", err);
    res.status(500).json({ success: false, message: "Failed to change striker" });
  } finally {
    if (conn) conn.release();
  }
};
