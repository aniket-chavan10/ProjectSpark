// Ranking points, like the ICC table: a team earns points for every round it clears in a tournament
// (and a little for taking part). Points are written to team_points when a match completes and
// taken back if the last ball is undone, so the table always matches the results.
//
// A match win is worth the rule of the round it was played in:
//   group matches : round1, round2, round3, and the last round of the group = group_final
//   knock-outs    : semi, final, third_place
// The association can change the values; "recalculate" rewrites every past result with the new values.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");

const MAX_PLAIN_ROUND = 3;

/** Which rule a win in this fixture earns. `lastRound` = last round number of the fixture's group. */
function ruleKeyFor(fixture, lastRound) {
  if (fixture.stage === "semi") return "semi";
  if (fixture.stage === "final") return "final";
  if (fixture.stage === "third_place") return "third_place";
  const round = Number(fixture.round_number) || 1;
  if (lastRound && round >= lastRound && lastRound > 1) return "group_final";
  return `round${Math.min(round, MAX_PLAIN_ROUND)}`;
}

/** Pure: rank rows by points, then titles, then wins, then name. Equal rows share a rank. */
function assignRanks(rows) {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || b.titles - a.titles || b.won - a.won || String(a.name).localeCompare(String(b.name))
  );
  let rank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    const tied = prev && prev.points === r.points && prev.titles === r.titles && prev.won === r.won;
    if (!tied) rank = i + 1;
    return { ...r, rank };
  });
}

exports.ruleKeyFor = ruleKeyFor;
exports.assignRanks = assignRanks;

/* --------------------------------- rules --------------------------------- */

exports.getRules = async (conn = db) => {
  const [rows] = await conn.query(`SELECT rule_key, label, points FROM points_rules ORDER BY sort_order, rule_key`);
  return rows.map((r) => ({ ruleKey: r.rule_key, label: r.label, points: Number(r.points) }));
};

exports.updateRules = async (list) => {
  if (!Array.isArray(list) || !list.length) throw new ScoringError("Send the rules to change");
  const current = new Set((await exports.getRules()).map((r) => r.ruleKey));
  for (const r of list) {
    const points = Number(r.points);
    if (!current.has(r.ruleKey)) throw new ScoringError(`Unknown rule: ${r.ruleKey}`);
    if (!Number.isInteger(points) || points < 0 || points > 1000) throw new ScoringError("Points must be a whole number from 0 to 1000");
  }
  for (const r of list) await db.query(`UPDATE points_rules SET points = ? WHERE rule_key = ?`, [Number(r.points), r.ruleKey]);
  return exports.getRules();
};

/* ---------------------------- awarding / taking back ---------------------------- */

async function loadFixture(conn, matchId) {
  const [rows] = await conn.query(
    `SELECT tm.id, tm.tournament_id, tm.stage, tm.round_number, tm.group_name, tm.team1_id, tm.team2_id, tm.winner_team_id, t.start_date
     FROM tournament_matches tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.match_id = ? LIMIT 1`,
    [matchId]
  );
  return rows[0] || null;
}

const yearOf = (d) => (d instanceof Date ? d.getFullYear() : Number(String(d).slice(0, 4))) || new Date().getFullYear();

/** Write the points of a completed match (idempotent: calling it again rewrites the same rows). */
exports.awardForMatch = async (conn, matchId) => {
  const fixture = await loadFixture(conn, matchId);
  if (!fixture) return { awarded: 0 };
  const season = yearOf(fixture.start_date);
  const rules = Object.fromEntries((await exports.getRules(conn)).map((r) => [r.ruleKey, r.points]));

  let lastRound = null;
  if (fixture.stage === "group") {
    const [[row]] = await conn.query(`SELECT MAX(round_number) AS last FROM tournament_matches WHERE tournament_id = ? AND stage = 'group' AND group_name <=> ?`, [fixture.tournament_id, fixture.group_name]);
    lastRound = Number(row.last) || null;
  }

  await conn.query(`DELETE FROM team_points WHERE tournament_match_id = ?`, [fixture.id]);
  const rows = [];
  if (fixture.winner_team_id) {
    const key = ruleKeyFor(fixture, lastRound);
    rows.push([fixture.tournament_id, fixture.winner_team_id, fixture.id, key, rules[key] || 0, season]);
  }
  for (const teamId of [fixture.team1_id, fixture.team2_id].filter(Boolean)) {
    rows.push([fixture.tournament_id, teamId, 0, "participation", rules.participation || 0, season]);
  }
  await conn.query(
    `INSERT INTO team_points (tournament_id, team_id, tournament_match_id, rule_key, points, season_year) VALUES ?
     ON DUPLICATE KEY UPDATE points = VALUES(points), season_year = VALUES(season_year)`,
    [rows]
  );
  return { awarded: rows.length };
};

/** The last ball of a completed match was undone: its points go back out. */
exports.revokeForMatch = async (conn, matchId) => {
  const fixture = await loadFixture(conn, matchId);
  if (!fixture) return;
  await conn.query(`DELETE FROM team_points WHERE tournament_match_id = ?`, [fixture.id]);
  // "taking part" only stays if the team has another finished match in this tournament
  for (const teamId of [fixture.team1_id, fixture.team2_id].filter(Boolean)) {
    const [[other]] = await conn.query(
      `SELECT COUNT(*) AS n FROM tournament_matches WHERE tournament_id = ? AND id <> ? AND status = 'completed' AND (team1_id = ? OR team2_id = ?)`,
      [fixture.tournament_id, fixture.id, teamId, teamId]
    );
    if (!Number(other.n)) await conn.query(`DELETE FROM team_points WHERE tournament_id = ? AND team_id = ? AND tournament_match_id = 0 AND rule_key = 'participation'`, [fixture.tournament_id, teamId]);
  }
};

/** Re-run every completed match with the current rules (after the association changes them). */
exports.recalculateAll = async (conn = db) => {
  const [done] = await conn.query(`SELECT match_id FROM tournament_matches WHERE status = 'completed' AND match_id IS NOT NULL ORDER BY id`);
  await conn.query(`DELETE FROM team_points`);
  for (const m of done) await exports.awardForMatch(conn, m.match_id);
  return { matches: done.length };
};

/* --------------------------------- ranking --------------------------------- */

/** Years that have results, newest first (for the season picker). */
exports.seasons = async () => {
  const [rows] = await db.query(`SELECT DISTINCT season_year FROM team_points ORDER BY season_year DESC`);
  return rows.map((r) => Number(r.season_year));
};

/** @param season a year, or empty for all time */
exports.teamRankings = async ({ season, limit = 100 } = {}) => {
  const year = Number(season) || null;
  const [rows] = await db.query(
    `SELECT t.id, t.team_name, t.logo,
       (SELECT COALESCE(SUM(tp.points), 0) FROM team_points tp WHERE tp.team_id = t.id ${year ? "AND tp.season_year = ?" : ""}) AS points,
       (SELECT COUNT(*) FROM tournament_results r JOIN tournaments tt ON tt.id = r.tournament_id WHERE r.team_id = t.id AND r.position = 1 ${year ? "AND YEAR(tt.start_date) = ?" : ""}) AS titles,
       (SELECT COUNT(*) FROM matches m WHERE m.status = 'completed' AND (m.team1_id = t.id OR m.team2_id = t.id) ${year ? "AND YEAR(m.date) = ?" : ""}) AS played,
       (SELECT COUNT(*) FROM matches m WHERE m.status = 'completed' AND m.winner_team_id = t.id ${year ? "AND YEAR(m.date) = ?" : ""}) AS won
     FROM teams t`,
    year ? [year, year, year, year] : []
  );
  const ranked = assignRanks(
    rows
      .map((r) => ({ teamId: Number(r.id), name: r.team_name, logo: r.logo || null, points: Number(r.points), titles: Number(r.titles), played: Number(r.played), won: Number(r.won) }))
      .filter((r) => r.points > 0 || r.played > 0)
  );
  return ranked.slice(0, Math.min(Number(limit) || 100, 500));
};
