const inningsService = require("../services/inningsService");

exports.switchInnings = async (req, res) => {
  try {
    const { matchId, currentInningId, strikerId, nonStrikerId, bowlerId } = req.body;

    // Call service to switch innings
    const result = await inningsService.switchInnings({
      matchId,
      currentInningId,
      strikerId,
      nonStrikerId,
      bowlerId,
    });

    // Get Socket.IO instance from request's app
    const io = req.app.get("socketio");
    if (io) {
      io.to(`match_${matchId}`).emit("innings_switched", {
        message: "Innings switched successfully",
        newInningId: result.newInningId,
        matchId,
      });
    } else {
      console.warn("Socket.io instance not found on app");
    }

    // Respond success
    res.status(200).json({ message: "Innings switched successfully", newInningId: result.newInningId });
  } catch (err) {
    console.error("Error switching innings:", err.message);
    res.status(400).json({ error: err.message });
  }
};
