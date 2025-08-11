const db = require('../dbconfigure');

exports.insertTentativeSchedule = async (organizerAdminId, startDate, endDate, reservedDays = 3) => {
  const sql = `
    INSERT INTO tentative_tournmanetschedules 
    (organizer_admin_id, start_date, end_date, reserved_days, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
  `;
  const [result] = await db.query(sql, [organizerAdminId, startDate, endDate, reservedDays]);
  return result.insertId;
};

exports.linkTournamentToSchedule = async (tentativeId, tournamentId) => {
  const sql = `
    UPDATE tentative_tournmanetschedules
    SET tournament_id = ?, status = 'setup_done'
    WHERE id = ?
  `;
  await db.query(sql, [tournamentId, tentativeId]);
};

exports.fetchSchedulesWithTournament = async (filter = {}) => {
  let where = '';
  const params = [];
  
  if (filter.organizerAdminId) {
    where = 'WHERE ts.organizer_admin_id = ?';
    params.push(filter.organizerAdminId);
  }
  
  const sql = `
    SELECT 
      ts.id AS tentative_id,
      ts.organizer_admin_id,
      ts.start_date,
      ts.end_date,
      ts.status AS schedule_status,
      t.id AS tournament_id,
      t.name,
      t.venue,
      t.banner_image,
      t.status AS tournament_status
    FROM tentative_tournmanetschedules ts
    LEFT JOIN tournaments t ON ts.id = t.tentative_id
    ${where}
    ORDER BY ts.start_date ASC
  `;
  
  const [rows] = await db.query(sql, params);
  return rows;
};
