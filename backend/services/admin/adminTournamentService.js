const db = require('../dbconfigure');

exports.applyToTournament = async ({ tournament_id, team_id }) => {
  // Check if tournament exists and has slots available
  const tournamentSql = `
    SELECT t.id, t.total_slots,
           IFNULL(tp.applied_count, 0) AS applied_teams
    FROM tournaments t
    LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS applied_count 
        FROM tournament_participants 
        WHERE status != 'cancelled'
        GROUP BY tournament_id
    ) tp ON t.id = tp.tournament_id
    WHERE t.id = ? AND t.status = 'open'
  `;

  const [tournaments] = await db.query(tournamentSql, [tournament_id]);
  if (tournaments.length === 0) {
    throw new Error('Tournament not found or not open for applications');
  }

  const tournament = tournaments[0];
  const availableSlots = tournament.total_slots - tournament.applied_teams;

  if (availableSlots <= 0) {
    throw new Error('No slots available in this tournament');
  }

  // Check if team already applied
  const [existingEntries] = await db.query(
    `SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ? AND status != 'cancelled'`,
    [tournament_id, team_id]
  );

  if (existingEntries.length > 0) {
    throw new Error('Team has already applied to this tournament');
  }

  // Insert application with default payment status = 'payment_pending'
  const insertSql = `
    INSERT INTO tournament_participants (tournament_id, team_id, group_name, status, created_at)
    VALUES (?, ?, NULL, 'payment_pending', NOW())
  `;

  const [result] = await db.query(insertSql, [tournament_id, team_id]);

  return {
    id: result.insertId,
    tournament_id,
    team_id,
    status: 'payment_pending',
  };
};


exports.getOpenTournaments = async (team_id) => {
  const sql = `
    SELECT 
      t.id,
      t.name,
      t.venue,
      t.start_date,
      t.end_date,
      t.total_slots,
      IFNULL(tp.applied_count, 0) AS applied_teams,
      (t.total_slots - IFNULL(tp.applied_count, 0)) AS available_slots,
      t.banner_image,
      t.organizing_team,
      -- ✅ Flag: already applied or not for this team
      CASE 
        WHEN my_apps.id IS NOT NULL THEN 1
        ELSE 0
      END AS alreadyApplied
    FROM tournaments t
    LEFT JOIN (
      SELECT tournament_id, COUNT(*) AS applied_count 
      FROM tournament_participants 
      WHERE status != 'cancelled'
      GROUP BY tournament_id
    ) tp ON t.id = tp.tournament_id
    -- Join to check if this team has applied
    LEFT JOIN tournament_participants my_apps
      ON my_apps.tournament_id = t.id
      AND my_apps.team_id = ?
      AND my_apps.status != 'cancelled'
    WHERE t.status = 'open'
    ORDER BY t.start_date ASC
  `;

  const [rows] = await db.query(sql, [team_id]);
  return rows;
};
