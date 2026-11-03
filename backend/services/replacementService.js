// A team backs out (at the last moment, or any time): the host of the tournament puts another team in its place.
//
//   * the new team takes the old team's GROUP and every match that has not started yet
//   * matches that were already played stay with the old team (the results are history and are not rewritten)
//   * a match that has started (toss done / live) blocks the swap until it is finished or abandoned
//   * the match squads the old team had named for the matches it gives up are removed
//   * the old team, the new team and the opponents are notified; the swap is kept in tournament_replacements
//
// Only the hosting team's admin can do this. Everything happens in one transaction.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");

// an older database that has not been upgraded yet has no tournament_replacements table
const missingTable = (err) => err && (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146);
const NEEDS_UPGRADE = "The database is missing a table that replacing a team needs. Run `npm run db:upgrade` once in the backend folder, then try again.";
const notifications = require("./notificationService");
const banService = require("./banService");

const ACTIVE_BAN = `EXISTS (SELECT 1 FROM bans b WHERE b.subject_type = 'team' AND b.subject_id = t.id AND b.revoked_at IS NULL AND b.starts_on <= CURDATE() AND (b.ends_on IS NULL OR b.ends_on >= CURDATE()))`;
const CLOSED = new Set(["completed", "cancelled"]);

const int = (v, what) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isInteger(n) || n <= 0) throw new ScoringError(`${what} is required`, 400);
  return n;
};

/** True while a fixture has been started (toss done) but is not finished: the swap has to wait. */
const inProgress = (f) => !!f.match_id && f.status !== "completed";
/** A fixture nobody has started: the replacement takes it over. */
const open = (f) => !f.match_id && f.status === "scheduled";

const pad = (n) => String(n).padStart(2, "0");
const dayText = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeText = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function lockTournament(conn, tournamentId, hostAdminId) {
  const [rows] = await conn.query(`SELECT id, name, status, organizer_admin_id FROM tournaments WHERE id = ? ${conn === db ? "" : "FOR UPDATE"}`, [tournamentId]);
  if (!rows.length) throw new ScoringError("Tournament not found", 404);
  if (Number(rows[0].organizer_admin_id) !== Number(hostAdminId)) throw new ScoringError("Only the hosting team can replace a team", 403);
  return rows[0];
}

async function fixturesOf(conn, tournamentId, teamId) {
  const [rows] = await conn.query(
    `SELECT tm.id, tm.match_no, tm.stage, tm.round_number, tm.group_name, tm.team1_id, tm.team2_id, tm.match_id, tm.status, tm.match_date, tm.match_time,
            t1.team_name AS team1_name, t2.team_name AS team2_name
     FROM tournament_matches tm
     LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id
     WHERE tm.tournament_id = ? AND (tm.team1_id = ? OR tm.team2_id = ?) ORDER BY tm.match_no`,
    [tournamentId, teamId, teamId]
  );
  return rows;
}

const describe = (f, teamId) => {
  const mine1 = Number(f.team1_id) === Number(teamId);
  return {
    fixtureId: Number(f.id),
    matchNo: Number(f.match_no),
    stage: f.stage,
    round: f.round_number == null ? null : Number(f.round_number),
    group: f.group_name || null,
    opponent: (mine1 ? f.team2_name : f.team1_name) || null,
    opponentId: (mine1 ? f.team2_id : f.team1_id) ? Number(mine1 ? f.team2_id : f.team1_id) : null,
    date: dayText(f.match_date),
    time: timeText(f.match_time),
    status: f.status,
  };
};

/* ------------------------------------------------------------------------------------------------ */

/** Teams the host can bring in: registered teams that are not in this tournament and are not banned. */
exports.candidates = async (tournamentId, hostAdminId, q) => {
  await lockTournament(db, tournamentId, hostAdminId);
  const text = String(q || "").trim().replace(/[%_]/g, "");
  const [rows] = await db.query(
    `SELECT t.id, t.team_name, t.logo,
            (SELECT COUNT(*) FROM players_core p WHERE p.team_id = t.id) AS players
     FROM teams t
     WHERE NOT EXISTS (SELECT 1 FROM tournament_participants tp WHERE tp.tournament_id = ? AND tp.team_id = t.id AND tp.status NOT IN ('cancelled', 'rejected'))
       AND NOT ${ACTIVE_BAN}
       ${text ? "AND t.team_name LIKE ?" : ""}
     ORDER BY t.team_name LIMIT 60`,
    text ? [tournamentId, `%${text}%`] : [tournamentId]
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.team_name, logo: r.logo || null, players: Number(r.players) }));
};

/** What swapping this team out would do, before the host confirms. */
exports.preview = async (tournamentId, hostAdminId, outTeamId) => {
  const tournament = await lockTournament(db, tournamentId, hostAdminId);
  const [partRows] = await db.query(
    `SELECT tp.group_name, tp.status, t.team_name FROM tournament_participants tp JOIN teams t ON t.id = tp.team_id
     WHERE tp.tournament_id = ? AND tp.team_id = ? AND tp.status NOT IN ('cancelled', 'rejected')`,
    [tournamentId, outTeamId]
  );
  const part = partRows[0];
  if (!part) throw new ScoringError("That team is not in this tournament", 404);
  const fixtures = await fixturesOf(db, tournamentId, outTeamId);
  const blocked = fixtures.filter(inProgress).map((f) => describe(f, outTeamId));
  return {
    tournamentId: Number(tournamentId),
    team: { id: Number(outTeamId), name: part.team_name, group: part.group_name || null, status: part.status },
    takesOver: fixtures.filter(open).map((f) => describe(f, outTeamId)),
    played: fixtures.filter((f) => f.status === "completed").map((f) => describe(f, outTeamId)),
    blocked,
    closed: CLOSED.has(tournament.status),
    canReplace: !blocked.length && !CLOSED.has(tournament.status),
  };
};

/** Every swap made in this tournament, newest first. */
exports.history = async (tournamentId, hostAdminId) => {
  await lockTournament(db, tournamentId, hostAdminId);
  let rows;
  try {
    [rows] = await db.query(
      `SELECT r.id, r.group_name, r.reason, r.fixtures_moved, r.created_at, r.out_team_id, r.in_team_id,
              o.team_name AS out_name, i.team_name AS in_name
       FROM tournament_replacements r JOIN teams o ON o.id = r.out_team_id JOIN teams i ON i.id = r.in_team_id
       WHERE r.tournament_id = ? ORDER BY r.id DESC`,
      [tournamentId]
    );
  } catch (err) {
    if (missingTable(err)) return []; // nothing has been replaced on a database that cannot record it
    throw err;
  }
  return rows.map((r) => ({
    id: Number(r.id), group: r.group_name || null, reason: r.reason || null, fixturesMoved: Number(r.fixtures_moved), at: r.created_at,
    out: { id: Number(r.out_team_id), name: r.out_name }, in: { id: Number(r.in_team_id), name: r.in_name },
  }));
};

/**
 * Put `inTeamId` where `outTeamId` was.
 * @returns { outTeam, inTeam, group, fixturesMoved, played }
 */
exports.replace = async (tournamentId, hostAdminId, { outTeamId, inTeamId, reason } = {}) => {
  const outId = int(outTeamId, "The team that is leaving");
  const inId = int(inTeamId, "The team that is coming in");
  if (outId === inId) throw new ScoringError("Choose a different team to bring in", 400);
  const why = reason ? String(reason).trim().slice(0, 300) : null;

  const conn = await db.getConnection();
  let result;
  try {
    await conn.beginTransaction();

    const tournament = await lockTournament(conn, tournamentId, hostAdminId);
    if (CLOSED.has(tournament.status)) throw new ScoringError("This tournament is finished, so teams can no longer be replaced", 409);

    const [outRows] = await conn.query(
      `SELECT tp.id, tp.group_name, tp.status, t.team_name FROM tournament_participants tp JOIN teams t ON t.id = tp.team_id
       WHERE tp.tournament_id = ? AND tp.team_id = ? AND tp.status NOT IN ('cancelled', 'rejected') FOR UPDATE`,
      [tournamentId, outId]
    );
    if (!outRows.length) throw new ScoringError("The team that is leaving is not in this tournament", 404);
    const out = outRows[0];

    const [inTeams] = await conn.query(`SELECT id, team_name FROM teams WHERE id = ?`, [inId]);
    if (!inTeams.length) throw new ScoringError("The team that is coming in does not exist", 404);
    const inName = inTeams[0].team_name;

    const [already] = await conn.query(
      `SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ? AND status NOT IN ('cancelled', 'rejected')`,
      [tournamentId, inId]
    );
    if (already.length) throw new ScoringError(`${inName} is already playing in this tournament`, 409);
    await banService.assertTeamNotBanned(conn, inId, "play in a tournament", inName);

    const fixtures = await fixturesOf(conn, tournamentId, outId);
    const blocked = fixtures.filter(inProgress);
    if (blocked.length) {
      throw new ScoringError(`${out.team_name} has a match that has already started (Match ${blocked[0].match_no}). Finish or abandon it first.`, 409);
    }
    const moving = fixtures.filter(open);
    const played = fixtures.filter((f) => f.status === "completed").length;

    // the new team: a fresh row, or the old one again if it had withdrawn earlier (the pair is unique)
    const [back] = await conn.query(`SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ?`, [tournamentId, inId]);
    if (back.length) {
      await conn.query(`UPDATE tournament_participants SET group_name = ?, status = ? WHERE id = ?`, [out.group_name, out.status, back[0].id]);
    } else {
      await conn.query(`INSERT INTO tournament_participants (tournament_id, team_id, group_name, status, created_at) VALUES (?, ?, ?, ?, NOW())`, [tournamentId, inId, out.group_name, out.status]);
    }
    await conn.query(`UPDATE tournament_participants SET status = 'cancelled', group_name = NULL WHERE id = ?`, [out.id]);

    // the matches nobody has started
    if (moving.length) {
      const ids = moving.map((f) => Number(f.id));
      await conn.query(`UPDATE tournament_matches SET team1_id = ? WHERE id IN (?) AND team1_id = ?`, [inId, ids, outId]);
      await conn.query(`UPDATE tournament_matches SET team2_id = ? WHERE id IN (?) AND team2_id = ?`, [inId, ids, outId]);
      await conn.query(`DELETE FROM match_squads WHERE team_id = ? AND tournament_match_id IN (?)`, [outId, ids]);
    }

    await conn.query(
      `INSERT INTO tournament_replacements (tournament_id, out_team_id, in_team_id, group_name, reason, fixtures_moved, replaced_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tournamentId, outId, inId, out.group_name, why, moving.length, hostAdminId]
    );

    await conn.commit();
    result = {
      tournament,
      outTeam: { id: outId, name: out.team_name },
      inTeam: { id: inId, name: inName },
      group: out.group_name || null,
      fixturesMoved: moving.length,
      played,
      moving,
    };
  } catch (err) {
    await conn.rollback();
    if (missingTable(err)) throw new ScoringError(NEEDS_UPGRADE, 500);
    throw err;
  } finally {
    conn.release();
  }

  await tellEveryone(result, why).catch((err) => {
    if (process.env.NODE_ENV !== "test") console.error("Team replaced, but the teams could not be notified:", err.message);
  });
  const { tournament, moving, ...answer } = result;
  return answer;
};

async function tellEveryone({ tournament, outTeam, inTeam, group, moving }, reason) {
  const link = `tournament:${tournament.id}`;
  const key = `replace:${tournament.id}:${outTeam.id}:${inTeam.id}`;
  const where = group ? ` in group ${group}` : "";

  const next = moving[0];
  const nextText = next
    ? ` Your first match: Match ${next.match_no} vs ${Number(next.team1_id) === outTeam.id ? next.team2_name : next.team1_name || "a team still to be decided"}${next.match_date ? `, ${dayText(next.match_date)}${timeText(next.match_time) ? ` ${timeText(next.match_time)}` : ""}` : ""}.`
    : "";
  await notifications.notifyTeams(db, [inTeam.id], {
    type: "team_replaced_in",
    title: `You are in: ${tournament.name}`,
    body: `You take the place of ${outTeam.name}${where}.${nextText} Name your squad before the toss.`,
    link,
    dedupeKey: key,
  });
  await notifications.notifyTeams(db, [outTeam.id], {
    type: "team_replaced_out",
    title: `Your place in ${tournament.name} was given away`,
    body: `The host replaced ${outTeam.name} with ${inTeam.name}.${reason ? ` Reason noted: ${reason}` : ""}`,
    link,
    dedupeKey: key,
  });
  const opponents = [...new Set(moving.map((f) => (Number(f.team1_id) === outTeam.id ? f.team2_id : f.team1_id)).filter(Boolean).map(Number))];
  await notifications.notifyTeams(db, opponents, {
    type: "opponent_changed",
    title: `Your opponent changed: ${tournament.name}`,
    body: `${inTeam.name} now plays in place of ${outTeam.name}${where}. Your match times are unchanged.`,
    link,
    dedupeKey: key,
  });
}

exports._test = { inProgress, open };
