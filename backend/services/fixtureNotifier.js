const dateOnly = require("../utils/dateOnly");
// Notifications about WHEN teams play: the schedule of a tournament was saved, a team's next match became
// known (the bracket advanced), and the association's season plan. Failures here never block the action
// that caused them.

const db = require("../dbconfigure");
const notifications = require("./notificationService");

const FIXTURE_SQL = `
  SELECT tm.id, tm.match_no, tm.stage, tm.group_name, tm.team1_id, tm.team2_id, tm.venue,
         DATE_FORMAT(tm.match_date, '%a %e %b') AS day_text, DATE_FORMAT(tm.match_time, '%H:%i') AS time_text,
         t1.team_name AS team1_name, t2.team_name AS team2_name
  FROM tournament_matches tm
  LEFT JOIN teams t1 ON t1.id = tm.team1_id LEFT JOIN teams t2 ON t2.id = tm.team2_id`;

const when = (f) => [f.day_text, f.time_text].filter(Boolean).join(", ");
const where = (f) => (f.venue ? ` at ${f.venue}` : "");
const opponentOf = (f, teamId) => (Number(f.team1_id) === Number(teamId) ? f.team2_name : f.team1_name);

/** The host saved the tournament schedule: every team that already has a match is told its first one. */
exports.scheduleReleased = async (conn, tournamentId) => {
  try {
    const [[t]] = await conn.query(`SELECT name FROM tournaments WHERE id = ?`, [tournamentId]);
    const [fixtures] = await conn.query(`${FIXTURE_SQL} WHERE tm.tournament_id = ? AND tm.team1_id IS NOT NULL AND tm.team2_id IS NOT NULL AND tm.match_date IS NOT NULL ORDER BY tm.match_date, tm.match_time, tm.match_no`, [tournamentId]);
    const first = new Map();
    fixtures.forEach((f) => [f.team1_id, f.team2_id].forEach((id) => !first.has(Number(id)) && first.set(Number(id), f)));
    const stamp = Date.now();
    for (const [teamId, f] of first) {
      await notifications.notifyTeams(conn, [teamId], {
        type: "match_scheduled",
        title: `Match schedule released: ${t ? t.name : "your tournament"}`,
        body: `Your first match: Match ${f.match_no} vs ${opponentOf(f, teamId)}, ${when(f)}${where(f)}. Later rounds depend on results.`,
        link: `tournament:${tournamentId}`,
        dedupeKey: `schedule:${tournamentId}:${stamp}`,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.error("Schedule saved, but the teams could not be notified:", err.message);
  }
};

/** A match finished: the matches it feeds may now have both teams. Tell those teams when they play. */
exports.nextMatchesKnown = async (conn, matchId) => {
  const [[tm]] = await conn.query(`SELECT id FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
  if (!tm) return;
  const [next] = await conn.query(
    `${FIXTURE_SQL} WHERE (tm.dependent_match1_id = ? OR tm.dependent_match2_id = ?) AND tm.team1_id IS NOT NULL AND tm.team2_id IS NOT NULL`,
    [tm.id, tm.id]
  );
  for (const f of next) {
    await notifications.notifyTeams(conn, [f.team1_id, f.team2_id], {
      type: "match_scheduled",
      title: `Your next match: ${f.team1_name} vs ${f.team2_name}`,
      body: f.day_text ? `Match ${f.match_no}, ${when(f)}${where(f)}.` : `Match ${f.match_no}. The time will be announced by the host.`,
      link: `tournament:${f.id}`,
      dedupeKey: `next:${f.id}`,
    });
  }
};

/** The result was undone: the next match is no longer known. */
exports.nextMatchesWithdrawn = async (conn, matchId) => {
  const [[tm]] = await conn.query(`SELECT id FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
  if (!tm) return;
  const [next] = await conn.query(`SELECT id FROM tournament_matches WHERE dependent_match1_id = ? OR dependent_match2_id = ?`, [tm.id, tm.id]);
  for (const f of next) await notifications.withdraw(conn, `next:${f.id}`);
};

/** The association reserved dates for a hosting team: that team is told. */
exports.hostingReserved = async (organizerAdminId, startDate, endDate) => {
  try {
    const [teams] = await db.query(`SELECT id FROM teams WHERE admin_id = ?`, [organizerAdminId]);
    await notifications.notifyTeams(db, teams.map((t) => t.id), {
      type: "season_plan",
      title: "Dates reserved for you to host",
      body: `The association has reserved ${dateOnly(startDate)} to ${dateOnly(endDate)} for your team to host a tournament.`,
      link: "hosting",
      dedupeKey: `hosting:${organizerAdminId}:${dateOnly(startDate)}`,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.error("Dates saved, but the hosting team could not be notified:", err.message);
  }
};

/** The association releases the season plan: every team is told who hosts when. */
exports.seasonPlanReleased = async () => {
  const [rows] = await db.query(
    `SELECT s.start_date, s.end_date, tm.team_name,
            DATE_FORMAT(s.start_date, '%e %b') AS from_text, DATE_FORMAT(s.end_date, '%e %b') AS to_text
     FROM tentative_tournament_schedules s LEFT JOIN teams tm ON tm.admin_id = s.organizer_admin_id
     WHERE s.end_date >= CURDATE() AND s.status <> 'cancelled' ORDER BY s.start_date`
  );
  if (!rows.length) return { notified: 0, dates: 0 };
  const list = rows.map((r) => `${r.from_text}-${r.to_text}: ${r.team_name || "to be decided"}`);
  let body = list.join(" | ");
  if (body.length > 480) body = `${body.slice(0, 477)}...`;
  const teamIds = await notifications.allTeamIds(db);
  const notified = await notifications.notifyTeams(db, teamIds, {
    type: "season_plan",
    title: "Season schedule released",
    body,
    link: "hosting",
    dedupeKey: `season:${Date.now()}`,
  });
  return { notified, dates: rows.length };
};
