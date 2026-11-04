// Overlay desk. Reading is public (the streaming software has no login); changing the scene needs a login.
const jwt = require("jsonwebtoken");
const overlayService = require("../services/overlayService");
const { handle, intParam } = require("../utils/handle");

const tell = (req, matchId, event, payload) => {
  const io = req.app.get("socketio");
  if (io) io.to(`match_${matchId}`).emit(event, payload);
};

// The scorer makes a link for the person running the overlay. The key inside it only works for this match's overlay.
const OPERATOR_HOURS = 12;
exports.createOperatorLink = handle("Could not make the operator link", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  await overlayService.assertMatchExists(matchId);
  const token = jwt.sign({ scope: "overlay-operator", matchId }, process.env.JWT_SECRET, { expiresIn: `${OPERATOR_HOURS}h` });
  return { matchId, key: token, path: `/operator/${matchId}?key=${encodeURIComponent(token)}`, expiresInHours: OPERATOR_HOURS };
});

exports.getData = handle("Could not load the overlay", 200, (req) => overlayService.getData(intParam(req, "matchId")));

exports.setScene = handle("Could not change the overlay", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const state = await overlayService.setState(matchId, req.body);
  tell(req, matchId, "overlayUpdate", state);
  return state;
});

// what the always-on score bar shows (batters, bowler, this over, right-hand block, photos, corner tag, banners)
exports.setBar = handle("Could not change the score bar", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const state = await overlayService.setBar(matchId, req.body);
  tell(req, matchId, "overlayUpdate", state);
  return state;
});

exports.setPlayerOfMatch = handle("Could not save the player of the match", 200, async (req) => {
  const matchId = intParam(req, "matchId");
  const out = await overlayService.setPlayerOfMatch(matchId, req.body.playerId);
  tell(req, matchId, "overlayUpdate", await overlayService.getState(matchId));
  return out;
});
