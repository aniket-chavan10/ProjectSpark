const db = require('../dbconfigure');

exports.createTournament = async (tentativeId, organizerAdminId, name, venue, bannerImage) => {
  const sql = `
    INSERT INTO tournaments
    (tentative_id, start_date, end_date, organizer_admin_id, name, venue, banner_image, status, created_at)
    SELECT 
      ts.id, ts.start_date, ts.end_date, ts.organizer_admin_id, ?, ?, ?, 'pending', NOW()
    FROM tentative_tournament_schedules ts
    WHERE ts.id = ?
  `;
  const [result] = await db.query(sql, [name, venue, bannerImage, tentativeId]);
  return result.insertId;
};

exports.updateTournament = async (tournamentId, name, venue, bannerImage) => {
  const sql = `
    UPDATE tournaments
    SET name = ?, venue = ?, banner_image = ?, updated_at = NOW()
    WHERE id = ?
  `;
  await db.query(sql, [name, venue, bannerImage, tournamentId]);
};
