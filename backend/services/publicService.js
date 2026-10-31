// What the public site and the team dashboards read: teams of the association, finished tournaments and
// matches (with scorecards), rankings, upcoming fixtures. No live scores here by design: a scorecard is
// published only once the match is completed.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const { ballsToOversString } = require("../utils/cricketRules/cricketRules");
const { resultText, stageLabel } = require("../utils/resultText");
const scorecardService = require("./scorecardService");
const points = require("./pointsService");
const announcements = require("./announcementService");
const playerRanking = require("./playerRankingService");

const like = (q) => `%${String(q || "").trim().replace(/[%_]/g, "")}%`;
const page = (v, def, max) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

/* --------------------------------- matches --------------------------------- */

const MATCH_SQL = `
  SELECT m.match_id, m.tournament_id, m.team1_id, m.team2_id, m.winner_team_id, m.victory_margin_type, m.victory_margin, m.status, m.date, m.venue,
         m.toss_winner_id, m.toss_decision, m.player_of_match_id, m.total_overs, m.decided_by,
         t1.team_name AS team1_name, t1.logo AS team1_logo, t2.team_name AS team2_name, t2.logo AS team2_logo,
         tr.name AS tournament_name, tm.stage, tm.group_name, tm.round_number, tm.match_no
  FROM matches m
  LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id
  LEFT JOIN tournaments tr ON tr.id = m.tournament_id
  LEFT JOIN tournament_matches tm ON tm.match_id = m.match_id`;

async function inningsLines(matchIds) {
  if (!matchIds.length) return {};
  const [rows] = await db.query(`SELECT match_id, team_id, innings_number, total_runs, wickets, balls_bowled FROM innings WHERE match_id IN (?) ORDER BY match_id, innings_number`, [matchIds]);
  const out = {};
  rows.forEach((r) => {
    (out[r.match_id] ||= []).push({ teamId: Number(r.team_id), inningsNumber: r.innings_number, runs: Number(r.total_runs) || 0, wickets: Number(r.wickets) || 0, overs: ballsToOversString(Number(r.balls_bowled) || 0) });
  });
  return out;
}

const matchCard = (r, innings = []) => {
  const names = { [r.team1_id]: r.team1_name, [r.team2_id]: r.team2_name };
  return {
    matchId: r.match_id,
    tournamentId: r.tournament_id,
    tournament: r.tournament_name,
    matchNo: r.match_no || null,
    stage: r.stage || null,
    stageLabel: stageLabel(r.stage, r.group_name, r.round_number),
    date: r.date,
    venue: r.venue || null,
    overs: r.total_overs || null,
    teams: [
      { id: Number(r.team1_id), name: r.team1_name, logo: r.team1_logo || null },
      { id: Number(r.team2_id), name: r.team2_name, logo: r.team2_logo || null },
    ],
    winnerTeamId: r.winner_team_id ? Number(r.winner_team_id) : null,
    result: resultText(r, names),
    innings: innings.map((i) => ({ ...i, teamName: names[i.teamId] || null })),
  };
};

/** Finished matches, newest first. Filters: text (team or tournament name), tournament, team. */
exports.matches = async ({ q, tournamentId, teamId, page: pg, pageSize } = {}) => {
  const where = ["m.status = 'completed'"];
  const params = [];
  if (String(q || "").trim()) {
    where.push("(t1.team_name LIKE ? OR t2.team_name LIKE ? OR tr.name LIKE ?)");
    params.push(like(q), like(q), like(q));
  }
  if (Number(tournamentId)) {
    where.push("m.tournament_id = ?");
    params.push(Number(tournamentId));
  }
  if (Number(teamId)) {
    where.push("(m.team1_id = ? OR m.team2_id = ?)");
    params.push(Number(teamId), Number(teamId));
  }
  const size = page(pageSize, 12, 50);
  const offset = (page(pg, 1, 10000) - 1) * size;
  const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM matches m LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id LEFT JOIN tournaments tr ON tr.id = m.tournament_id WHERE ${where.join(" AND ")}`, params);
  const [rows] = await db.query(`${MATCH_SQL} WHERE ${where.join(" AND ")} ORDER BY m.date DESC, m.match_id DESC LIMIT ? OFFSET ?`, [...params, size, offset]);
  const lines = await inningsLines(rows.map((r) => r.match_id));
  return { total: Number(count.n), page: page(pg, 1, 10000), pageSize: size, items: rows.map((r) => matchCard(r, lines[r.match_id])) };
};

/** A finished match with its full scorecard. Matches that are not finished are not published. */
exports.matchDetail = async (matchId) => {
  const [rows] = await db.query(`${MATCH_SQL} WHERE m.match_id = ?`, [matchId]);
  const r = rows[0];
  if (!r) throw new ScoringError("Match not found", 404);
  if (r.status !== "completed") throw new ScoringError("The scorecard is published once the match is finished", 404);
  const lines = await inningsLines([r.match_id]);
  const card = await scorecardService.getScorecard(db, matchId);
  let playerOfMatch = null;
  if (r.player_of_match_id) {
    const [[p]] = await db.query(`SELECT player_id, players_name, profile_picture, team_id FROM players_core WHERE player_id = ?`, [r.player_of_match_id]);
    if (p) playerOfMatch = { id: Number(p.player_id), name: p.players_name, photo: p.profile_picture || null, teamId: Number(p.team_id) };
  }
  const tossWinner = r.toss_winner_id ? (Number(r.toss_winner_id) === Number(r.team1_id) ? r.team1_name : r.team2_name) : null;
  return {
    ...matchCard(r, lines[r.match_id]),
    toss: tossWinner ? `${tossWinner} won the toss and chose to ${r.toss_decision}` : null,
    playerOfMatch,
    scorecard: card.innings,
  };
};

/** Fixtures still to be played, soonest first (no scores: the schedule only). */
exports.upcoming = async ({ limit = 10, teamId } = {}) => {
  const params = [];
  let teamSql = "";
  if (Number(teamId)) {
    teamSql = "AND (tm.team1_id = ? OR tm.team2_id = ?)";
    params.push(Number(teamId), Number(teamId));
  }
  const [rows] = await db.query(
    `SELECT tm.id, tm.match_no, tm.stage, tm.group_name, tm.round_number, tm.team1_id, tm.team2_id, tm.venue, tm.overs, tm.tournament_id, tm.status,
            DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date, DATE_FORMAT(tm.match_time, '%H:%i') AS match_time,
            t1.team_name AS team1_name, t1.logo AS team1_logo, t2.team_name AS team2_name, t2.logo AS team2_logo, tr.name AS tournament_name
     FROM tournament_matches tm LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id LEFT JOIN tournaments tr ON tr.id = tm.tournament_id
     WHERE tm.status = 'scheduled' AND tm.match_date IS NOT NULL AND tm.match_date >= CURDATE() AND tm.team1_id IS NOT NULL AND tm.team2_id IS NOT NULL ${teamSql}
     ORDER BY tm.match_date, tm.match_time, tm.match_no LIMIT ?`,
    [...params, page(limit, 10, 50)]
  );
  return rows.map((r) => ({
    fixtureId: r.id, matchNo: r.match_no, tournamentId: r.tournament_id, tournament: r.tournament_name, stageLabel: stageLabel(r.stage, r.group_name, r.round_number),
    date: r.match_date, time: r.match_time, venue: r.venue || null, overs: r.overs || null,
    teams: [
      { id: Number(r.team1_id), name: r.team1_name, logo: r.team1_logo || null },
      { id: Number(r.team2_id), name: r.team2_name, logo: r.team2_logo || null },
    ],
  }));
};

/* ------------------------------- tournaments ------------------------------- */

const tournamentStatus = (r) => {
  if (r.champion_team_id) return "completed";
  if (Number(r.live_count) > 0) return "live";
  if (Number(r.done_count) > 0) return "in_progress";
  const start = r.start_date ? new Date(r.start_date) : null;
  return start && start > new Date() ? "upcoming" : "in_progress";
};

exports.tournaments = async ({ q, season, id } = {}) => {
  const where = [];
  const params = [];
  if (Number(id)) {
    where.push("t.id = ?");
    params.push(Number(id));
  }
  if (String(q || "").trim()) {
    where.push("(t.name LIKE ? OR t.venue LIKE ?)");
    params.push(like(q), like(q));
  }
  if (Number(season)) {
    where.push("YEAR(t.start_date) = ?");
    params.push(Number(season));
  }
  const [rows] = await db.query(
    `SELECT t.id, t.name, t.banner_image, t.venue, t.start_date, t.end_date,
       (SELECT r.team_id FROM tournament_results r WHERE r.tournament_id = t.id AND r.position = 1) AS champion_team_id,
       (SELECT tm.team_name FROM tournament_results r JOIN teams tm ON tm.id = r.team_id WHERE r.tournament_id = t.id AND r.position = 1) AS champion,
       (SELECT tm.team_name FROM tournament_results r JOIN teams tm ON tm.id = r.team_id WHERE r.tournament_id = t.id AND r.position = 2) AS runner_up,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = t.id AND x.status = 'live') AS live_count,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = t.id AND x.status = 'completed') AS done_count,
       (SELECT COUNT(*) FROM tournament_participants p WHERE p.tournament_id = t.id AND p.status NOT IN ('cancelled', 'rejected')) AS teams
     FROM tournaments t ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY t.start_date DESC, t.id DESC LIMIT 100`,
    params
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, banner: r.banner_image || null, venue: r.venue || null, startDate: r.start_date, endDate: r.end_date,
    status: tournamentStatus(r), champion: r.champion || null, runnerUp: r.runner_up || null, teams: Number(r.teams), matchesPlayed: Number(r.done_count),
  }));
};

exports.tournamentDetail = async (id) => {
  const [list] = await db.query(`SELECT id FROM tournaments WHERE id = ?`, [id]);
  if (!list.length) throw new ScoringError("Tournament not found", 404);
  const [summary] = await exports.tournaments({ id });

  const [positions] = await db.query(
    `SELECT r.position, r.decided_by, r.team_id, t.team_name, t.logo FROM tournament_results r JOIN teams t ON t.id = r.team_id WHERE r.tournament_id = ? ORDER BY r.position`,
    [id]
  );
  const [fixtures] = await db.query(
    `SELECT tm.id, tm.match_id, tm.match_no, tm.stage, tm.group_name, tm.round_number, tm.status, tm.team1_id, tm.team2_id, tm.winner_team_id,
            DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date, DATE_FORMAT(tm.match_time, '%H:%i') AS match_time,
            t1.team_name AS team1_name, t2.team_name AS team2_name, m.victory_margin_type, m.victory_margin, m.decided_by, m.status AS match_status
     FROM tournament_matches tm LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id LEFT JOIN matches m ON m.match_id = tm.match_id
     WHERE tm.tournament_id = ? ORDER BY tm.match_no`,
    [id]
  );
  const fixtureCard = (f) => ({
    fixtureId: f.id,
    matchId: f.status === "completed" ? f.match_id : null, // only finished matches open a scorecard
    matchNo: f.match_no,
    stage: f.stage,
    stageLabel: stageLabel(f.stage, f.group_name, f.round_number),
    group: f.group_name,
    round: f.round_number,
    date: f.match_date,
    time: f.match_time,
    status: f.status,
    team1: f.team1_id ? { id: Number(f.team1_id), name: f.team1_name } : null,
    team2: f.team2_id ? { id: Number(f.team2_id), name: f.team2_name } : null,
    result: f.status === "completed" ? resultText({ status: "completed", winner_team_id: f.winner_team_id, victory_margin_type: f.victory_margin_type, victory_margin: f.victory_margin, decided_by: f.decided_by }, { [f.team1_id]: f.team1_name, [f.team2_id]: f.team2_name }) : null,
  });

  const [teamPoints] = await db.query(
    `SELECT tp.team_id, t.team_name, SUM(tp.points) AS points FROM team_points tp JOIN teams t ON t.id = tp.team_id WHERE tp.tournament_id = ? GROUP BY tp.team_id, t.team_name ORDER BY points DESC, t.team_name`,
    [id]
  );
  const [batters, bowlers] = await Promise.all([
    playerRanking.leaderboard({ category: "batting", tournamentId: id, limit: 5 }),
    playerRanking.leaderboard({ category: "bowling", tournamentId: id, limit: 5 }),
  ]);

  return {
    ...summary,
    positions: positions.map((p) => ({ position: p.position, teamId: Number(p.team_id), teamName: p.team_name, logo: p.logo || null, decidedBy: p.decided_by })),
    fixtures: fixtures.map(fixtureCard),
    pointsEarned: teamPoints.map((t) => ({ teamId: Number(t.team_id), teamName: t.team_name, points: Number(t.points) })),
    topBatters: batters,
    topBowlers: bowlers,
  };
};

/* ---------------------------------- teams ---------------------------------- */

exports.teams = async ({ q } = {}) => {
  const [rows] = await db.query(
    `SELECT t.id, t.team_name, t.logo, v.village_name FROM teams t LEFT JOIN villages v ON v.team_name = t.team_name AND v.status = 'approved'
     ${String(q || "").trim() ? "WHERE t.team_name LIKE ? OR v.village_name LIKE ?" : ""} ORDER BY t.team_name LIMIT 500`,
    String(q || "").trim() ? [like(q), like(q)] : []
  );
  const ranking = await points.teamRankings({ limit: 500 });
  const byId = Object.fromEntries(ranking.map((r) => [r.teamId, r]));
  return rows.map((t) => {
    const r = byId[Number(t.id)];
    return { id: Number(t.id), name: t.team_name, logo: t.logo || null, village: t.village_name || null, rank: r ? r.rank : null, points: r ? r.points : 0, titles: r ? r.titles : 0, played: r ? r.played : 0, won: r ? r.won : 0 };
  });
};

exports.teamProfile = async (teamId) => {
  const [[t]] = await db.query(`SELECT t.id, t.team_name, t.logo, v.village_name FROM teams t LEFT JOIN villages v ON v.team_name = t.team_name AND v.status = 'approved' WHERE t.id = ?`, [teamId]);
  if (!t) throw new ScoringError("Team not found", 404);
  const ranking = await points.teamRankings({ limit: 500 });
  const mine = ranking.find((r) => r.teamId === Number(teamId));
  const [players] = await db.query(`SELECT player_id, players_name, profile_picture, is_banned, banned_until FROM players_core WHERE team_id = ? ORDER BY players_name`, [teamId]);
  const [honours] = await db.query(
    `SELECT r.position, tr.id, tr.name, DATE_FORMAT(tr.start_date, '%Y') AS year FROM tournament_results r JOIN tournaments tr ON tr.id = r.tournament_id WHERE r.team_id = ? ORDER BY tr.start_date DESC`,
    [teamId]
  );
  const [batters, bowlers] = await Promise.all([
    playerRanking.leaderboard({ category: "batting", teamId, limit: 3 }),
    playerRanking.leaderboard({ category: "bowling", teamId, limit: 3 }),
  ]);
  return {
    id: Number(t.id), name: t.team_name, logo: t.logo || null, village: t.village_name || null,
    rank: mine ? mine.rank : null, points: mine ? mine.points : 0, titles: mine ? mine.titles : 0, played: mine ? mine.played : 0, won: mine ? mine.won : 0,
    players: players.map((p) => ({ id: Number(p.player_id), name: p.players_name, photo: p.profile_picture || null })),
    honours: honours.map((h) => ({ tournamentId: h.id, tournament: h.name, year: Number(h.year), position: h.position })),
    topBatters: batters,
    topBowlers: bowlers,
    upcoming: await exports.upcoming({ teamId, limit: 5 }),
  };
};

/* ---------------------------------- overview ---------------------------------- */

exports.overview = async () => {
  const [[counts]] = await db.query(
    `SELECT (SELECT COUNT(*) FROM teams) AS teams, (SELECT COUNT(*) FROM players_core) AS players,
            (SELECT COUNT(*) FROM tournaments) AS tournaments, (SELECT COUNT(*) FROM matches WHERE status = 'completed') AS matches`
  );
  const [topTeams, batters, bowlers, recent, upcoming, tournaments, notices] = await Promise.all([
    points.teamRankings({ limit: 5 }),
    playerRanking.leaderboard({ category: "batting", limit: 5 }),
    playerRanking.leaderboard({ category: "bowling", limit: 5 }),
    exports.matches({ pageSize: 6 }),
    exports.upcoming({ limit: 6 }),
    exports.tournaments({}),
    announcements.listActive(3),
  ]);
  return {
    counts: { teams: Number(counts.teams), players: Number(counts.players), tournaments: Number(counts.tournaments), matches: Number(counts.matches) },
    topTeams, topBatters: batters, topBowlers: bowlers,
    recentResults: recent.items,
    upcoming,
    champions: tournaments.filter((t) => t.status === "completed").slice(0, 4),
    announcements: notices,
  };
};

exports.rankings = async ({ scope = "teams", season, category } = {}) => {
  if (scope === "players") return { category: category || "batting", season: Number(season) || null, items: await playerRanking.leaderboard({ category, season, limit: 50 }) };
  return { season: Number(season) || null, seasons: await points.seasons(), items: await points.teamRankings({ season, limit: 200 }) };
};
