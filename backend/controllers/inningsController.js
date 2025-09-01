const pool = require("../dbconfigure"); // Your DB connection pool
const inningsService = require("../services/inningsService");
const { getLiveScoreboard } = require("../services/liveScoreService");

exports.switchInnings = async (req, res) => {
  const io = req.app.get("socketio");
  let conn;
  try {
    const { matchId, currentInningId, strikerId, nonStrikerId, bowlerId } = req.body;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Call service to switch innings passing the existing connection and data
    const result = await inningsService.switchInnings(conn, {
      matchId,
      currentInningId,
      strikerId,
      nonStrikerId,
      bowlerId,
    });

    // Fetch the updated scoreboard using same connection, to stay within transaction
    const updatedScoreData = await getLiveScoreboard(conn, matchId);

    await conn.commit();

    // Emit socket event after commit
    if (io && updatedScoreData) {
      io.to(`match_${matchId}`).emit("innings_switched", {
        message: "Innings switched successfully",
        liveScoreData: updatedScoreData,
      });
    }

    res.status(201).json({ success: true, newInningId: result.newInningId, data: updatedScoreData });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error switching innings:", err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
