// Player ratings, in the manner of the ICC tables: every match gives a player rating points (see
// utils/ratingRules.js), and the rating is the AVERAGE of those points with recent matches counting more,
// scaled to a number out of 1000. Matches against stronger teams count for a little more.
//
//   batting / bowling / fielding   average of that skill's points over the matches where it was used
//   overall                        average of all points over every match played
//   all-rounder                    harmonic mean of the batting and bowling ratings (needs both, so a
//                                  player strong at only one is not an all-rounder)

const db = require("../dbconfigure");

const DECAY = 0.92; // each older match counts 8% less than the one after it
const SCALE = 10; // 100 points in a match is a 1000 rating
const CAP = 1000;
const MIN_MATCHES = 2; // fewer than this and a player is not ranked yet
const CATEGORIES = ["overall", "batting", "bowling", "allrounder", "fielding"];

const round = (v) => Math.round(v);
const capped = (v) => Math.min(CAP, Math.max(0, round(v * SCALE)));

/** Opposition strength: 0.9 against the weakest side up to 1.2 against the strongest. */
const opposition = (oppPoints, maxPoints) => (maxPoints > 0 ? 0.9 + 0.3 * Math.min(1, oppPoints / maxPoints) : 1);

/** Weighted average of `pick(row)` over rows (newest first). Returns null when there are no rows. */
function weighted(rows, pick) {
  let sum = 0;
  let weight = 0;
  rows.forEach((r, k) => {
    const w = DECAY ** k;
    sum += w * pick(r);
    weight += w;
  });
  return weight > 0 ? sum / weight : null;
}

/**
 * Pure.
 * @param rows  one per player per match: { player_id, date, team_id, opp_team_id, batted, bowled_balls, bat_points, bowl_points, field_points, bonus_points }
 * @param teamPoints { [teamId]: ranking points }  (for the opposition factor)
 * @returns [{ playerId, matches, overall, batting, bowling, allrounder, fielding, form }]  (no ranking order)
 */
function buildRatings(rows, teamPoints = {}, minMatches = MIN_MATCHES) {
  const maxPoints = Math.max(0, ...Object.values(teamPoints));
  const byPlayer = new Map();
  for (const r of rows) {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, []);
    byPlayer.get(r.player_id).push(r);
  }
  const out = [];
  for (const [playerId, list] of byPlayer) {
    const games = [...list].sort((a, b) => new Date(b.date) - new Date(a.date) || b.match_id - a.match_id);
    const f = (g) => opposition(teamPoints[g.opp_team_id] || 0, maxPoints);
    const total = (g) => (Number(g.bat_points) + Number(g.bowl_points) + Number(g.field_points) + Number(g.bonus_points)) * f(g);
    const batGames = games.filter((g) => g.batted);
    const bowlGames = games.filter((g) => Number(g.bowled_balls) > 0);
    const ranked = games.length >= minMatches;

    const batting = batGames.length >= minMatches ? capped(weighted(batGames, (g) => Number(g.bat_points) * f(g))) : null;
    const bowling = bowlGames.length >= minMatches ? capped(weighted(bowlGames, (g) => Number(g.bowl_points) * f(g))) : null;
    const fielding = ranked ? capped(weighted(games, (g) => Number(g.field_points) * f(g))) : null;
    const overall = ranked ? capped(weighted(games, total)) : null;
    const allrounder = batting && bowling ? round((2 * batting * bowling) / (batting + bowling)) : null;
    out.push({
      playerId: Number(playerId),
      matches: games.length,
      overall, batting, bowling, allrounder, fielding,
      form: Math.round(games.slice(0, 5).reduce((n, g) => n + total(g), 0) * 10) / 10, // points in the last five matches
      points: Math.round(games.reduce((n, g) => n + total(g), 0) * 10) / 10, // all points of the season
    });
  }
  return out;
}

/** Pure: order by one rating, best first; players without that rating are left out. */
function rankBy(ratings, category) {
  const key = CATEGORIES.includes(category) ? category : "overall";
  return ratings
    .filter((r) => r[key] !== null && r[key] !== undefined)
    .sort((a, b) => b[key] - a[key] || b.matches - a.matches || a.playerId - b.playerId)
    .map((r, i) => ({ ...r, rating: r[key], rank: i + 1 }));
}

async function loadRows({ season, tournamentId, teamId } = {}) {
  const where = ["s.in_xi = 1"];
  const params = [];
  if (Number(season)) { where.push("s.season_year = ?"); params.push(Number(season)); }
  if (Number(tournamentId)) { where.push("s.tournament_id = ?"); params.push(Number(tournamentId)); }
  if (Number(teamId)) { where.push("s.team_id = ?"); params.push(Number(teamId)); }
  const [rows] = await db.query(
    `SELECT s.player_id, s.match_id, s.team_id, s.batted, s.bowled_balls, s.bat_points, s.bowl_points, s.field_points, s.bonus_points,
            m.date, CASE WHEN m.team1_id = s.team_id THEN m.team2_id ELSE m.team1_id END AS opp_team_id
     FROM player_match_stats s JOIN matches m ON m.match_id = s.match_id WHERE ${where.join(" AND ")}`,
    params
  );
  return rows;
}

async function teamPointsMap(season) {
  const [rows] = await db.query(`SELECT team_id, SUM(points) AS pts FROM team_points ${Number(season) ? "WHERE season_year = ?" : ""} GROUP BY team_id`, Number(season) ? [Number(season)] : []);
  return Object.fromEntries(rows.map((r) => [Number(r.team_id), Number(r.pts)]));
}

async function decorate(items) {
  if (!items.length) return [];
  const [people] = await db.query(
    `SELECT p.player_id, p.players_name, p.profile_picture, p.team_id, t.team_name FROM players_core p LEFT JOIN teams t ON t.id = p.team_id WHERE p.player_id IN (?)`,
    [items.map((i) => i.playerId)]
  );
  const byId = Object.fromEntries(people.map((p) => [Number(p.player_id), p]));
  return items.map((i) => {
    const p = byId[i.playerId] || {};
    return { ...i, name: p.players_name || `Player ${i.playerId}`, photo: p.profile_picture || null, teamId: p.team_id ? Number(p.team_id) : null, teamName: p.team_name || null };
  });
}

/** @param opts { category, season?, tournamentId?, teamId?, limit? } */
exports.leaderboard = async ({ category = "overall", limit = 25, minMatches, ...scope } = {}) => {
  const [rows, tp] = await Promise.all([loadRows(scope), teamPointsMap(scope.season)]);
  const ranked = rankBy(buildRatings(rows, tp, minMatches), category).slice(0, Math.min(Number(limit) || 25, 200));
  return decorate(ranked);
};

/** All ratings of one player (career or a season). */
exports.forPlayer = async (playerId, { season } = {}) => {
  const [rows, tp] = await Promise.all([loadRows({ season }), teamPointsMap(season)]);
  const all = buildRatings(rows, tp);
  const mine = all.find((r) => r.playerId === Number(playerId)) || null;
  if (!mine) return null;
  const rankOf = (cat) => (mine[cat] === null ? null : rankBy(all, cat).find((r) => r.playerId === mine.playerId).rank);
  return { ...mine, ranks: Object.fromEntries(CATEGORIES.map((c) => [c, rankOf(c)])) };
};

/** Every player's ratings for the awards (no limit, not decorated). */
exports.all = async (scope = {}) => {
  const [rows, tp] = await Promise.all([loadRows(scope), teamPointsMap(scope.season)]);
  return buildRatings(rows, tp, scope.minMatches);
};

exports.CATEGORIES = CATEGORIES;
exports.buildRatings = buildRatings;
exports.rankBy = rankBy;
exports.opposition = opposition;
