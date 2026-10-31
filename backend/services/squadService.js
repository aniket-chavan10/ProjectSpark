// A team declares a squad for a tournament: a playing XI (in batting order) and up to 4 reserves. For any single
// match the team can change it until that match's toss; at the toss the squads of both teams are frozen.
// Every function works on ONE team (the logged-in team admin's); the team is never taken from the request body.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");

const LIMITS = { playingMax: 11, playingMin: 2, reservesMax: 4 };

const isBanned = (p, now = new Date()) => !!p.is_banned && (!p.banned_until || new Date(p.banned_until) > now);

/* ------------------------------- validation ------------------------------- */

const toIds = (list, name) => {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw new ScoringError(`${name} must be a list of players`);
  return list.map((v) => {
    const id = Number(typeof v === "object" && v !== null ? v.playerId : v);
    if (!Number.isInteger(id) || id <= 0) throw new ScoringError(`${name} has an invalid player`);
    return id;
  });
};

/**
 * Check a squad against the rules and return it in the shape that is stored.
 * @param input   { playing: [playerId...] (batting order), reserves: [playerId...], captainId, keeperId, jerseys: { playerId: n } }
 * @param players the team's players (rows of players_core)
 */
function validateSquad(input, players) {
  const playing = toIds(input.playing, "The playing XI");
  const reserves = toIds(input.reserves, "The reserves");
  const all = [...playing, ...reserves];

  if (new Set(all).size !== all.length) throw new ScoringError("A player can only be in the squad once (playing or reserve)");
  if (playing.length > LIMITS.playingMax) throw new ScoringError(`The playing XI can have at most ${LIMITS.playingMax} players`);
  if (playing.length < LIMITS.playingMin) throw new ScoringError(`Choose at least ${LIMITS.playingMin} players for the playing XI`);
  if (reserves.length > LIMITS.reservesMax) throw new ScoringError(`You can name at most ${LIMITS.reservesMax} reserves`);

  const byId = Object.fromEntries(players.map((p) => [Number(p.player_id), p]));
  all.forEach((id) => {
    const p = byId[id];
    if (!p) throw new ScoringError("A chosen player does not belong to your team");
    if (isBanned(p)) throw new ScoringError(`${p.players_name} is banned and cannot be picked`);
  });

  const captainId = input.captainId ? Number(input.captainId) : null;
  const keeperId = input.keeperId ? Number(input.keeperId) : null;
  if (captainId && !playing.includes(captainId)) throw new ScoringError("The captain must be in the playing XI");
  if (keeperId && !playing.includes(keeperId)) throw new ScoringError("The wicket-keeper must be in the playing XI");

  const jerseys = input.jerseys || {};
  const jerseyOf = (id) => {
    const raw = jerseys[id];
    if (raw === undefined || raw === null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 999) throw new ScoringError("A jersey number must be between 0 and 999");
    return n;
  };
  const used = all.map(jerseyOf).filter((n) => n !== null);
  if (new Set(used).size !== used.length) throw new ScoringError("Two players have the same jersey number");

  return [
    ...playing.map((id, i) => ({ playerId: id, role: "playing", order: i + 1, jersey: jerseyOf(id), captain: id === captainId, keeper: id === keeperId })),
    ...reserves.map((id) => ({ playerId: id, role: "reserve", order: null, jersey: jerseyOf(id), captain: false, keeper: false })),
  ];
}

/* --------------------------------- loading --------------------------------- */

const loadPlayers = async (conn, teamId) => {
  const [rows] = await conn.query(
    `SELECT player_id, players_name, mobile_number, profile_picture, is_banned, banned_until FROM players_core WHERE team_id = ? ORDER BY players_name`,
    [teamId]
  );
  return rows;
};

const playerCards = (rows) =>
  rows.map((p) => ({ id: Number(p.player_id), name: p.players_name, mobile: p.mobile_number || null, photo: p.profile_picture || null, banned: isBanned(p) }));

// rows of a squad table -> what the editor and the app use
const toSquad = (rows) => {
  const sorted = [...rows].sort((a, b) => (a.batting_order || 99) - (b.batting_order || 99) || a.player_id - b.player_id);
  const playing = sorted.filter((r) => r.role === "playing");
  return {
    playing: playing.map((r) => ({ playerId: Number(r.player_id), jersey: r.jersey_number ?? null, isCaptain: !!r.is_captain, isKeeper: !!r.is_keeper })),
    reserves: sorted.filter((r) => r.role === "reserve").map((r) => ({ playerId: Number(r.player_id), jersey: r.jersey_number ?? null })),
  };
};

const fromSquad = (squad) => ({
  playing: squad.playing.map((p) => p.playerId),
  reserves: squad.reserves.map((p) => p.playerId),
  captainId: (squad.playing.find((p) => p.isCaptain) || {}).playerId || null,
  keeperId: (squad.playing.find((p) => p.isKeeper) || {}).playerId || null,
  jerseys: Object.fromEntries([...squad.playing, ...squad.reserves].filter((p) => p.jersey !== null && p.jersey !== undefined).map((p) => [p.playerId, p.jersey])),
});

const SQUAD_COLS = "player_id, role, batting_order, jersey_number, is_captain, is_keeper";

async function tournamentRows(conn, tournamentId, teamId) {
  const [rows] = await conn.query(`SELECT ${SQUAD_COLS} FROM tournament_squads WHERE tournament_id = ? AND team_id = ?`, [tournamentId, teamId]);
  return rows;
}

async function matchRows(conn, fixtureId, teamId) {
  const [rows] = await conn.query(`SELECT ${SQUAD_COLS} FROM match_squads WHERE tournament_match_id = ? AND team_id = ?`, [fixtureId, teamId]);
  return rows;
}

async function loadTournament(conn, tournamentId, teamId) {
  const [rows] = await conn.query(`SELECT id, name, start_date, end_date, status FROM tournaments WHERE id = ?`, [tournamentId]);
  if (!rows.length) throw new ScoringError("Tournament not found", 404);
  const [entry] = await conn.query(
    `SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ? AND status NOT IN ('cancelled', 'rejected')`,
    [tournamentId, teamId]
  );
  if (!entry.length) throw new ScoringError("Your team is not registered in this tournament", 403);
  return rows[0];
}

async function loadFixture(conn, fixtureId, teamId) {
  const [rows] = await conn.query(
    `SELECT tm.id, tm.tournament_id, tm.match_no, tm.stage, tm.group_name, tm.team1_id, tm.team2_id, tm.match_id, tm.status,
            DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date_str, DATE_FORMAT(tm.match_time, '%H:%i') AS start_time_str
     FROM tournament_matches tm WHERE tm.id = ?`,
    [fixtureId]
  );
  if (!rows.length) throw new ScoringError("Match not found", 404);
  const f = rows[0];
  if (Number(f.team1_id) !== Number(teamId) && Number(f.team2_id) !== Number(teamId)) throw new ScoringError("Your team is not playing in this match", 403);
  return f;
}

const matchLock = (f) => (f.match_id || (f.status && f.status !== "scheduled") ? "The toss is done, so the squads are locked." : null);

const savePayload = (extra) => ({ limits: LIMITS, ...extra });

/* ------------------------------ tournament squad ------------------------------ */

exports.getTournamentSquad = async (tournamentId, teamId) => {
  const tournament = await loadTournament(db, tournamentId, teamId);
  const players = await loadPlayers(db, teamId);
  const rows = await tournamentRows(db, tournamentId, teamId);
  return savePayload({
    scope: "tournament",
    tournament: { id: tournament.id, name: tournament.name },
    players: playerCards(players),
    squad: toSquad(rows),
    submitted: rows.some((r) => r.role === "playing"),
    locked: null,
  });
};

async function replaceRows(conn, table, keyCol, keyValue, teamId, squad) {
  await conn.query(`DELETE FROM ${table} WHERE ${keyCol} = ? AND team_id = ?`, [keyValue, teamId]);
  for (const r of squad) {
    await conn.query(
      `INSERT INTO ${table} (${keyCol}, team_id, player_id, role, batting_order, jersey_number, is_captain, is_keeper) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [keyValue, teamId, r.playerId, r.role, r.order, r.jersey, r.captain ? 1 : 0, r.keeper ? 1 : 0]
    );
  }
}

async function inTransaction(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

exports.saveTournamentSquad = async (tournamentId, teamId, input) => {
  await loadTournament(db, tournamentId, teamId);
  const players = await loadPlayers(db, teamId);
  const squad = validateSquad(input || {}, players);
  await inTransaction((conn) => replaceRows(conn, "tournament_squads", "tournament_id", tournamentId, teamId, squad));
  return exports.getTournamentSquad(tournamentId, teamId);
};

/* --------------------------------- one match --------------------------------- */

/** The squad this team has for a match: its own for the match if it changed it, else the tournament squad. */
exports.getMatchSquad = async (fixtureId, teamId) => {
  const fixture = await loadFixture(db, fixtureId, teamId);
  const players = await loadPlayers(db, teamId);
  const own = await matchRows(db, fixtureId, teamId);
  const fromTournament = own.length ? [] : await tournamentRows(db, fixture.tournament_id, teamId);
  const rows = own.length ? own : fromTournament;
  return savePayload({
    scope: "match",
    match: { id: fixture.id, matchNo: fixture.match_no, stage: fixture.stage, group: fixture.group_name, date: fixture.match_date_str, time: fixture.start_time_str, status: fixture.status },
    players: playerCards(players),
    squad: toSquad(rows),
    source: own.length ? "match" : fromTournament.length ? "tournament" : "none",
    submitted: rows.some((r) => r.role === "playing"),
    locked: matchLock(fixture),
  });
};

exports.saveMatchSquad = async (fixtureId, teamId, input) => {
  const fixture = await loadFixture(db, fixtureId, teamId);
  const lock = matchLock(fixture);
  if (lock) throw new ScoringError(lock, 409);
  const players = await loadPlayers(db, teamId);
  const squad = validateSquad(input || {}, players);
  await inTransaction((conn) => replaceRows(conn, "match_squads", "tournament_match_id", fixtureId, teamId, squad));
  return exports.getMatchSquad(fixtureId, teamId);
};

/** Go back to the tournament squad for this match. */
exports.resetMatchSquad = async (fixtureId, teamId) => {
  const fixture = await loadFixture(db, fixtureId, teamId);
  const lock = matchLock(fixture);
  if (lock) throw new ScoringError(lock, 409);
  await db.query(`DELETE FROM match_squads WHERE tournament_match_id = ? AND team_id = ?`, [fixtureId, teamId]);
  return exports.getMatchSquad(fixtureId, teamId);
};

/* ----------------------------------- lists ----------------------------------- */

/** Tournaments the team has entered, with whether it has declared a squad. */
exports.listMyTournaments = async (teamId) => {
  const [rows] = await db.query(
    `SELECT t.id, t.name, t.start_date, t.end_date, t.status,
            (SELECT COUNT(*) FROM tournament_squads ts WHERE ts.tournament_id = t.id AND ts.team_id = ? AND ts.role = 'playing') AS xi
     FROM tournament_participants tp JOIN tournaments t ON t.id = tp.tournament_id
     WHERE tp.team_id = ? AND tp.status NOT IN ('cancelled', 'rejected')
     ORDER BY t.start_date DESC`,
    [teamId, teamId]
  );
  return rows.map((r) => ({ id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, status: r.status, squadSubmitted: Number(r.xi) > 0, playingCount: Number(r.xi) }));
};

/** The team's own fixtures in a tournament, each with the state of its squad. */
exports.listMyMatches = async (tournamentId, teamId) => {
  await loadTournament(db, tournamentId, teamId);
  const [rows] = await db.query(
    `SELECT tm.id, tm.match_no, tm.stage, tm.group_name, tm.team1_id, tm.team2_id, tm.match_id, tm.status,
            DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date_str, DATE_FORMAT(tm.match_time, '%H:%i') AS start_time_str,
            t1.team_name AS team1_name, t2.team_name AS team2_name,
            (SELECT COUNT(*) FROM match_squads ms WHERE ms.tournament_match_id = tm.id AND ms.team_id = ? AND ms.role = 'playing') AS match_xi
     FROM tournament_matches tm
     LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id
     WHERE tm.tournament_id = ? AND (tm.team1_id = ? OR tm.team2_id = ?)
     ORDER BY tm.match_no`,
    [teamId, tournamentId, teamId, teamId]
  );
  const [[ts]] = await db.query(`SELECT COUNT(*) AS n FROM tournament_squads WHERE tournament_id = ? AND team_id = ? AND role = 'playing'`, [tournamentId, teamId]);
  const tournamentXi = Number(ts.n);
  return rows.map((r) => ({
    id: r.id,
    matchNo: r.match_no,
    stage: r.stage,
    group: r.group_name,
    date: r.match_date_str,
    time: r.start_time_str,
    status: r.status,
    opponent: Number(r.team1_id) === Number(teamId) ? r.team2_name : r.team1_name,
    squadSource: Number(r.match_xi) > 0 ? "match" : tournamentXi > 0 ? "tournament" : "none",
    locked: matchLock({ match_id: r.match_id, status: r.status }),
  }));
};

/* ----------------------------------- the toss ----------------------------------- */

/**
 * At the toss both squads are frozen into match_squads. A team that changed its XI for the match keeps that,
 * otherwise its tournament squad is copied, otherwise (older data) its playing XI from the old table.
 * A team with nobody to play is refused so the match can never start without players.
 */
exports.freezeMatchSquads = async (conn, fixtureId, tournamentId, teams) => {
  for (const team of teams) {
    const own = await matchRows(conn, fixtureId, team.id);
    if (own.some((r) => r.role === "playing")) continue;

    let rows = await tournamentRows(conn, tournamentId, team.id);
    if (!rows.some((r) => r.role === "playing")) {
      const [legacy] = await conn.query(
        `SELECT p.player_id, 'playing' AS role, NULL AS batting_order, NULL AS jersey_number, 0 AS is_captain, 0 AS is_keeper
         FROM teams_squad ts JOIN players_core p ON p.player_id = ts.player_id WHERE ts.team_id = ? AND ts.is_playing = 1`,
        [team.id]
      );
      rows = legacy.map((r, i) => ({ ...r, batting_order: i + 1 }));
    }
    if (rows.filter((r) => r.role === "playing").length < LIMITS.playingMin) {
      throw new ScoringError(`${team.name || "A team"} has not named its playing XI yet. The team admin must choose it before the toss.`, 409);
    }
    await conn.query(`DELETE FROM match_squads WHERE tournament_match_id = ? AND team_id = ?`, [fixtureId, team.id]);
    for (const r of rows) {
      await conn.query(
        `INSERT INTO match_squads (tournament_match_id, team_id, player_id, role, batting_order, jersey_number, is_captain, is_keeper) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [fixtureId, team.id, r.player_id, r.role, r.batting_order ?? null, r.jersey_number ?? null, r.is_captain ? 1 : 0, r.is_keeper ? 1 : 0]
      );
    }
  }
};

/** Squads of both teams for the fixture page (scorer and host): the effective XI and reserves per team. */
exports.getFixtureSquads = async (conn, fixtureId, tournamentId, teams) => {
  const out = {};
  for (const team of teams) {
    const own = await matchRows(conn, fixtureId, team.id);
    const rows = own.length ? own : await tournamentRows(conn, tournamentId, team.id);
    const [players] = await conn.query(`SELECT player_id, players_name, profile_picture FROM players_core WHERE team_id = ?`, [team.id]);
    const byId = Object.fromEntries(players.map((p) => [Number(p.player_id), p]));
    const squad = toSquad(rows);
    const card = (r, role) => (byId[r.playerId] ? { player_id: r.playerId, players_name: byId[r.playerId].players_name, profile_picture: byId[r.playerId].profile_picture, jersey_number: r.jersey, is_captain: !!r.isCaptain, is_keeper: !!r.isKeeper, role } : null);
    out[team.id] = {
      source: own.length ? "match" : rows.length ? "tournament" : "none",
      playing: squad.playing.map((r) => card(r, "playing")).filter(Boolean),
      reserves: squad.reserves.map((r) => card(r, "reserve")).filter(Boolean),
    };
  }
  return out;
};

exports.LIMITS = LIMITS;
exports.validateSquad = validateSquad;
exports.fromSquad = fromSquad;
