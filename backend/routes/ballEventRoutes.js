const express = require('express');
const router = express.Router();
const controller = require('../controllers/ballEventController');

router.post('/event', controller.registerBallEvent);
router.post('/undo', controller.undoLastBallEvent);
router.post('/retire', controller.retireBatsman);
router.post('/change-striker', controller.changeStriker);

module.exports = router;
