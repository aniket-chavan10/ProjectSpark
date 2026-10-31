// Notifications to a team (a match was scheduled, a result, the winner of a tournament, an announcement, a ban ...).
// One row per team, so each team has its own read state. `dedupeKey` stops the same event from being sent twice to a team.

const db = require("../dbconfigure");

const clip = (s, n) => (s === undefined || s === null ? null : String(s).slice(0, n));

/**
 * @param conn     a connection or the pool
 * @param teamIds  team ids (duplicates and empty values are ignored)
 * @param n        { type, title, body, link, dedupeKey }
 */
exports.notifyTeams = async (conn, teamIds, n) => {
  const ids = [...new Set((teamIds || []).map(Number).filter((x) => Number.isInteger(x) && x > 0))];
  if (!ids.length) return 0;
  const rows = ids.map((id) => [id, n.type, clip(n.title, 150), clip(n.body, 500), clip(n.link, 200), clip(n.dedupeKey, 80)]);
  const [res] = await conn.query(`INSERT IGNORE INTO team_notifications (team_id, type, title, body, link, dedupe_key) VALUES ?`, [rows]);
  return res.affectedRows;
};

exports.allTeamIds = async (conn = db) => {
  const [rows] = await conn.query(`SELECT id FROM teams`);
  return rows.map((r) => Number(r.id));
};

/** Take back notifications of an event that no longer holds (a match result that was undone). */
exports.withdraw = async (conn, dedupeKey) => {
  await conn.query(`DELETE FROM team_notifications WHERE dedupe_key = ?`, [dedupeKey]);
};

exports.listForTeam = async (teamId, { limit = 50, unreadOnly = false } = {}) => {
  const max = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const [rows] = await db.query(
    `SELECT id, type, title, body, link, created_at, read_at FROM team_notifications
     WHERE team_id = ? ${unreadOnly ? "AND read_at IS NULL" : ""} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [teamId, max]
  );
  const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM team_notifications WHERE team_id = ? AND read_at IS NULL`, [teamId]);
  return {
    unread: Number(count.n),
    items: rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, read: !!r.read_at })),
  };
};

/** Mark some (ids) or all of the team's notifications as read. */
exports.markRead = async (teamId, ids) => {
  if (Array.isArray(ids) && ids.length) {
    const clean = ids.map(Number).filter((x) => Number.isInteger(x) && x > 0);
    if (clean.length) await db.query(`UPDATE team_notifications SET read_at = NOW() WHERE team_id = ? AND read_at IS NULL AND id IN (?)`, [teamId, clean]);
  } else {
    await db.query(`UPDATE team_notifications SET read_at = NOW() WHERE team_id = ? AND read_at IS NULL`, [teamId]);
  }
  const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM team_notifications WHERE team_id = ? AND read_at IS NULL`, [teamId]);
  return { unread: Number(count.n) };
};
