const express = require('express');
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const verifyAdminToken = require('../middlewares/authMiddleware');

const { setToss, getTieBreak, resolveTieBreak, startSuperOver, superOverBall, undoSuperOverBall, setSuperOverPlayers, nextSuperOver, confirmSuperOver, resetSuperOver } = require('../controllers/matchController'); 

router.post("/:matchId/set/toss",  setToss); 

// settle a match that ended level
router.get("/:matchId/tiebreak", verifyAdminToken, getTieBreak);
router.post("/:matchId/tiebreak", verifyAdminToken, resolveTieBreak);
// the super over, played ball by ball
router.post("/:matchId/super-over/start", verifyAdminToken, startSuperOver);
router.post("/:matchId/super-over/ball", verifyAdminToken, superOverBall);
router.post("/:matchId/super-over/undo", verifyAdminToken, undoSuperOverBall);
router.put("/:matchId/super-over/players", verifyAdminToken, setSuperOverPlayers);
router.post("/:matchId/super-over/next", verifyAdminToken, nextSuperOver);
router.post("/:matchId/super-over/confirm", verifyAdminToken, confirmSuperOver);
router.delete("/:matchId/super-over", verifyAdminToken, resetSuperOver);

module.exports = router;
