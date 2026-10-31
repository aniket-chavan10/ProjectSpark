const tentativeScheduleService = require('../services/tentativeTournamentScheduleService');
const { toMinutes } = require('../utils/scheduleRules');

const isRealDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(toMinutes(s, '00:00'));

exports.createSchedule = async (req, res) => {
  try {
    const { organizer_admin_id, start_date } = req.body;
    if (!organizer_admin_id || !start_date) {
      return res.status(400).json({ error: 'organizer_admin_id and start_date are required' });
    }
    if (!isRealDate(start_date)) {
      return res.status(400).json({ error: 'start_date must be a valid date (YYYY-MM-DD)' });
    }

    // Tournaments usually start on a Friday and run for 3 days, but any start date and 1-7 days are fine.
    const reservedDays = req.body.reserved_days === undefined ? 3 : parseInt(req.body.reserved_days, 10);
    if (!Number.isInteger(reservedDays) || reservedDays < 1 || reservedDays > 7) {
      return res.status(400).json({ error: 'reserved_days must be between 1 and 7' });
    }

    const createdSchedule = await tentativeScheduleService.createSchedule(organizer_admin_id, start_date, reservedDays);
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

    // A team can only see its own reserved dates (the association uses the list of all schedules)
    if (requestedId != requester.id) {
      return res.status(403).json({ error: 'Access denied: Can only view your own schedules' });
    }

    const schedules = await tentativeScheduleService.getSchedulesByOrganizer(requestedId);
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
