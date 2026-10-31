// The association's view of everything: all teams, all players, all schedules, and changing the season plan.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const points = require("./pointsService");
const ratings = require("./ratingService");
const notifications = require("./notificationService");
const { addDays } = require("../utils/scheduleRules");

const like = (q) => `%${String(q || "").trim().replace(/[%_]/g, "")}%`;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s));
const day = (v) => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}` : String(v).slice(0, 10));

/* ---------------------------------- teams ---------------------------------- */

exports.teams = async ({ q } = {}) => {
  const text = String(q || "").trim();
  const [rows] = await db.query(
    `SELECT t.id, t.team_name, t.logo, a.admin_name, a.email, a.phone, v.village_name,
       (SELECT COUNT(*) FROM players_core p WHERE p.team_id = t.id) AS players,
       (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.team_id = t.id AND tp.status <> 'cancelled') AS tournaments,
       (SELECT COUNT(*) FROM bans b WHERE b.subject_type = 'team' AND b.subject_id = t.id AND b.revoked_at IS NULL AND b.starts_on <= CURDATE() AND (b.ends_on IS NULL OR b.ends_on >= CURDATE())) AS banned
     FROM teams t LEFT JOIN admins a ON a.id = t.admin_id LEFT JOIN villages v ON v.team_name = t.team_name AND v.status = 'approved'
     ${text ? "WHERE t.team_name LIKE ? OR v.village_name LIKE ? OR a.admin_name LIKE ?" : ""} ORDER BY t.team_name LIMIT 500`,
    text ? [like(text), like(text), like(text)] : []
  );
  const ranking = await points.teamRankings({ limit: 500 });
  const byId = Object.fromEntries(ranking.map((r) => [r.teamId, r]));
  const [[pending]] = await db.query(`SELECT COUNT(*) AS n FROM villages WHERE status = 'pending'`);
  return {
    pendingRequests: Number(pending.n),
    items: rows.map((t) => {
      const r = byId[Number(t.id)];
      return {
        id: Number(t.id), name: t.team_name, logo: t.logo || null, village: t.village_name || null,
        admin: { name: t.admin_name || null, email: t.email || null, phone: t.phone || null },
        players: Number(t.players), tournaments: Number(t.tournaments), banned: Number(t.banned) > 0,
        rank: r ? r.rank : null, points: r ? r.points : 0, titles: r ? r.titles : 0, played: r ? r.played : 0, won: r ? r.won : 0,
      };
    }),
  };
};

/* --------------------------------- players --------------------------------- */

exports.players = async ({ q, teamId, page = 1, pageSize = 25 } = {}) => {
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const where = [];
  const params = [];
  if (String(q || "").trim()) {
    where.push("(p.players_name LIKE ? OR p.mobile_number LIKE ? OR p.email LIKE ?)");
    params.push(like(q), like(q), like(q));
  }
  if (Number(teamId)) {
    where.push("p.team_id = ?");
    params.push(Number(teamId));
  }
  const cond = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM players_core p ${cond}`, params);
  const [rows] = await db.query(
    `SELECT p.player_id, p.players_name, p.mobile_number, p.email, p.profile_picture, p.is_banned, p.banned_until, p.team_id, t.team_name,
       (SELECT COUNT(*) FROM player_match_stats s WHERE s.player_id = p.player_id AND s.in_xi = 1) AS matches,
       (SELECT COALESCE(SUM(s.runs), 0) FROM player_match_stats s WHERE s.player_id = p.player_id) AS runs,
       (SELECT COALESCE(SUM(s.wickets), 0) FROM player_match_stats s WHERE s.player_id = p.player_id) AS wickets
     FROM players_core p LEFT JOIN teams t ON t.id = p.team_id ${cond} ORDER BY p.players_name LIMIT ? OFFSET ?`,
    [...params, size, (pg - 1) * size]
  );
  const rated = await ratings.all({});
  const byId = Object.fromEntries(rated.map((r) => [r.playerId, r]));
  const now = new Date();
  return {
    total: Number(count.n), page: pg, pageSize: size,
    items: rows.map((p) => ({
      id: Number(p.player_id), name: p.players_name, mobile: p.mobile_number, email: p.email, photo: p.profile_picture || null,
      teamId: p.team_id ? Number(p.team_id) : null, teamName: p.team_name || null,
      banned: !!p.is_banned && (!p.banned_until || new Date(p.banned_until) > now), bannedUntil: p.banned_until ? day(p.banned_until) : null,
      matches: Number(p.matches), runs: Number(p.runs), wickets: Number(p.wickets), rating: byId[Number(p.player_id)] ? byId[Number(p.player_id)].overall : null,
    })),
  };
};

/* -------------------------------- schedules -------------------------------- */

/** Every fixture and every reserved hosting date, for the association's calendar. */
exports.schedules = async ({ from, to, tournamentId } = {}) => {
  const where = ["tm.match_date IS NOT NULL"];
  const params = [];
  if (from && isDate(from)) { where.push("tm.match_date >= ?"); params.push(from); }
  if (to && isDate(to)) { where.push("tm.match_date < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(to); }
  if (Number(tournamentId)) { where.push("tm.tournament_id = ?"); params.push(Number(tournamentId)); }
  const [fixtures] = await db.query(
    `SELECT tm.id, tm.match_no, tm.stage, tm.group_name, tm.status, tm.venue, tm.tournament_id, tr.name AS tournament_name,
       DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS d, DATE_FORMAT(tm.match_time, '%H:%i') AS t, t1.team_name AS team1_name, t2.team_name AS team2_name
     FROM tournament_matches tm JOIN tournaments tr ON tr.id = tm.tournament_id LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id
     WHERE ${where.join(" AND ")} ORDER BY tm.match_date, tm.match_time, tm.match_no LIMIT 1000`,
    params
  );
  const [reservations] = await db.query(
    `SELECT s.id, s.start_date, s.end_date, s.reserved_days, s.status, s.tournament_id, tm.team_name AS host, tr.name AS tournament_name
     FROM tentative_tournament_schedules s LEFT JOIN teams tm ON tm.admin_id = s.organizer_admin_id LEFT JOIN tournaments tr ON tr.id = s.tournament_id
     ORDER BY s.start_date`
  );
  return {
    fixtures: fixtures.map((f) => ({
      id: f.id, matchNo: f.match_no, stage: f.stage, group: f.group_name, status: f.status, venue: f.venue || null, date: f.d, time: f.t,
      tournamentId: f.tournament_id, tournament: f.tournament_name, team1: f.team1_name || null, team2: f.team2_name || null,
    })),
    reservations: reservations.map((r) => ({
      id: r.id, startDate: day(r.start_date), endDate: day(r.end_date), days: r.reserved_days, status: r.status,
      host: r.host || null, tournamentId: r.tournament_id || null, tournament: r.tournament_name || null,
    })),
  };
};

/* ----------------------------- season plan changes ----------------------------- */

async function reservation(id) {
  const [[r]] = await db.query(
    `SELECT s.*, (SELECT t.id FROM teams t WHERE t.admin_id = s.organizer_admin_id LIMIT 1) AS team_id FROM tentative_tournament_schedules s WHERE s.id = ?`,
    [id]
  );
  if (!r) throw new ScoringError("Reservation not found", 404);
  return r;
}

/** Move a reservation that is still only reserved (no tournament made from it yet). */
exports.moveReservation = async (id, { startDate, reservedDays }) => {
  const r = await reservation(id);
  if (r.status !== "pending") throw new ScoringError(r.status === "cancelled" ? "This reservation was cancelled" : "The host has already created a tournament on these dates", 409);
  if (!isDate(startDate)) throw new ScoringError("Choose the new first day");
  const days = reservedDays === undefined || reservedDays === "" ? Number(r.reserved_days) : parseInt(reservedDays, 10);
  if (!Number.isInteger(days) || days < 1 || days > 7) throw new ScoringError("Reserve between 1 and 7 days");
  const end = addDays(startDate, days - 1);
  await db.query(`UPDATE tentative_tournament_schedules SET start_date = ?, end_date = ?, reserved_days = ? WHERE id = ?`, [startDate, end, days, id]);
  if (r.team_id) {
    await notifications.notifyTeams(db, [r.team_id], {
      type: "season_plan",
      title: "Your hosting dates were moved",
      body: `Your tournament is now planned for ${startDate} to ${end} (it was ${day(r.start_date)} to ${day(r.end_date)}).`,
      link: "hosting",
      dedupeKey: `hosting-moved:${id}:${startDate}`,
    });
  }
  return { id: Number(id), startDate, endDate: end, days };
};

exports.cancelReservation = async (id, reason) => {
  const r = await reservation(id);
  if (r.status === "cancelled") throw new ScoringError("Already cancelled", 409);
  if (r.status !== "pending") throw new ScoringError("The host has already created a tournament on these dates, so it cannot be cancelled here", 409);
  await db.query(`UPDATE tentative_tournament_schedules SET status = 'cancelled' WHERE id = ?`, [id]);
  if (r.team_id) {
    await notifications.notifyTeams(db, [r.team_id], {
      type: "season_plan",
      title: "Your hosting dates were cancelled",
      body: `${day(r.start_date)} to ${day(r.end_date)} is no longer reserved for your team.${reason ? ` Reason: ${String(reason).slice(0, 200)}` : ""}`,
      link: "hosting",
      dedupeKey: `hosting-cancelled:${id}`,
    });
  }
  return { cancelled: Number(id) };
};
