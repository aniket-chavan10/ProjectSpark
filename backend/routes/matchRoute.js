const express = require('express');
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const verifyAdminToken = require('../middlewares/authMiddleware');

const { setToss, getTieBreak, resolveTieBreak } = require('../controllers/matchController'); 

router.post("/:matchId/set/toss",  setToss); 

// settle a match that ended level
router.get("/:matchId/tiebreak", verifyAdminToken, getTieBreak);
router.post("/:matchId/tiebreak", verifyAdminToken, resolveTieBreak);

module.exports = router;
