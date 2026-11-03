// What the association head looks at: one team with its whole roster, the hosts and their tournaments, and the dashboard.
// Read-only. Everything the screens show is worked out here so the screens stay simple.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const points = require("./pointsService");
const ratings = require("./ratingService");
const publicService = require("./publicService");
const banService = require("./banService");

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (v) => (v instanceof Date ? ymd(v) : v ? String(v).slice(0, 10) : null);
const missingTable = (err) => err && (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146);

/** Run a query on a table an older database may not have yet: the answer is then simply "nothing". */
async function optional(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    if (missingTable(err)) return [];
    throw err;
  }
}

const ACTIVE_BAN = `b.revoked_at IS NULL AND b.starts_on <= CURDATE() AND (b.ends_on IS NULL OR b.ends_on >= CURDATE())`;

/* ------------------------------------ one team ------------------------------------ */

exports.teamDetail = async (id) => {
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId < 1) throw new ScoringError("Team not found", 404);

  const [[t]] = await db.query(
    `SELECT t.id, t.team_name, t.logo, t.created_at, t.admin_id, a.admin_name, a.email, a.phone, v.village_name
     FROM teams t LEFT JOIN admins a ON a.id = t.admin_id LEFT JOIN villages v ON v.team_name = t.team_name AND v.status = 'approved'
     WHERE t.id = ? LIMIT 1`,
    [teamId]
  );
  if (!t) throw new ScoringError("Team not found", 404);

  const [players] = await db.query(
    `SELECT p.player_id, p.players_name, p.mobile_number, p.email, p.profile_picture, p.is_banned, p.banned_until,
       (SELECT COUNT(*) FROM player_match_stats s WHERE s.player_id = p.player_id AND s.in_xi = 1) AS matches,
       (SELECT COALESCE(SUM(s.runs), 0) FROM player_match_stats s WHERE s.player_id = p.player_id) AS runs,
       (SELECT COALESCE(SUM(s.wickets), 0) FROM player_match_stats s WHERE s.player_id = p.player_id) AS wickets
     FROM players_core p WHERE p.team_id = ? ORDER BY p.players_name`,
    [teamId]
  );
  const [entries] = await db.query(
    `SELECT tp.tournament_id, tp.group_name, tp.status AS entry_status, tr.name, tr.status, tr.start_date, r.position
     FROM tournament_participants tp JOIN tournaments tr ON tr.id = tp.tournament_id
     LEFT JOIN tournament_results r ON r.tournament_id = tp.tournament_id AND r.team_id = tp.team_id
     WHERE tp.team_id = ? ORDER BY tr.start_date DESC, tr.id DESC LIMIT 30`,
    [teamId]
  );
  const [[hosted]] = await db.query(`SELECT COUNT(*) AS n FROM tournaments WHERE organizer_admin_id = ?`, [t.admin_id]);

  const [ranking, rated, recent, bans] = await Promise.all([
    points.teamRankings({ limit: 500 }),
    ratings.all({}),
    publicService.matches({ teamId, pageSize: 6 }),
    banService.list({ filter: "all", type: "team" }),
  ]);
  const standing = ranking.find((r) => Number(r.teamId) === teamId) || null;
  const ratingOf = Object.fromEntries(rated.map((r) => [Number(r.playerId), r.overall]));
  const now = new Date();
  const roster = players.map((p) => ({
    id: Number(p.player_id),
    name: p.players_name,
    mobile: p.mobile_number || null,
    email: p.email || null,
    photo: p.profile_picture || null,
    banned: !!p.is_banned && (!p.banned_until || new Date(p.banned_until) > now),
    bannedUntil: p.banned_until ? day(p.banned_until) : null,
    matches: Number(p.matches),
    runs: Number(p.runs),
    wickets: Number(p.wickets),
    rating: ratingOf[Number(p.player_id)] ?? null,
  }));
  const teamBans = bans.filter((b) => b.subjectId === teamId);

  return {
    id: Number(t.id),
    name: t.team_name,
    logo: t.logo || null,
    village: t.village_name || null,
    since: day(t.created_at),
    admin: { name: t.admin_name || null, email: t.email || null, phone: t.phone || null },
    standing: standing ? { rank: standing.rank, points: standing.points, played: standing.played, won: standing.won, titles: standing.titles } : { rank: null, points: 0, played: 0, won: 0, titles: 0 },
    hosted: Number(hosted.n),
    banned: teamBans.some((b) => b.status === "active"),
    bans: teamBans,
    roster,
    tournaments: entries.map((e) => ({
      id: Number(e.tournament_id), name: e.name, status: e.status, startDate: day(e.start_date), group: e.group_name || null, entry: e.entry_status, position: e.position ? Number(e.position) : null,
    })),
    recentResults: recent.items,
  };
};

/* ------------------------------------- hosts ------------------------------------- */

/** Every team admin who hosts (or has reserved dates to host), with what they hosted. */
exports.hosts = async () => {
  const [hosts] = await db.query(
    `SELECT a.id AS admin_id, a.admin_name, a.email, a.phone, t.id AS team_id, t.team_name, t.logo
     FROM admins a JOIN teams t ON t.admin_id = a.id
     WHERE a.is_organizer = 1
        OR EXISTS (SELECT 1 FROM tournaments x WHERE x.organizer_admin_id = a.id)
        OR EXISTS (SELECT 1 FROM tentative_tournament_schedules s WHERE s.organizer_admin_id = a.id AND s.status <> 'cancelled')
     ORDER BY t.team_name`
  );
  const [tournaments] = await db.query(
    `SELECT tr.id, tr.name, tr.status, tr.venue, tr.start_date, tr.end_date, tr.organizer_admin_id,
       (SELECT COUNT(*) FROM tournament_participants p WHERE p.tournament_id = tr.id AND p.status NOT IN ('cancelled', 'rejected')) AS teams,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = tr.id AND x.status = 'completed') AS done,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = tr.id) AS total,
       (SELECT tm.team_name FROM tournament_results r JOIN teams tm ON tm.id = r.team_id WHERE r.tournament_id = tr.id AND r.position = 1) AS champion
     FROM tournaments tr ORDER BY tr.start_date DESC, tr.id DESC`
  );
  const reservations = await db.query(
    `SELECT s.id, s.organizer_admin_id, s.start_date, s.end_date, s.status FROM tentative_tournament_schedules s WHERE s.status = 'pending' AND s.end_date >= CURDATE() ORDER BY s.start_date`
  ).then(([rows]) => rows);
  const replaced = await optional(`SELECT tournament_id, COUNT(*) AS n FROM tournament_replacements GROUP BY tournament_id`);
  const replacedBy = Object.fromEntries(replaced.map((r) => [Number(r.tournament_id), Number(r.n)]));

  return hosts.map((h) => {
    const mine = tournaments.filter((x) => Number(x.organizer_admin_id) === Number(h.admin_id));
    const upcoming = reservations.filter((r) => Number(r.organizer_admin_id) === Number(h.admin_id));
    return {
      adminId: Number(h.admin_id),
      teamId: Number(h.team_id),
      teamName: h.team_name,
      logo: h.logo || null,
      admin: { name: h.admin_name, email: h.email || null, phone: h.phone || null },
      hosted: mine.length,
      completed: mine.filter((x) => x.status === "completed").length,
      nextReservation: upcoming.length ? { startDate: day(upcoming[0].start_date), endDate: day(upcoming[0].end_date) } : null,
      tournaments: mine.map((x) => ({
        id: Number(x.id), name: x.name, status: x.status, venue: x.venue || null, startDate: day(x.start_date), endDate: day(x.end_date),
        teams: Number(x.teams), matchesPlayed: Number(x.done), matches: Number(x.total), champion: x.champion || null, replacements: replacedBy[Number(x.id)] || 0,
      })),
    };
  });
};

/* ----------------------------------- dashboard ----------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsBack = (n) => {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${pad(m.getMonth() + 1)}`, label: MONTHS[m.getMonth()] });
  }
  return out;
};
const series = (months, rows) => {
  const by = Object.fromEntries(rows.map((r) => [r.ym, Number(r.n)]));
  return months.map((m) => ({ month: m.key, label: m.label, value: by[m.key] || 0 }));
};

exports.dashboard = async () => {
  const months = monthsBack(6);
  const [[c]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM teams) AS teams,
       (SELECT COUNT(*) FROM players_core) AS players,
       (SELECT COUNT(DISTINCT organizer_admin_id) FROM tournaments) AS hosts,
       (SELECT COUNT(*) FROM tournaments) AS tournaments,
       (SELECT COUNT(*) FROM tournaments WHERE status = 'completed') AS tournaments_done,
       (SELECT COUNT(*) FROM matches WHERE status = 'completed') AS matches_done,
       (SELECT COUNT(*) FROM matches WHERE status = 'live') AS matches_live,
       (SELECT COUNT(*) FROM matches WHERE status = 'completed' AND winner_team_id IS NULL) AS ties_waiting,
       (SELECT COUNT(*) FROM villages WHERE status = 'pending') AS requests,
       (SELECT COUNT(*) FROM teams x WHERE x.logo IS NULL OR x.logo = '') AS no_logo,
       (SELECT COUNT(*) FROM teams x WHERE (SELECT COUNT(*) FROM players_core p WHERE p.team_id = x.id) < 11) AS short_squads,
       (SELECT COUNT(*) FROM bans b WHERE b.subject_type = 'player' AND ${ACTIVE_BAN}) AS banned_players,
       (SELECT COUNT(*) FROM bans b WHERE b.subject_type = 'team' AND ${ACTIVE_BAN}) AS banned_teams`
  );

  const [playedByMonth] = await db.query(
    `SELECT DATE_FORMAT(m.date, '%Y-%m') AS ym, COUNT(*) AS n FROM matches m WHERE m.status = 'completed' AND m.date >= ? GROUP BY ym ORDER BY ym`,
    [`${months[0].key}-01`]
  );
  const [teamsByMonth] = await db.query(`SELECT DATE_FORMAT(t.created_at, '%Y-%m') AS ym, COUNT(*) AS n FROM teams t WHERE t.created_at >= ? GROUP BY ym ORDER BY ym`, [`${months[0].key}-01`]);
  const [tournamentsByMonth] = await db.query(`SELECT DATE_FORMAT(t.start_date, '%Y-%m') AS ym, COUNT(*) AS n FROM tournaments t WHERE t.start_date >= ? GROUP BY ym ORDER BY ym`, [`${months[0].key}-01`]);
  const [byStatus] = await db.query(`SELECT status, COUNT(*) AS n FROM tournaments GROUP BY status`);

  // what is going on right now
  const [running] = await db.query(
    `SELECT tr.id, tr.name, tr.venue, tr.start_date, tr.end_date, tr.organizing_team,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = tr.id AND x.status = 'completed') AS done,
       (SELECT COUNT(*) FROM tournament_matches x WHERE x.tournament_id = tr.id) AS total
     FROM tournaments tr WHERE tr.status <> 'completed' AND tr.status <> 'cancelled' AND tr.status <> 'rejected' AND tr.end_date >= CURDATE() AND tr.start_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
     ORDER BY tr.start_date LIMIT 6`
  );

  // the latest things that happened, newest first
  const [reqs] = await db.query(`SELECT team_name, village_name, status, created_at FROM villages ORDER BY created_at DESC LIMIT 5`);
  const [newTournaments] = await db.query(`SELECT name, organizing_team, created_at FROM tournaments ORDER BY created_at DESC LIMIT 5`);
  const [banRows] = await db.query(
    `SELECT b.subject_type, b.reason, b.created_at, b.revoked_at, CASE b.subject_type WHEN 'team' THEN t.team_name ELSE p.players_name END AS subject
     FROM bans b LEFT JOIN teams t ON b.subject_type = 'team' AND t.id = b.subject_id LEFT JOIN players_core p ON b.subject_type = 'player' AND p.player_id = b.subject_id
     ORDER BY b.created_at DESC LIMIT 5`
  );
  const [finished] = await db.query(
    `SELECT m.match_id, m.date, t1.team_name AS team1, t2.team_name AS team2, w.team_name AS winner
     FROM matches m LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id LEFT JOIN teams w ON w.id = m.winner_team_id
     WHERE m.status = 'completed' ORDER BY m.date DESC, m.match_id DESC LIMIT 5`
  );
  const swaps = await optional(
    `SELECT r.created_at, tr.name AS tournament, o.team_name AS out_name, i.team_name AS in_name
     FROM tournament_replacements r JOIN tournaments tr ON tr.id = r.tournament_id JOIN teams o ON o.id = r.out_team_id JOIN teams i ON i.id = r.in_team_id ORDER BY r.created_at DESC LIMIT 5`
  );

  const activity = [
    ...reqs.map((r) => ({ kind: "request", at: r.created_at, text: `${r.team_name}${r.village_name ? ` (${r.village_name})` : ""} asked to join`, note: r.status, goTo: "teamRequests" })),
    ...newTournaments.map((r) => ({ kind: "tournament", at: r.created_at, text: `${r.organizing_team || "A host"} created ${r.name || "a tournament"}`, goTo: "hosts" })),
    ...banRows.map((r) => ({ kind: "ban", at: r.created_at, text: `${r.subject || "A " + r.subject_type} was banned: ${r.reason}`, note: r.revoked_at ? "revoked" : null, goTo: "bans" })),
    ...finished.map((r) => ({ kind: "result", at: r.date, text: `${r.team1} v ${r.team2}: ${r.winner ? `${r.winner} won` : "tied"}`, goTo: "results" })),
    ...swaps.map((r) => ({ kind: "replacement", at: r.created_at, text: `${r.in_name} replaced ${r.out_name} in ${r.tournament}`, goTo: "hosts" })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 12)
    .map((a) => ({ ...a, at: new Date(a.at).toISOString() }));

  const n = (v) => Number(v) || 0;
  const alerts = [];
  if (n(c.ties_waiting)) alerts.push({ tone: "red", text: `${c.ties_waiting} tied match${n(c.ties_waiting) === 1 ? " is" : "es are"} waiting for a tie-break`, goTo: "results" });
  if (n(c.requests)) alerts.push({ tone: "amber", text: `${c.requests} team request${n(c.requests) === 1 ? "" : "s"} waiting for approval`, goTo: "teamRequests" });
  if (n(c.matches_live)) alerts.push({ tone: "green", text: `${c.matches_live} match${n(c.matches_live) === 1 ? " is" : "es are"} live right now`, goTo: "results" });
  if (n(c.short_squads)) alerts.push({ tone: "slate", text: `${c.short_squads} team${n(c.short_squads) === 1 ? " has" : "s have"} fewer than 11 players`, goTo: "all-teams" });
  if (n(c.no_logo)) alerts.push({ tone: "slate", text: `${c.no_logo} team${n(c.no_logo) === 1 ? " has" : "s have"} no logo yet`, goTo: "all-teams" });

  return {
    counts: {
      teams: n(c.teams), players: n(c.players), hosts: n(c.hosts), tournaments: n(c.tournaments), tournamentsDone: n(c.tournaments_done),
      matchesDone: n(c.matches_done), matchesLive: n(c.matches_live), requests: n(c.requests), bannedPlayers: n(c.banned_players), bannedTeams: n(c.banned_teams),
    },
    trends: {
      matches: series(months, playedByMonth),
      teams: series(months, teamsByMonth),
      tournaments: series(months, tournamentsByMonth),
    },
    tournamentsByStatus: byStatus.map((r) => ({ status: r.status || "pending", count: Number(r.n) })),
    running: running.map((r) => ({
      id: Number(r.id), name: r.name, host: r.organizing_team || null, venue: r.venue || null, startDate: day(r.start_date), endDate: day(r.end_date), matchesPlayed: Number(r.done), matches: Number(r.total),
    })),
    alerts,
    activity,
  };
};
