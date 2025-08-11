const express = require('express');
const router = express.Router();
const tentativeScheduleController = require('../controllers/tentativeTournamentScheduleController');
const authMiddleware = require('../middlewares/masterAdminAuth');

// Master Admin creates a tentative schedule
router.post('/tentative-schedule', tentativeScheduleController.createSchedule);

// Get all tentative schedules
router.get('/tentative-schedule',  tentativeScheduleController.getAllSchedules);

// this is for master admin
router.get('/tentative-schedule/:organizerAdminId',  tentativeScheduleController.getSchedulesByOrganizer);

// routes/tentativeScheduleRoutes.js
router.get('/tentative-schedule/organizer/:organizerAdminId', tentativeScheduleController.getSchedulesByOrganizer); // this is for admin 


module.exports = router;
