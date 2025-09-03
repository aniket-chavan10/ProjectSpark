const tentativeScheduleService = require('../services/tentativeTournamentScheduleService');

exports.createSchedule = async (req, res) => {
  try {
    const { organizer_admin_id, start_date } = req.body;
    if (!organizer_admin_id || !start_date) {
      return res.status(400).json({ error: 'organizer_admin_id and start_date are required' });
    }

    const isFriday = await require('../utils/dateUtils').isFriday(start_date);
    if (!isFriday) {
      return res.status(400).json({ error: 'Start date must be a Friday' });
    }

    const createdSchedule = await tentativeScheduleService.createSchedule(organizer_admin_id, start_date);
    res.status(201).json(createdSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while creating tentative schedule' });
  }
};

exports.getAllSchedules = async (req, res) => {
  try {
    const schedules = await tentativeScheduleService.getAllSchedules();
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while fetching schedules' });
  }
};

exports.getSchedulesByOrganizer = async (req, res) => {
  try {
    const requestedId = req.params.organizerAdminId;
    const requester = req.user;

    // Master Admin can access any organizer's schedules
    if (requester.role !== 'masterAdmin' && requestedId != requester.id) {
      return res.status(403).json({ error: 'Access denied: Can only view your own schedules' });
    }

    const schedules = await tentativeScheduleService.getSchedulesByOrganizer(requestedId);
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};



