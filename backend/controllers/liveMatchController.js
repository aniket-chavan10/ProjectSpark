// controllers/liveMatchController.js
const liveMatchService = require("../services/liveMatchService");
const playerValidator = require("../utils/playerValidator");

exports.setInitialPlayers = async (req, res) => {
  try {
    const { matchId, inningId, strikerId, nonStrikerId, bowlerId } = req.body;

    // Validate
    await playerValidator.validateInitialPlayers({ matchId, inningId, strikerId, nonStrikerId, bowlerId });

    // Set in DB
    await liveMatchService.setInitialPlayers({ matchId, inningId, strikerId, nonStrikerId, bowlerId });

    // Emit socket event
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("initial_players_set", {
        message: "Initial players set successfully",
        inningId,
        strikerId,
        nonStrikerId,
        bowlerId,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res.status(200).json({ message: "Initial players set successfully" });
  } catch (err) {
    console.error("Error setting initial players:", err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.setNewBatsman = async (req, res) => {
  try {
    const { matchId, inningId, newBatsmanId, end /* "striker"|"non-striker" */ } = req.body;

    await playerValidator.validateNewBatsman({ matchId, inningId, newBatsmanId, end });

    await liveMatchService.setNewBatsman({ matchId, inningId, newBatsmanId, end });

    // Emit socket event
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("new_batsman_set", {
        message: "New batsman set successfully",
        inningId,
        newBatsmanId,
        end,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res.status(200).json({ message: "New batsman set successfully" });
  } catch (err) {
    console.error("Error setting new batsman:", err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.setNewBowler = async (req, res) => {
  try {
    const { matchId, inningId, newBowlerId } = req.body;

    await playerValidator.validateNewBowler({ matchId, inningId, newBowlerId });

    await liveMatchService.setNewBowler({ matchId, inningId, newBowlerId });

    // Emit socket event
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("new_bowler_set", {
        message: "New bowler set successfully",
        inningId,
        newBowlerId,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    res.status(200).json({ message: "New bowler set successfully" });
  } catch (err) {
    console.error("Error setting new bowler:", err.message);
    res.status(400).json({ error: err.message });
  }
};
