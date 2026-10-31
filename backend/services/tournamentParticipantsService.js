// services/tournamentParticipantsService.js
const db = require('../dbconfigure');
const banService = require('./banService');

exports.getOpenTournamentsForAdmin = async (teamId) => {
  const [rows] = await db.query(`
    SELECT t.*, 
      CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END AS already_applied
    FROM tournaments t
    LEFT JOIN tournament_participants tp
      ON t.id = tp.tournament_id AND tp.team_id = ? AND tp.status NOT IN ('cancelled', 'rejected')
    WHERE t.status = 'open' 
      AND t.application_deadline >= CURDATE()
      AND t.available_slots > 0
  `, [teamId]);
  
  return rows;
};

/**
 * Register a team. The first 32 teams get in: the tournament row is locked while we check and
 * take the slot, so two teams applying for the last slot cannot both get it.
 */
exports.applyForTournament = async (tournamentId, teamId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [tournamentRows] = await conn.query(`
      SELECT available_slots, status,
             (application_deadline IS NULL OR application_deadline >= CURDATE()) AS accepting
      FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);

    if (!tournamentRows.length) throw new Error('Tournament not found');
    await banService.assertTeamNotBanned(conn, teamId, 'register for a tournament');

    const t = tournamentRows[0];
    if (t.status !== 'open') throw new Error('Tournament is not open');
    if (!Number(t.accepting)) throw new Error('Registration is closed for this tournament');
    if (t.available_slots <= 0) throw new Error('All 32 places are taken');

    const [exists] = await conn.query(`
      SELECT id FROM tournament_participants
      WHERE tournament_id = ? AND team_id = ? AND status NOT IN ('cancelled', 'rejected')`, [tournamentId, teamId]);
    if (exists.length) throw new Error('This team has already registered');

    await conn.query(`
      INSERT INTO tournament_participants (tournament_id, team_id, status, created_at)
      VALUES (?, ?, 'payment_pending', NOW())`, [tournamentId, teamId]);

    await conn.query(`
      UPDATE tournaments SET available_slots = available_slots - 1
      WHERE id = ?`, [tournamentId]);

    await conn.commit();
    return { message: 'Registered successfully' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
