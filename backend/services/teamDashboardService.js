// What a team admin sees about the team's standing: the ranking table with its own row, where its points came from,
// how its players are rated, and the dates reserved for it to host.

const db = require("../dbconfigure");
const dateOnly = require("../utils/dateOnly");
const points = require("./pointsService");
const ratings = require("./ratingService");

exports.rankings = async (teamId, adminId, { season } = {}) => {
  const year = Number(season) || null;
  const [table, rules, seasons, players] = await Promise.all([
    points.teamRankings({ season: year, limit: 200 }),
    points.getRules(),
    points.seasons(),
    ratings.leaderboard({ category: "overall", teamId, season: year, limit: 40, minMatches: 1 }),
  ]);
  const label = Object.fromEntries(rules.map((r) => [r.ruleKey, r.label]));
  const [rows] = await db.query(
    `SELECT tp.tournament_id, tr.name, tp.rule_key, SUM(tp.points) AS pts FROM team_points tp JOIN tournaments tr ON tr.id = tp.tournament_id
     WHERE tp.team_id = ? ${year ? "AND tp.season_year = ?" : ""} GROUP BY tp.tournament_id, tr.name, tp.rule_key ORDER BY tp.tournament_id DESC`,
    year ? [teamId, year] : [teamId]
  );
  const byTournament = new Map();
  for (const r of rows) {
    if (!byTournament.has(r.tournament_id)) byTournament.set(r.tournament_id, { tournamentId: Number(r.tournament_id), name: r.name, total: 0, parts: [] });
    const t = byTournament.get(r.tournament_id);
    t.total += Number(r.pts);
    t.parts.push({ rule: r.rule_key, label: label[r.rule_key] || r.rule_key, points: Number(r.pts) });
  }
  const [hosting] = await db.query(
    `SELECT id, start_date, end_date, reserved_days, status, tournament_id FROM tentative_tournament_schedules
     WHERE organizer_admin_id = ? AND status <> 'cancelled' AND end_date >= CURDATE() ORDER BY start_date`,
    [adminId]
  );
  const mine = table.find((r) => r.teamId === Number(teamId)) || null;
  return {
    season: year, seasons, table, mine, teamCount: table.length,
    breakdown: [...byTournament.values()],
    players,
    hosting: hosting.map((h) => ({ id: h.id, startDate: dateOnly(h.start_date), endDate: dateOnly(h.end_date), days: h.reserved_days, status: h.status, tournamentId: h.tournament_id || null })),
  };
};
