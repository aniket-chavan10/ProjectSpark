// Host-side match scheduling: build the fixtures from the groups, auto-plan the times, check the
// schedule and save it. The rules live in utils/tournamentFormat.js and utils/scheduleRules.js.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const format = require("../utils/tournamentFormat");
const rules = require("../utils/scheduleRules");

const pad = (n) => String(n).padStart(2, "0");

// mysql2 hands DATE / DATETIME columns back as local Date objects
const dateOnly = (v) => {
  if (!v) return null;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  return String(v).slice(0, 10);
};
const timeOnly = (v) => {
  if (!v) return null;
  if (v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
  const m = /(\d{1,2}):(\d{2})/.exec(String(v));
  return m ? `${pad(m[1])}:${m[2]}` : null;
};

const DEFAULT_SETTINGS = {
  dayStart: "07:30",
  dayEnd: "19:30",
  breakStart: "13:00",
  breakEnd: "13:30",
  gapMinutes: 5,
  restFriendly: true,
  minRestMinutes: 30,
};

/* ------------------------------- loading ------------------------------- */

async function assertOrganizer(conn, tournamentId, organizerAdminId) {
  const [rows] = await conn.query(
    `SELECT id, name, venue, start_date, end_date, status, organizer_admin_id FROM tournaments WHERE id = ?`,
    [tournamentId]
  );
  if (!rows.length) throw new ScoringError("Tournament not found", 404);
  if (Number(rows[0].organizer_admin_id) !== Number(organizerAdminId)) {
    throw new ScoringError("Only the hosting team can do this", 403);
  }
  return rows[0];
}

async function loadSavedMatches(conn, tournamentId) {
  const [rows] = await conn.query(
    `SELECT id, match_id, match_no, stage, round_number, group_name, team1_id, team2_id, match_date, match_time,
            overs, duration_minutes, venue, status, dependent_match1_id, dependent_match2_id
     FROM tournament_matches WHERE tournament_id = ? ORDER BY match_no`,
    [tournamentId]
  );
  return rows;
}

/** Teams that were put in a group, grouped and in the order the host arranged the first round. */
async function loadGroups(conn, tournamentId, savedMatches) {
  const [rows] = await conn.query(
    `SELECT tp.team_id AS id, tp.group_name, tm.team_name AS name, tm.logo
     FROM tournament_participants tp JOIN teams tm ON tm.id = tp.team_id
     WHERE tp.tournament_id = ? AND tp.group_name IS NOT NULL AND tp.status NOT IN ('cancelled', 'rejected')
     ORDER BY tp.group_name, tm.team_name`,
    [tournamentId]
  );
  const groups = {};
  rows.forEach((r) => {
    (groups[r.group_name] ||= { group_name: r.group_name, teams: [] }).teams.push({ id: r.id, name: r.name, logo: r.logo });
  });

  // a saved schedule keeps the pairing the host chose: first-round matches in match order
  savedMatches
    .filter((m) => m.stage === "group" && Number(m.round_number) === 1 && m.team1_id && m.team2_id && groups[m.group_name])
    .forEach((m) => {
      const g = groups[m.group_name];
      g.__order ||= [];
      g.__order.push(m.team1_id, m.team2_id);
    });
  return Object.values(groups).map((g) => {
    const order = g.__order;
    if (!order || order.length !== g.teams.length) return { group_name: g.group_name, teams: g.teams };
    const byId = Object.fromEntries(g.teams.map((t) => [String(t.id), t]));
    const ordered = order.map((id) => byId[String(id)]);
    return { group_name: g.group_name, teams: ordered.every(Boolean) ? ordered : g.teams };
  });
}

/** Apply the host's arrangement ({ A: [teamId, ...] }) to the groups; teams must be exactly the same set. */
function applyGroupOrders(groups, groupOrders = {}) {
  return groups.map((g) => {
    const wanted = groupOrders[g.group_name];
    if (!wanted) return g;
    const byId = Object.fromEntries(g.teams.map((t) => [String(t.id), t]));
    const same = wanted.length === g.teams.length && new Set(wanted.map(String)).size === wanted.length && wanted.every((id) => byId[String(id)]);
    if (!same) throw new ScoringError(`The team order for group ${g.group_name} does not match its teams`);
    return { group_name: g.group_name, teams: wanted.map((id) => byId[String(id)]) };
  });
}

function inferStructure(savedMatches) {
  if (!savedMatches.length) return { semiPairs: null, thirdPlaceMatch: false };
  const byId = Object.fromEntries(savedMatches.map((m) => [m.id, m]));
  const semis = savedMatches.filter((m) => m.stage === "semi").sort((a, b) => a.match_no - b.match_no);
  const groupOfFeeder = (id) => (byId[id] ? byId[id].group_name : null);
  const semiPairs = semis.length === 2 ? semis.map((s) => [groupOfFeeder(s.dependent_match1_id), groupOfFeeder(s.dependent_match2_id)]) : null;
  return { semiPairs, thirdPlaceMatch: savedMatches.some((m) => m.stage === "third_place") };
}

const isStarted = (m) => !!m.match_id || (m.status && m.status !== "scheduled");

/* --------------------------------- plan --------------------------------- */

/** Everything the schedule screen needs to open. */
exports.getSchedulePlan = async (tournamentId, organizerAdminId) => {
  const tournament = await assertOrganizer(db, tournamentId, organizerAdminId);
  const saved = await loadSavedMatches(db, tournamentId);
  const groups = await loadGroups(db, tournamentId, saved);
  const startDate = dateOnly(tournament.start_date);
  const endDate = dateOnly(tournament.end_date);
  const days = rules.daysBetween(startDate, endDate);
  const structure = inferStructure(saved);

  let fixtures = null;
  let slots = null;
  if (saved.length) {
    fixtures = format.buildFixtures(groups, structure).matches;
    const byNo = Object.fromEntries(saved.map((m) => [m.match_no, m]));
    slots = fixtures.map((f) => {
      const row = byNo[f.match_no];
      return {
        match_no: f.match_no,
        match_date: row ? dateOnly(row.match_date) : null,
        start_time: row ? timeOnly(row.match_time) : null,
        duration_minutes: row ? row.duration_minutes : null,
        overs: row ? row.overs : null,
      };
    });
  }

  return {
    tournament: { id: tournament.id, name: tournament.name, venue: tournament.venue, start_date: startDate, end_date: endDate },
    days,
    groups,
    defaults: { ...DEFAULT_SETTINGS, overs: rules.DEFAULT_OVERS },
    saved: saved.length > 0,
    locked: saved.some(isStarted),
    semiPairs: structure.semiPairs || format.defaultSemiPairs(groups.map((g) => g.group_name)),
    thirdPlaceMatch: structure.thirdPlaceMatch,
    fixtures,
    slots,
  };
};

async function buildContext(tournamentId, organizerAdminId, body = {}) {
  const tournament = await assertOrganizer(db, tournamentId, organizerAdminId);
  const saved = await loadSavedMatches(db, tournamentId);
  if (saved.some(isStarted)) throw new ScoringError("Matches have already started, so the schedule can no longer be changed", 409);

  const groups = applyGroupOrders(await loadGroups(db, tournamentId, saved), body.groupOrders);
  const { matches: fixtures } = format.buildFixtures(groups, {
    semiPairs: body.semiPairs,
    thirdPlaceMatch: !!body.thirdPlaceMatch,
  });
  const startDate = dateOnly(tournament.start_date);
  const endDate = dateOnly(tournament.end_date);
  return { tournament, fixtures, groups, startDate, endDate, days: rules.daysBetween(startDate, endDate) };
}

const mergeSlots = (fixtures, slots = []) => {
  const byNo = Object.fromEntries(slots.map((s) => [s.match_no, s]));
  return fixtures.map((f) => ({ ...f, ...(byNo[f.match_no] || {}) }));
};

function checkAgainstRules(merged, ctx, settings = {}) {
  return rules.validateSchedule(merged, {
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    dayStart: settings.dayStart || DEFAULT_SETTINGS.dayStart,
    dayEnd: settings.dayEnd || DEFAULT_SETTINGS.dayEnd,
    minRestMinutes: settings.minRestMinutes ?? DEFAULT_SETTINGS.minRestMinutes,
  });
}

/** Auto-fill: lay all matches out on the tournament days. */
exports.previewSchedule = async (tournamentId, organizerAdminId, body = {}) => {
  const ctx = await buildContext(tournamentId, organizerAdminId, body);
  const settings = { ...DEFAULT_SETTINGS, ...(body.settings || {}) };
  settings.days = settings.days && settings.days.length ? settings.days : ctx.days;
  const plan = rules.autoPlan(ctx.fixtures, settings);
  const merged = mergeSlots(ctx.fixtures, plan.slots);
  const { errors, warnings } = checkAgainstRules(merged, ctx, settings);
  return {
    fixtures: ctx.fixtures,
    slots: plan.slots,
    fits: plan.fits,
    overflowMinutes: plan.overflowMinutes,
    totalMinutes: plan.totalMinutes,
    errors,
    warnings,
    summary: rules.summarize(plan.slots),
  };
};

/** Check a hand-edited schedule without saving it. */
exports.checkSchedule = async (tournamentId, organizerAdminId, body = {}) => {
  const ctx = await buildContext(tournamentId, organizerAdminId, body);
  const merged = mergeSlots(ctx.fixtures, body.slots);
  const { errors, warnings } = checkAgainstRules(merged, ctx, body.settings);
  return { errors, warnings, summary: rules.summarize(merged.filter((m) => m.match_date)) };
};

/** Save the schedule: structure from the groups, times from the host. All or nothing. */
exports.saveSchedule = async (tournamentId, organizerAdminId, body = {}) => {
  const ctx = await buildContext(tournamentId, organizerAdminId, body);
  const merged = mergeSlots(ctx.fixtures, body.slots);
  const { errors, warnings } = checkAgainstRules(merged, ctx, body.settings);
  if (errors.length) {
    const err = new ScoringError(errors[0].message + (errors.length > 1 ? ` (and ${errors.length - 1} more problem${errors.length > 2 ? "s" : ""})` : ""), 422);
    err.details = { errors, warnings };
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // lock the tournament and re-check nothing has started while we were checking
    await conn.query(`SELECT id FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    const existing = await loadSavedMatches(conn, tournamentId);
    if (existing.some(isStarted)) throw new ScoringError("Matches have already started, so the schedule can no longer be changed", 409);
    await conn.query(`DELETE FROM tournament_matches WHERE tournament_id = ?`, [tournamentId]);

    const idByNo = {};
    for (const m of merged) {
      const [res] = await conn.query(
        `INSERT INTO tournament_matches
          (match_no, tournament_id, stage, round_number, group_name, team1_id, team2_id, match_date, match_time,
           venue, overs, duration_minutes, dependent_match1_id, dependent_match1_type,
           dependent_match2_id, dependent_match2_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
        [
          m.match_no,
          tournamentId,
          m.stage,
          m.round,
          m.group,
          m.team1Id,
          m.team2Id,
          m.match_date,
          `${m.match_date} ${m.start_time}:00`,
          (m.venue && String(m.venue).trim()) || ctx.tournament.venue || null,
          m.overs ?? null,
          m.duration_minutes,
          m.dep1 ? idByNo[m.dep1.matchNo] : null,
          m.dep1 ? m.dep1.type : "winner",
          m.dep2 ? idByNo[m.dep2.matchNo] : null,
          m.dep2 ? m.dep2.type : "winner",
        ]
      );
      idByNo[m.match_no] = res.insertId; // feeders always have a lower number, so their ids exist already
    }

    const [progress] = await conn.query(`UPDATE tournament_progress SET groups_created = 1, schedule_created = 1, last_updated = NOW() WHERE tournament_id = ?`, [tournamentId]);
    if (!progress.affectedRows) {
      await conn.query(
        `INSERT INTO tournament_progress (tournament_id, teams_created, groups_created, schedule_created, matches_started, last_updated) VALUES (?, 1, 1, 1, 0, NOW())`,
        [tournamentId]
      );
    }
    await conn.commit();
    return { saved: merged.length, warnings };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/* ------------------------------- standings ------------------------------- */

exports.getStandings = async (tournamentId) => {
  const [matches] = await db.query(
    `SELECT match_no, stage, status, team1_id, team2_id, winner_team_id FROM tournament_matches WHERE tournament_id = ? ORDER BY match_no`,
    [tournamentId]
  );
  const positions = format.computeStandings(matches);
  if (!positions.length) return { positions: [], hasThirdPlaceMatch: matches.some((m) => m.stage === "third_place") };
  const [teams] = await db.query(`SELECT id, team_name, logo FROM teams WHERE id IN (?)`, [positions.map((p) => p.teamId)]);
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));
  return {
    hasThirdPlaceMatch: matches.some((m) => m.stage === "third_place"),
    positions: positions.map((p) => ({ ...p, teamName: byId[p.teamId]?.team_name || null, logo: byId[p.teamId]?.logo || null })),
  };
};

exports.assertOrganizer = (tournamentId, organizerAdminId) => assertOrganizer(db, tournamentId, organizerAdminId);
