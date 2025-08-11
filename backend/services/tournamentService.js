const db = require("../dbconfigure");


// services/tournamentService.js
exports.createTournamentFromSchedule = async (organizerAdminId, data) => {
  const { tentative_id, name, venue, banner_image } = data;

  // 1. Verify schedule belongs to admin
  const [schedule] = await db.query(
    `SELECT * FROM tentative_tournament_schedules 
     WHERE id = ? AND organizer_admin_id = ? AND status = 'pending'`,
    [tentative_id, organizerAdminId]
  );

  if (!schedule.length) {
    throw new Error('Invalid or unavailable schedule');
  }

  const sched = schedule[0];

  // 2. Insert tournament
  const [result] = await db.query(
    `INSERT INTO tournaments 
      (tentative_id, start_date, end_date, organizer_admin_id, name, banner_image, venue, status, organizing_team, total_slots, available_slots, application_deadline, current_step) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, 32, 32, DATE_SUB(?, INTERVAL 4 DAY), 1)`,
    [
      tentative_id,
      sched.start_date,
      sched.end_date,
      organizerAdminId,
      name,
      banner_image,
      venue,
      'My Team Name', // could be pulled dynamically if mapping to org
      sched.start_date
    ]
  );

  const tournamentId = result.insertId;

  await db.query(
    `UPDATE tentative_tournament_schedules SET status = 'allocated', tournament_id = ? WHERE id = ?`,
    [tournamentId, tentative_id]
  );

  return { tournamentId };
};
exports.getTournamentsByOrganizer = async (organizerAdminId) => {
  const [rows] = await db.query(
    `SELECT 
        s.id AS schedule_id,
        s.start_date,
        s.end_date,
        s.status AS schedule_status,
        t.id AS tournament_id,
        t.name,
        t.venue,
        t.banner_image,
        t.status AS tournament_status
     FROM tentative_tournament_schedules s
     LEFT JOIN tournaments t ON s.tournament_id = t.id
     WHERE s.organizer_admin_id = ?
       AND s.status IN ('pending', 'allocated')
     ORDER BY s.start_date ASC`,
    [organizerAdminId]
  );
  return rows;
};


// services/tournamentService.js
exports.getAppliedTeamsForOrganizer = async (organizerAdminId, tournamentId) => {
  const [tournRows] = await db.query(
    `SELECT id FROM tournaments 
     WHERE id = ? AND organizer_admin_id = ?`,
    [tournamentId, organizerAdminId]
  );
  if (!tournRows.length) {
    throw new Error("Tournament not found or access denied");
  }

  const [rows] = await db.query(
    `SELECT 
       tp.id AS application_id,
       tp.team_id,
       tp.group_name,
       tp.status,
       tp.created_at,
       tm.team_name,
       tm.logo,
       tm.team_name AS captain_name
     FROM tournament_participants tp
     JOIN teams tm ON tp.team_id = tm.id
     WHERE tp.tournament_id = ?
     ORDER BY tp.created_at DESC`,
    [tournamentId]
  );

  return rows;
};


exports.getTournamentById = async (tournamentId) => {
  const sql = `SELECT * FROM tournaments WHERE id = ?`;
  const [rows] = await db.query(sql, [tournamentId]);
  return rows.length ? rows[0] : null;
};

exports.updateTournament = async (tournamentId, updateData) => {
  const allowedFields = ["banner_image", "name", "venue"];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error(
      "No valid fields provided for update. Allowed: name, banner_image, venue."
    );
  }

  values.push(tournamentId);

  const sql = `UPDATE tournaments SET ${fields.join(
    ", "
  )}, updated_at = NOW() WHERE id = ?`;
  await db.query(sql, values);
  return exports.getTournamentById(tournamentId);
};

exports.getOpenTournaments = async () => {
  const sql = `
    SELECT t.*, 
           (t.total_slots - IFNULL(tp.applied_count, 0)) AS available_slots
    FROM tournaments t
    LEFT JOIN (
      SELECT tournament_id, COUNT(*) AS applied_count
      FROM tournament_participants
      GROUP BY tournament_id
    ) tp ON t.id = tp.tournament_id
    WHERE t.status = 'open'
      AND (t.application_deadline IS NULL OR t.application_deadline >= ?)
    HAVING available_slots > 0
    ORDER BY t.start_date DESC
  `;

  const now = new Date();
  const formattedNow = now.toISOString().slice(0, 19).replace("T", " ");

  const [rows] = await db.query(sql, [formattedNow]);
  return rows;
};
