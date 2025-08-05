const express = require('express');
const router = express.Router();
const controller = require('../controllers/ballEventController');

router.post('/event', controller.registerBallEvent);

module.exports = router;
