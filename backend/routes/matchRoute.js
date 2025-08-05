const express = require('express');
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const verifyAdminToken = require('../middlewares/authMiddleware');

const { setToss } = require('../controllers/matchController'); 

router.post("/:matchId/set/toss",  setToss); 

module.exports = router;
