// Overlay desk. Reading is public (the streaming software has no login); changing the scene needs a login.
const overlayService = require("../services/overlayService");
const { handle, intParam } = require("../utils/handle");

const tell = (req, matchId, event, payload) => {
  const io = req.app.get("socketio");
  if (io) io.to(`match_${matchId}`).emit(event, payload);
};

exports.getData = handle("Could not load the overlay", 200, (req) => overlayService.getData(intParam(req, "matchId")));

exports.setScene = handle("Could not change the overlay", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const state = await overlayService.setState(matchId, req.body);
  tell(req, matchId, "overlayUpdate", state);
  return state;
});

exports.setPlayerOfMatch = handle("Could not save the player of the match", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const out = await overlayService.setPlayerOfMatch(matchId, req.body.playerId);
  tell(req, matchId, "overlayUpdate", await overlayService.getState(matchId));
  return out;
});
