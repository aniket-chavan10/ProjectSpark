const express = require('express');
const router = express.Router();
const tentativeScheduleController = require('../controllers/tentativeTournamentScheduleController');
const verifyMasterAdminToken = require('../middlewares/masterAdminAuth');
const verifyAdminToken = require('../middlewares/authMiddleware');

// The association (master admin) reserves dates for hosting teams and sees every reservation
router.post('/tentative-schedule', verifyMasterAdminToken, tentativeScheduleController.createSchedule);
router.get('/tentative-schedule', verifyMasterAdminToken, tentativeScheduleController.getAllSchedules);

// A hosting team sees the dates reserved for it
router.get('/tentative-schedule/:organizerAdminId', verifyAdminToken, tentativeScheduleController.getSchedulesByOrganizer);
router.get('/tentative-schedule/organizer/:organizerAdminId', verifyAdminToken, tentativeScheduleController.getSchedulesByOrganizer);

module.exports = router;
