// controllers/liveMatchController.js
const liveMatchService = require("../services/liveMatchService");
const playerValidator = require("../utils/playerValidator");

const liveScoreService = require("../services/liveScoreService");
const dbPool = require("../dbconfigure");

exports.setInitialPlayers = async (req, res) => {
  const io = req.app.get("socketio");
  const { matchId, inningId, strikerId, nonStrikerId, bowlerId } = req.body;
  let conn;
  try {
    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    await playerValidator.validateInitialPlayers({
      matchId,
      inningId,
      strikerId,
      nonStrikerId,
      bowlerId,
    });

    await liveMatchService.setInitialPlayers({
      matchId,
      inningId,
      strikerId,
      nonStrikerId,
      bowlerId,
    });

    const liveScoreData = await liveScoreService.getLiveScoreboard(
      conn,
      matchId
    );

    await conn.commit();

    if (io) {
      io.to(`match_${matchId}`).emit("scoreUpdate", liveScoreData);
      io.to(`match_${matchId}`).emit("initial_players_set", {
        message: "Initial players set successfully",
        inningId,
        strikerId,
        nonStrikerId,
        bowlerId,
        liveScoreData,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res.status(200).json({
      message: "Initial players set successfully",
      data: liveScoreData,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error setting initial players:", err.message);
    res.status(err.status || 400).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.setNewBatsman = async (req, res) => {
  const io = req.app.get("socketio");
  let { matchId, inningId, newBatsmanId, end } = req.body;

  if (typeof end === "string") {
    const lowerEnd = end.trim().toLowerCase();
    if (
      lowerEnd === "non-striker" ||
      lowerEnd === "non_striker" ||
      lowerEnd === "nonstriker"
    ) {
      end = "nonStriker";
    } else if (lowerEnd === "striker") {
      end = "striker";
    }
  }

  if (end !== "striker" && end !== "nonStriker") {
    return res
      .status(400)
      .json({ error: "Invalid end: Must be 'striker' or 'nonStriker'" });
  }

  let conn;
  try {
    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    await playerValidator.validateNewBatsman({
      matchId,
      inningId,
      newBatsmanId,
      end,
    });

    await liveMatchService.setNewBatsman({
      matchId,
      inningId,
      newBatsmanId,
      end,
    });

    const liveScoreData = await liveScoreService.getLiveScoreboard(
      conn,
      matchId
    );

    await conn.commit();

    if (io) {
      io.to(`match_${matchId}`).emit("scoreUpdate", liveScoreData);
      io.to(`match_${matchId}`).emit("new_batsman_set", {
        message: "New batsman set successfully",
        inningId,
        newBatsmanId,
        end,
        liveScoreData,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res
      .status(200)
      .json({ message: "New batsman set successfully", data: liveScoreData });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error setting new batsman:", err.message);
    res.status(err.status || 400).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.setNewBowler = async (req, res) => {
  let conn;
  try {
    const { matchId, inningId, newBowlerId } = req.body;
    if (!matchId || !inningId || !newBowlerId) {
      return res
        .status(400)
        .json({ error: "matchId, inningId, and newBowlerId are required." });
    }

    conn = await dbPool.getConnection();
    await conn.beginTransaction();

    // Note: Pass ONLY the params object; service manages connection internally with withTransaction
    await playerValidator.validateNewBowler({ matchId, inningId, newBowlerId });
    await liveMatchService.setNewBowler({ matchId, inningId, newBowlerId });

    // Fetch latest live scoreboard with explicit connection
    const liveScoreData = await liveScoreService.getLiveScoreboard(
      conn,
      matchId
    );

    await conn.commit();

    // Emit updated scoreboard to clients
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("scoreUpdate", liveScoreData);
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res
      .status(200)
      .json({ message: "New bowler set successfully", data: liveScoreData });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error setting new bowler:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  } finally {
    if (conn) conn.release();
  }
};

exports.getMatchDetails = async (req, res) => {
  const matchId = req.params.matchId;
  if (!matchId) return res.status(400).json({ error: "Match ID required" });

  try {
    const data = await liveMatchService.getMatchWithTeamsAndSquads(matchId);
    res.json(data);
  } catch (err) {
    console.error("Error fetching match details:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};
