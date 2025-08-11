// services/tentativeScheduleService.js
const db = require('../dbconfigure'); // adjust if your DB connection file is different

/**
 * Create a new tentative tournament schedule
 * @param {number} organizer_admin_id - ID of the admin the schedule is assigned to
 * @param {string} start_date - Start date (YYYY-MM-DD)
 */
exports.createSchedule = async (organizer_admin_id, start_date) => {
  // Calculate end_date and reserved_days
  const start = new Date(start_date);
  
  // ✅ Assuming the schedule is 3 days by default
  const reserved_days = 3;

  // Add reserved_days - 1 to get end date
  const end = new Date(start);
  end.setDate(start.getDate() + (reserved_days - 1));
  const end_date = end.toISOString().split('T')[0]; // format to YYYY-MM-DD

  // Insert into DB
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
