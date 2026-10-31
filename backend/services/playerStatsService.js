// Per-player figures of ONE completed match, saved in player_match_stats so the season / all-time
// leaderboards and player profiles can be answered without reading every ball.
//
// The ball log stays the source of truth: the rows are rebuilt from it whenever a match completes (and are
// removed when the last ball of a completed match is undone), so they can never drift.

const scorecardService = require("./scorecardService");
const ballsModel = require("../models/ballModel");
const { matchPoints } = require("../utils/ratingRules");

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

/**
 * Pure: turn a scorecard + ball log + squads into one row per player.
 * @param innings      scorecard innings ([{ inningId, teamId, batting[], bowling[] }])
 * @param ballsByInning { [inningId]: balls[] }
 * @param squads       match_squads rows [{ team_id, player_id, role, is_keeper }]
 */
function computeRows({ matchId, tournamentId, seasonYear, innings, ballsByInning = {}, squads = [], winnerTeamId = null, potmId = null }) {
  const rows = new Map();
  const row = (playerId, teamId) => {
    const id = num(playerId);
    if (!id) return null;
    if (!rows.has(id)) {
      rows.set(id, {
        match_id: matchId, tournament_id: tournamentId, season_year: seasonYear, team_id: num(teamId), player_id: id,
        in_xi: 0, is_keeper: 0, batted: 0, runs: 0, balls: 0, fours: 0, sixes: 0, not_out: 0, dismissal: null,
        bowled_balls: 0, runs_conceded: 0, wickets: 0, maidens: 0, wides: 0, no_balls: 0, catches: 0, stumpings: 0, run_outs: 0,
        dots: 0, won: 0, bat_points: 0, bowl_points: 0, field_points: 0, bonus_points: 0,
      });
    }
    return rows.get(id);
  };

  // everyone named in the playing XI gets a row, even if they neither batted nor bowled
  squads.forEach((s) => {
    const r = row(s.player_id, s.team_id);
    if (!r) return;
    r.team_id = num(s.team_id);
    if (s.role === "playing") {
      r.in_xi = 1;
      r.is_keeper = s.is_keeper ? 1 : 0;
    }
  });

  const teamIds = [...new Set(innings.map((i) => num(i.teamId)))];
  const otherTeam = (teamId) => teamIds.find((t) => t !== num(teamId)) ?? null;

  for (const inn of innings) {
    const bowlingTeam = otherTeam(inn.teamId);

    for (const b of inn.batting || []) {
      const r = row(b.playerId, inn.teamId);
      if (!r) continue;
      r.in_xi = 1;
      r.batted = 1;
      r.runs += Number(b.runs || 0);
      r.balls += Number(b.balls || 0);
      r.fours += Number(b.fours || 0);
      r.sixes += Number(b.sixes || 0);
      r.not_out = b.status === "out" ? 0 : 1;
      r.dismissal = String(b.howOut || "").slice(0, 120) || null;
    }

    for (const w of inn.bowling || []) {
      const r = row(w.playerId, bowlingTeam);
      if (!r) continue;
      r.in_xi = 1;
      r.bowled_balls += Number(w.legalBalls || 0);
      r.runs_conceded += Number(w.runs || 0);
      r.wickets += Number(w.wickets || 0);
      r.maidens += Number(w.maidens || 0);
      r.wides += Number(w.wides || 0);
      r.no_balls += Number(w.noBalls || 0);
    }

    // fielding, from the ball log: a catch (or caught & bowled), a stumping, a run out
    for (const ball of ballsByInning[inn.inningId] || []) {
      // a dot ball: a legal delivery nothing was scored off
      if (Number(ball.legal_delivery) === 1 && Number(ball.runs_scored || 0) === 0) {
        const bowler = row(ball.bowler_id, bowlingTeam);
        if (bowler) bowler.dots += 1;
      }
      if (Number(ball.is_wicket) !== 1) continue;
      const type = String(ball.wicket_type || "").toLowerCase();
      if (type === "caught") {
        const r = row(ball.fielder_id || ball.bowler_id, bowlingTeam);
        if (r) r.catches += 1;
      } else if (type === "stumped") {
        const r = row(ball.fielder_id, bowlingTeam);
        if (r) r.stumpings += 1;
      } else if (type === "run out") {
        const r = row(ball.fielder_id, bowlingTeam);
        if (r) r.run_outs += 1;
      }
    }
  }

  // rating points: judged against the run rate of this very match
  const totalRuns = innings.reduce((n, i) => n + Number(i.runs || 0), 0);
  const legalBalls = Object.values(ballsByInning).flat().filter((b) => Number(b.legal_delivery) === 1).length;
  const second = innings.find((i) => Number(i.inningsNumber) === 2);
  const ctx = { parRpb: legalBalls > 0 ? totalRuns / legalBalls : 0, chased: !!(winnerTeamId && second && num(second.teamId) === num(winnerTeamId)) };
  for (const r of rows.values()) {
    r.won = winnerTeamId && r.team_id === num(winnerTeamId) ? 1 : 0;
    const pts = matchPoints(r, { ...ctx, won: !!r.won, potm: !!potmId && r.player_id === num(potmId) });
    r.bat_points = pts.bat;
    r.bowl_points = pts.bowl;
    r.field_points = pts.field;
    r.bonus_points = pts.bonus;
  }
  return [...rows.values()];
}

/** How much a player did in the match, for the "player of the match" suggestion. */
const impact = (r) => r.runs + 25 * r.wickets + 8 * (r.catches + r.stumpings + r.run_outs) + 6 * r.maidens;

/**
 * Pure: the best performer. The winning side is preferred (a player of the match normally comes from it);
 * ties go to the one with more wickets, then more runs, then the lower id so the answer is always the same.
 */
function suggestPlayerOfMatch(rows, winnerTeamId) {
  const pool = rows.filter((r) => r.in_xi && (r.batted || r.bowled_balls || r.catches || r.stumpings || r.run_outs));
  const winners = winnerTeamId ? pool.filter((r) => Number(r.team_id) === Number(winnerTeamId)) : [];
  const candidates = winners.length ? winners : pool;
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => impact(b) - impact(a) || b.wickets - a.wickets || b.runs - a.runs || a.player_id - b.player_id)[0];
}

const COLS = [
  "match_id", "tournament_id", "season_year", "team_id", "player_id", "in_xi", "is_keeper", "batted", "runs", "balls", "fours", "sixes", "not_out",
  "dismissal", "bowled_balls", "runs_conceded", "wickets", "maidens", "wides", "no_balls", "catches", "stumpings", "run_outs",
  "dots", "won", "bat_points", "bowl_points", "field_points", "bonus_points",
];

/** Build the rows of a match from its ball log (nothing is saved). Works for a live match too. */
async function buildMatchRows(conn, matchId) {
  const [[match]] = await conn.query(`SELECT match_id, tournament_id, winner_team_id, player_of_match_id, DATE_FORMAT(date, '%Y') AS match_year FROM matches WHERE match_id = ?`, [matchId]);
  if (!match) return [];
  const [[tournament]] = await conn.query(`SELECT DATE_FORMAT(start_date, '%Y') AS year FROM tournaments WHERE id = ?`, [match.tournament_id]);
  const seasonYear = Number((tournament && tournament.year) || match.match_year) || new Date().getFullYear();

  const card = await scorecardService.getScorecard(conn, matchId);
  const ballsByInning = {};
  for (const inn of card.innings) ballsByInning[inn.inningId] = await ballsModel.getAllBallsByInnings(conn, inn.inningId);
  const [squads] = await conn.query(
    `SELECT ms.team_id, ms.player_id, ms.role, ms.is_keeper FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id WHERE tm.match_id = ?`,
    [matchId]
  );
  return computeRows({
    matchId, tournamentId: match.tournament_id, seasonYear, innings: card.innings, ballsByInning, squads,
    winnerTeamId: match.winner_team_id, potmId: match.player_of_match_id,
  });
}

/** Build and save the rows of a completed match (replacing any earlier ones). Returns the rows. */
async function snapshotMatch(conn, matchId) {
  const rows = await buildMatchRows(conn, matchId);
  await conn.query(`DELETE FROM player_match_stats WHERE match_id = ?`, [matchId]);
  if (rows.length) await conn.query(`INSERT INTO player_match_stats (${COLS.join(", ")}) VALUES ?`, [rows.map((r) => COLS.map((c) => r[c]))]);
  return rows;
}

async function removeMatch(conn, matchId) {
  await conn.query(`DELETE FROM player_match_stats WHERE match_id = ?`, [matchId]);
}

/** The saved rows of a match (used by the overlay and the public match page). */
async function rowsForMatch(conn, matchId) {
  const [rows] = await conn.query(`SELECT * FROM player_match_stats WHERE match_id = ?`, [matchId]);
  return rows;
}

module.exports = { computeRows, suggestPlayerOfMatch, impact, buildMatchRows, snapshotMatch, removeMatch, rowsForMatch };
