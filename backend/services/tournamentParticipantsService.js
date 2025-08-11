
// services/tournamentService.js
const db = require('../dbconfigure');

exports.getOpenTournamentsForAdmin = async (adminId) => {
  const [rows] = await db.query(`
    SELECT t.*, 
      CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END AS already_applied
    FROM tournaments t
    LEFT JOIN tournament_participants tp
      ON t.id = tp.tournament_id AND tp.team_id = ?
    WHERE t.status = 'open' 
      AND t.application_deadline >= CURDATE()
      AND t.available_slots > 0
  `, [adminId]);
  
  return rows;
};

exports.applyForTournament = async (tournamentId, teamId) => {
  // 1. Check tournament
  const [tournamentRows] = await db.query(`
    SELECT available_slots, status, application_deadline
    FROM tournaments WHERE id = ?`, [tournamentId]);

  if (!tournamentRows.length) throw new Error('Tournament not found');
  
  const t = tournamentRows[0];
  if (t.status !== 'open') throw new Error('Tournament is not open');
  if (t.available_slots <= 0) throw new Error('No slots available');
  if (new Date(t.application_deadline) < new Date()) throw new Error('Application deadline passed');

  // 2. Check already applied
  const [exists] = await db.query(`
    SELECT id FROM tournament_participants 
    WHERE tournament_id = ? AND team_id = ?`, [tournamentId, teamId]);
  if (exists.length) throw new Error('Already applied');

  // 3. Insert into participants
  await db.query(`
    INSERT INTO tournament_participants (tournament_id, team_id, status, created_at)
    VALUES (?, ?, 'payment_pending', NOW())`, [tournamentId, teamId]);

  // 4. Reduce available slots
  await db.query(`
    UPDATE tournaments SET available_slots = available_slots - 1
    WHERE id = ?`, [tournamentId]);

  return { message: 'Applied successfully' };
};
