// Player leaderboards (batters, bowlers, all-rounders, wicket-keepers) for a season, a tournament or all time,
// and a player's career figures. Everything comes from player_match_stats (one row per player per match).

const db = require("../dbconfigure");

const CATEGORIES = ["batting", "bowling", "allrounder", "keeper"];

const round = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? null : Number(v.toFixed(d)));
const oversText = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

/** Pure: figures derived from the summed columns. */
function withDerived(a) {
  const dismissals = a.innings - a.notOuts;
  return {
    ...a,
    average: dismissals > 0 ? round(a.runs / dismissals) : null,
    strikeRate: a.balls > 0 ? round((a.runs * 100) / a.balls) : null,
    economy: a.bowledBalls > 0 ? round((a.runsConceded * 6) / a.bowledBalls) : null,
    overs: oversText(a.bowledBalls),
    role: roleOf(a),
  };
}

/** Pure: what kind of player this is, from what they have done. */
function roleOf(a) {
  if (a.matches > 0 && a.keeperMatches * 2 >= a.matches) return "Wicket-keeper";
  const bat = a.runs;
  const bowl = a.wickets * 20;
  if (a.wickets >= 1 && a.runs >= 20 && bowl * 3 >= bat && bat * 3 >= bowl) return "All-rounder";
  if (a.wickets > 0 && bowl > bat) return "Bowler";
  return a.runs > 0 || a.balls > 0 ? "Batter" : a.wickets > 0 || a.bowledBalls > 0 ? "Bowler" : "Player";
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name));
const nullLast = (x, y, desc = true) => (x === null ? 1 : y === null ? -1 : desc ? y - x : x - y);

/** Pure: order players for one category. */
function rankPlayers(players, category) {
  let list;
  switch (category) {
    case "batting":
      list = players.filter((p) => p.runs > 0).sort((a, b) => b.runs - a.runs || nullLast(a.average, b.average) || nullLast(a.strikeRate, b.strikeRate) || byName(a, b));
      break;
    case "bowling":
      list = players.filter((p) => p.wickets > 0).sort((a, b) => b.wickets - a.wickets || nullLast(a.economy, b.economy, false) || byName(a, b));
      break;
    case "allrounder":
      list = players
        .filter((p) => p.runs > 0 && p.wickets > 0)
        .map((p) => ({ ...p, rating: p.runs + 25 * p.wickets }))
        .sort((a, b) => b.rating - a.rating || byName(a, b));
      break;
    case "keeper":
      list = players.filter((p) => p.keeperMatches > 0).sort((a, b) => b.keeperDismissals - a.keeperDismissals || b.runs - a.runs || byName(a, b));
      break;
    default:
      list = [];
  }
  return list.map((p, i) => ({ ...p, rank: i + 1 }));
}

const AGG_SQL = `
  SELECT s.player_id, p.players_name, p.profile_picture, p.team_id, t.team_name,
    COUNT(DISTINCT s.match_id) AS matches, SUM(s.batted) AS innings, SUM(s.batted = 1 AND s.not_out = 1) AS not_outs,
    SUM(s.runs) AS runs, SUM(s.balls) AS balls, SUM(s.fours) AS fours, SUM(s.sixes) AS sixes, MAX(s.runs) AS highest,
    SUM(s.runs >= 50 AND s.runs < 100) AS fifties, SUM(s.runs >= 100) AS hundreds,
    SUM(s.batted = 1 AND s.not_out = 0 AND s.runs = 0) AS ducks,
    SUM(s.bowled_balls) AS bowled_balls, SUM(s.runs_conceded) AS runs_conceded, SUM(s.wickets) AS wickets, SUM(s.maidens) AS maidens, MAX(s.wickets) AS best_wickets,
    SUM(s.catches) AS catches, SUM(s.stumpings) AS stumpings, SUM(s.run_outs) AS run_outs,
    SUM(s.is_keeper) AS keeper_matches, SUM(CASE WHEN s.is_keeper = 1 THEN s.catches + s.stumpings + s.run_outs ELSE 0 END) AS keeper_dismissals
  FROM player_match_stats s
  JOIN players_core p ON p.player_id = s.player_id
  LEFT JOIN teams t ON t.id = p.team_id
  WHERE s.in_xi = 1`;

const n = (v) => Number(v) || 0;
const fromRow = (r) =>
  withDerived({
    playerId: Number(r.player_id), name: r.players_name, photo: r.profile_picture || null, teamId: r.team_id ? Number(r.team_id) : null, teamName: r.team_name || null,
    matches: n(r.matches), innings: n(r.innings), notOuts: n(r.not_outs), runs: n(r.runs), balls: n(r.balls), fours: n(r.fours), sixes: n(r.sixes), highest: n(r.highest),
    fifties: n(r.fifties), hundreds: n(r.hundreds), ducks: n(r.ducks),
    bowledBalls: n(r.bowled_balls), runsConceded: n(r.runs_conceded), wickets: n(r.wickets), maidens: n(r.maidens), bestWickets: n(r.best_wickets),
    catches: n(r.catches), stumpings: n(r.stumpings), runOuts: n(r.run_outs), keeperMatches: n(r.keeper_matches), keeperDismissals: n(r.keeper_dismissals),
  });

function scopeSql({ season, tournamentId, teamId }) {
  const where = [];
  const params = [];
  if (Number(season)) {
    where.push("s.season_year = ?");
    params.push(Number(season));
  }
  if (Number(tournamentId)) {
    where.push("s.tournament_id = ?");
    params.push(Number(tournamentId));
  }
  if (Number(teamId)) {
    where.push("s.team_id = ?");
    params.push(Number(teamId));
  }
  return { sql: where.length ? ` AND ${where.join(" AND ")}` : "", params };
}

/** @param opts { category, season?, tournamentId?, teamId?, limit? } */
exports.leaderboard = async ({ category = "batting", limit = 10, ...scope } = {}) => {
  if (!CATEGORIES.includes(category)) category = "batting";
  const { sql, params } = scopeSql(scope);
  const [rows] = await db.query(`${AGG_SQL}${sql} GROUP BY s.player_id`, params);
  return rankPlayers(rows.map(fromRow), category).slice(0, Math.min(Number(limit) || 10, 100));
};

/** Every player's summed figures for a scope (for the awards). Not decorated, no limit. */
exports.aggregate = async (scope = {}) => {
  const { sql, params } = scopeSql(scope);
  const [rows] = await db.query(`${AGG_SQL}${sql} GROUP BY s.player_id`, params);
  return rows.map(fromRow);
};

/** A player's career (or one season's) figures plus match by match. */
exports.profile = async (playerId, { season } = {}) => {
  const { sql, params } = scopeSql({ season });
  const [rows] = await db.query(`${AGG_SQL}${sql} AND s.player_id = ? GROUP BY s.player_id`, [...params, playerId]);
  const [[person]] = await db.query(`SELECT p.player_id, p.players_name, p.profile_picture, p.team_id, t.team_name FROM players_core p LEFT JOIN teams t ON t.id = p.team_id WHERE p.player_id = ?`, [playerId]);
  if (!person) return null;
  const career = rows[0]
    ? fromRow(rows[0])
    : withDerived({
        playerId: Number(person.player_id), name: person.players_name, photo: person.profile_picture || null, teamId: person.team_id ? Number(person.team_id) : null, teamName: person.team_name || null,
        matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, highest: 0, fifties: 0, hundreds: 0, ducks: 0, bowledBalls: 0, runsConceded: 0, wickets: 0, maidens: 0,
        bestWickets: 0, catches: 0, stumpings: 0, runOuts: 0, keeperMatches: 0, keeperDismissals: 0,
      });
  const [log] = await db.query(
    `SELECT s.match_id, s.runs, s.balls, s.not_out, s.batted, s.dismissal, s.bowled_balls, s.runs_conceded, s.wickets, s.catches, s.stumpings, s.run_outs, s.season_year,
            m.date, t1.team_name AS team1_name, t2.team_name AS team2_name, m.team1_id, m.team2_id, tr.name AS tournament_name
     FROM player_match_stats s JOIN matches m ON m.match_id = s.match_id
     LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id LEFT JOIN tournaments tr ON tr.id = m.tournament_id
     WHERE s.player_id = ? AND s.in_xi = 1 ${Number(season) ? "AND s.season_year = ?" : ""} ORDER BY m.date DESC, s.match_id DESC LIMIT 30`,
    Number(season) ? [playerId, Number(season)] : [playerId]
  );
  return {
    ...career,
    recent: log.map((r) => ({
      matchId: r.match_id, date: r.date, tournament: r.tournament_name, against: r.team1_name && r.team2_name ? `${r.team1_name} vs ${r.team2_name}` : null,
      batted: !!r.batted, runs: r.runs, balls: r.balls, notOut: !!r.not_out, dismissal: r.dismissal,
      overs: oversText(r.bowled_balls), runsConceded: r.runs_conceded, wickets: r.wickets, catches: r.catches + r.stumpings + r.run_outs,
    })),
  };
};

exports.CATEGORIES = CATEGORIES;
exports.rankPlayers = rankPlayers;
exports.roleOf = roleOf;
exports.withDerived = withDerived;
