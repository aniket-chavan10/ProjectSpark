// Bans issued by the association: a player or a whole team, for a period or until revoked.
//   - a banned team cannot register for a tournament and cannot start a match (the toss is refused)
//   - a banned player cannot be picked for a squad, and cannot be in a squad when the toss happens
// Every ban is kept (who, why, when, who revoked it), so there is a history. For players,
// players_core.is_banned / banned_until are kept in step because the squad code reads them.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const notifications = require("./notificationService");

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const dayAfter = (s) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return ymd(d);
};
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s));
const day = (v) => (v instanceof Date ? ymd(v) : String(v).slice(0, 10));

// a ban is in force from its first day to its last day (inclusive), unless it was revoked
const ACTIVE_SQL = `b.revoked_at IS NULL AND b.starts_on <= CURDATE() AND (b.ends_on IS NULL OR b.ends_on >= CURDATE())`;

const statusOf = (r) => {
  if (r.revoked_at) return "revoked";
  if (r.ends_on && day(r.ends_on) < today()) return "expired";
  if (day(r.starts_on) > today()) return "upcoming";
  return "active";
};

const shape = (r) => ({
  id: r.id,
  subjectType: r.subject_type,
  subjectId: Number(r.subject_id),
  subjectName: r.subject_name || null,
  teamName: r.team_name || null,
  reason: r.reason,
  startsOn: day(r.starts_on),
  endsOn: r.ends_on ? day(r.ends_on) : null,
  status: statusOf(r),
  createdAt: r.created_at,
  revokedAt: r.revoked_at || null,
  revokeReason: r.revoke_reason || null,
});

const LIST_SQL = `
  SELECT b.*, CASE b.subject_type WHEN 'team' THEN t.team_name ELSE p.players_name END AS subject_name,
         CASE b.subject_type WHEN 'player' THEN pt.team_name ELSE NULL END AS team_name
  FROM bans b
  LEFT JOIN teams t ON b.subject_type = 'team' AND t.id = b.subject_id
  LEFT JOIN players_core p ON b.subject_type = 'player' AND p.player_id = b.subject_id
  LEFT JOIN teams pt ON pt.id = p.team_id`;

/** @param filter 'active' (default) | 'all' */
exports.list = async ({ filter = "active", type } = {}) => {
  const where = [];
  const params = [];
  if (filter === "active") where.push(ACTIVE_SQL);
  if (type === "player" || type === "team") {
    where.push("b.subject_type = ?");
    params.push(type);
  }
  const [rows] = await db.query(`${LIST_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY b.created_at DESC, b.id DESC LIMIT 300`, params);
  return rows.map(shape);
};

/** Find a team or player to ban by name (for the picker on the association screen). */
exports.searchSubjects = async (q) => {
  const text = String(q || "").trim();
  if (text.length < 2) return { teams: [], players: [] };
  const like = `%${text.replace(/[%_]/g, "")}%`;
  const [teams] = await db.query(`SELECT id, team_name FROM teams WHERE team_name LIKE ? ORDER BY team_name LIMIT 10`, [like]);
  const [players] = await db.query(
    `SELECT p.player_id, p.players_name, t.team_name FROM players_core p LEFT JOIN teams t ON t.id = p.team_id WHERE p.players_name LIKE ? ORDER BY p.players_name LIMIT 10`,
    [like]
  );
  return {
    teams: teams.map((t) => ({ id: Number(t.id), name: t.team_name })),
    players: players.map((p) => ({ id: Number(p.player_id), name: p.players_name, teamName: p.team_name })),
  };
};

async function activeBan(conn, type, id) {
  const [rows] = await conn.query(`SELECT b.* FROM bans b WHERE b.subject_type = ? AND b.subject_id = ? AND ${ACTIVE_SQL} ORDER BY b.id DESC LIMIT 1`, [type, id]);
  return rows[0] || null;
}

const untilText = (ban) => (ban.ends_on ? `until ${day(ban.ends_on)}` : "until the association lifts it");

exports.activeTeamBan = (conn, teamId) => activeBan(conn, "team", teamId);

/** Refuse when the team is banned right now. `what` finishes the sentence: "... cannot <what>". */
exports.assertTeamNotBanned = async (conn, teamId, what, teamName) => {
  const ban = await activeBan(conn, "team", teamId);
  if (ban) throw new ScoringError(`${teamName || "This team"} is banned ${untilText(ban)} and cannot ${what}. Reason: ${ban.reason}`, 403);
};

/** Banned players among these ids: rows of players_core. Reads the flags kept in step with the bans. */
exports.bannedAmong = async (conn, playerIds) => {
  const ids = [...new Set((playerIds || []).map(Number).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await conn.query(`SELECT player_id, players_name, is_banned, banned_until FROM players_core WHERE player_id IN (?)`, [ids]);
  const now = new Date();
  return rows.filter((p) => !!p.is_banned && (!p.banned_until || new Date(p.banned_until) > now));
};

/**
 * @param input { subjectType: 'player'|'team', subjectId, reason, endsOn?: 'YYYY-MM-DD' (last banned day), omit for no end }
 * @param by    id of the association login
 */
exports.create = async (input, by) => {
  const type = input.subjectType;
  const subjectId = Number(input.subjectId);
  if (type !== "player" && type !== "team") throw new ScoringError("Choose a player or a team to ban");
  if (!Number.isInteger(subjectId) || subjectId <= 0) throw new ScoringError("Choose who to ban");
  const reason = String(input.reason || "").trim().replace(/\s+/g, " ");
  if (reason.length < 3 || reason.length > 300) throw new ScoringError("Write the reason for the ban (3 to 300 letters)");
  let endsOn = null;
  if (input.endsOn) {
    if (!isDate(input.endsOn)) throw new ScoringError("The end date is not a valid date");
    if (String(input.endsOn) < today()) throw new ScoringError("The end date cannot be in the past");
    endsOn = String(input.endsOn);
  }

  let teamId;
  let name;
  if (type === "team") {
    const [rows] = await db.query(`SELECT id, team_name FROM teams WHERE id = ?`, [subjectId]);
    if (!rows.length) throw new ScoringError("Team not found", 404);
    teamId = Number(rows[0].id);
    name = rows[0].team_name;
  } else {
    const [rows] = await db.query(`SELECT player_id, players_name, team_id FROM players_core WHERE player_id = ?`, [subjectId]);
    if (!rows.length) throw new ScoringError("Player not found", 404);
    teamId = Number(rows[0].team_id);
    name = rows[0].players_name;
  }

  const already = await activeBan(db, type, subjectId);
  if (already) throw new ScoringError(`${name} is already banned ${untilText(already)}. Revoke that ban first to change it.`, 409);

  const [res] = await db.query(`INSERT INTO bans (subject_type, subject_id, reason, starts_on, ends_on, created_by) VALUES (?, ?, ?, CURDATE(), ?, ?)`, [type, subjectId, reason, endsOn, by || null]);
  if (type === "player") {
    // players_core.banned_until is the first day the player is free again
    await db.query(`UPDATE players_core SET is_banned = 1, banned_until = ? WHERE player_id = ?`, [endsOn ? dayAfter(endsOn) : null, subjectId]);
  }

  try {
    await notifications.notifyTeams(db, [teamId], {
      type: "ban",
      title: type === "team" ? "Your team has been banned" : `${name} has been banned`,
      body: `${endsOn ? `Until ${endsOn}` : "Until the association lifts it"}. Reason: ${reason}`,
      link: "notifications",
      dedupeKey: `ban:${res.insertId}`,
    });
  } catch (err) {
    console.error("Ban saved, but the team could not be notified", err.message);
  }
  return { id: res.insertId, subjectType: type, subjectId, name, endsOn };
};

exports.revoke = async (banId, { by, reason } = {}) => {
  const [rows] = await db.query(`SELECT * FROM bans WHERE id = ?`, [banId]);
  const ban = rows[0];
  if (!ban) throw new ScoringError("Ban not found", 404);
  if (ban.revoked_at) throw new ScoringError("This ban was already revoked", 409);

  await db.query(`UPDATE bans SET revoked_at = NOW(), revoked_by = ?, revoke_reason = ? WHERE id = ?`, [by || null, String(reason || "").trim().slice(0, 300) || null, banId]);

  let teamId = Number(ban.subject_id);
  let name = null;
  if (ban.subject_type === "player") {
    const [[p]] = await db.query(`SELECT team_id, players_name FROM players_core WHERE player_id = ?`, [ban.subject_id]);
    if (p) {
      teamId = Number(p.team_id);
      name = p.players_name;
    }
    // still banned by another ban? keep the flag
    const other = await activeBan(db, "player", ban.subject_id);
    if (!other) await db.query(`UPDATE players_core SET is_banned = 0, banned_until = NULL WHERE player_id = ?`, [ban.subject_id]);
  } else {
    const [[t]] = await db.query(`SELECT team_name FROM teams WHERE id = ?`, [ban.subject_id]);
    name = t ? t.team_name : null;
  }

  try {
    await notifications.notifyTeams(db, [teamId], {
      type: "ban_revoked",
      title: ban.subject_type === "team" ? "Your team's ban has been lifted" : `${name || "A player"}'s ban has been lifted`,
      body: "You can play again.",
      link: "notifications",
      dedupeKey: `ban_revoked:${banId}`,
    });
  } catch (err) {
    console.error("Ban revoked, but the team could not be notified", err.message);
  }
  return { revoked: Number(banId) };
};

exports._statusOf = statusOf;
