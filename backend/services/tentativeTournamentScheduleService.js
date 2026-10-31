// services/tentativeScheduleService.js
// Dates the association reserves for a team to host a tournament (before the tournament itself exists).
const db = require('../dbconfigure');
const { addDays } = require('../utils/scheduleRules');

/**
 * Reserve dates for a hosting team.
 * @param {number} organizer_admin_id - admin (hosting team) the dates are assigned to
 * @param {string} start_date - first day, YYYY-MM-DD (usually a Friday, but any day is allowed)
 * @param {number} reserved_days - number of days reserved, default 3
 */
exports.createSchedule = async (organizer_admin_id, start_date, reserved_days = 3) => {
  const end_date = addDays(start_date, reserved_days - 1);

  const [result] = await db.query(
    `INSERT INTO tentative_tournament_schedules 
     (organizer_admin_id, start_date, end_date, reserved_days, created_at, updated_at, status, tournament_id)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 'pending', NULL)`,
    [organizer_admin_id, start_date, end_date, reserved_days]
  );

  return {
    id: result.insertId,
    organizer_admin_id,
    start_date,
    end_date,
    reserved_days,
    status: 'pending'
  };
};

const SELECT_SCHEDULES = `
  SELECT s.id, s.organizer_admin_id, s.start_date, s.end_date, s.reserved_days, s.status,
         s.tournament_id, tm.team_name AS organizer_team_name, t.name AS tournament_name
  FROM tentative_tournament_schedules s
  LEFT JOIN teams tm ON tm.admin_id = s.organizer_admin_id
  LEFT JOIN tournaments t ON t.id = s.tournament_id`;

exports.getAllSchedules = async () => {
  const [rows] = await db.query(`${SELECT_SCHEDULES} ORDER BY s.start_date ASC`);
  return rows;
};

exports.getSchedulesByOrganizer = async (organizerAdminId) => {
  const [rows] = await db.query(`${SELECT_SCHEDULES} WHERE s.organizer_admin_id = ? ORDER BY s.start_date ASC`, [organizerAdminId]);
  return rows;
};
