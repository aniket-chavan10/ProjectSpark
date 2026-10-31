#!/usr/bin/env node
// Test data for checking the scoring flow end to end: teams with logins, players, a tournament with the teams
// registered and grouped, squads, and the full match schedule (starting today), ready for a toss.
//
//   node scripts/seedTestData.js                 16 teams, 2-over matches, asks before it touches the database
//   node scripts/seedTestData.js --teams 32      a full 4 x 8 tournament (31 matches)
//   node scripts/seedTestData.js --overs 5       5-over matches
//   node scripts/seedTestData.js --clean         remove all test data and stop
//   node scripts/seedTestData.js --yes           do not ask
//   node scripts/seedTestData.js --password X    password for every test login (default Spark@123)
//
// Everything it creates can be told apart from real data:
//   logins end in @spark.test, team names start with "Test ", the tournament starts with "[TEST]".
// Running it again first removes the old test data, so it can be repeated as often as you like.
// It never changes a row that is not test data. (Run the migrations in backend/migrations first.)

const bcrypt = require("bcryptjs");
const format = require("../utils/tournamentFormat");
const rules = require("../utils/scheduleRules");
const { parseArgs, confirm, target, ymd, pad, table } = require("./_common");

const DOMAIN = "spark.test";
const DEFAULT_PASSWORD = "Spark@123";
const TOURNAMENT_PREFIX = "[TEST] ";
const TEAM_PREFIX = "Test ";
const MASTER_USERNAME = "testassociation";

const PLACES = [
  "Rampur", "Jaoli", "Shivneri", "Kasarwadi", "Dhamni", "Panchgani", "Medha", "Wai", "Satara", "Karad", "Patan", "Koyna",
  "Mahabaleshwar", "Bhor", "Lonand", "Phaltan", "Khandala", "Mhaswad", "Vaduj", "Dahiwadi", "Pusegaon", "Koregaon", "Rahimatpur", "Umbraj",
  "Tarale", "Malkapur", "Shirwal", "Nagthane", "Kale", "Targaon", "Ozarde", "Bamnoli",
];
const FIRST = ["Aman", "Rohit", "Sachin", "Vikas", "Nilesh", "Pravin", "Amol", "Sunil", "Deepak", "Ganesh", "Tushar", "Kiran", "Mahesh", "Rahul", "Yogesh", "Santosh", "Ajay", "Vishal", "Omkar", "Swapnil", "Harsh", "Ravi", "Akash", "Pratik", "Sagar", "Nitin", "Suraj", "Rajesh", "Mangesh", "Onkar"];
const LAST = ["Patil", "More", "Jadhav", "Shinde", "Pawar", "Gaikwad", "Mane", "Salunkhe", "Bhosale", "Sawant", "Dalvi", "Chavan", "Thorat", "Kadam", "Nikam", "Mohite", "Raut", "Jagtap", "Kamble", "Gurav", "Kale", "Deshmukh", "Kulkarni", "Phadtare"];

/* ------------------------------ pure helpers ------------------------------ */

/** Teams to create: name, admin login, phone. Team 1 is the host (organiser). */
function buildTeams(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const place = PLACES[i % PLACES.length];
    return {
      n,
      village: place,
      name: `${TEAM_PREFIX}${place}${i >= PLACES.length ? ` ${Math.floor(i / PLACES.length) + 1}` : ""}`,
      adminName: `${place} Admin`,
      email: `team${pad(n)}@${DOMAIN}`,
      phone: `98${pad(n, 8)}`,
      organizer: n === 1,
    };
  });
}

/** 15 players for a team: unique names, mobile numbers and emails (those columns are unique in the database). */
function buildPlayers(teamNumber, perTeam = 15) {
  return Array.from({ length: perTeam }, (_, p) => {
    const index = (teamNumber - 1) * perTeam + p;
    return {
      name: `${FIRST[index % FIRST.length]} ${LAST[Math.floor(index / FIRST.length) % LAST.length]}`,
      mobile: `9${pad(1000 + teamNumber, 4)}${pad(p + 1, 5)}`,
      email: `t${pad(teamNumber)}p${pad(p + 1)}@${DOMAIN}`,
    };
  });
}

/** 4 groups (or 2 when there are fewer than 16 teams), teams dealt in order: A gets teams 1..k, B the next k ... */
function assignGroups(teamIds) {
  const groupCount = teamIds.length >= 16 ? 4 : 2;
  const size = teamIds.length / groupCount;
  return Array.from({ length: groupCount }, (_, g) => ({ group_name: "ABCD"[g], teams: teamIds.slice(g * size, (g + 1) * size) }));
}

/** The fixtures and their times, planned with the same engine the host's schedule screen uses. */
function planSchedule(groups, { startDate, overs }) {
  const { matches } = format.buildFixtures(groups, { thirdPlaceMatch: false });
  const days = [0, 1, 2].map((d) => rules.addDays(startDate, d));
  const oversByRound = { 1: overs, 2: overs, 3: overs, 4: overs, semi: overs, third_place: overs, final: overs };
  const plan = rules.autoPlan(matches, { days, dayStart: "08:00", dayEnd: "19:00", gapMinutes: 5, restFriendly: true, overs: oversByRound });
  const slotOf = Object.fromEntries(plan.slots.map((s) => [s.match_no, s]));
  return matches.map((m) => ({ ...m, slot: slotOf[m.match_no] }));
}

/* --------------------------------- cleaning --------------------------------- */

const MISSING = new Set(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"]); // a migration that was not run yet

async function tryQuery(conn, sql, params) {
  try {
    return await conn.query(sql, params);
  } catch (err) {
    if (MISSING.has(err.code)) return [[], []];
    throw err;
  }
}

/** Remove every row the seed created. Real data is never matched: only @spark.test logins, "Test " teams, "[TEST]" tournaments. */
async function clean(conn) {
  const [admins] = await conn.query(`SELECT id, team_name FROM admins WHERE email LIKE ?`, [`%@${DOMAIN}`]);
  const adminIds = admins.map((a) => a.id);
  const teamNames = admins.map((a) => a.team_name);
  const [teams] = teamNames.length ? await conn.query(`SELECT id FROM teams WHERE team_name IN (?) AND admin_id IN (?)`, [teamNames, adminIds]) : [[]];
  const teamIds = teams.map((t) => t.id);
  const [tournaments] = await conn.query(`SELECT id FROM tournaments WHERE name LIKE ?`, [`${TOURNAMENT_PREFIX}%`]);
  const tournamentIds = tournaments.map((t) => t.id);
  const [players] = teamIds.length ? await conn.query(`SELECT player_id FROM players_core WHERE team_id IN (?)`, [teamIds]) : [[]];
  const playerIds = players.map((p) => p.player_id);

  const [matches] = tournamentIds.length ? await conn.query(`SELECT match_id FROM matches WHERE tournament_id IN (?)`, [tournamentIds]) : [[]];
  const matchIds = matches.map((m) => m.match_id);
  const [innings] = matchIds.length ? await conn.query(`SELECT inning_id FROM innings WHERE match_id IN (?)`, [matchIds]) : [[]];
  const inningIds = innings.map((i) => i.inning_id);
  const [fixtures] = tournamentIds.length ? await conn.query(`SELECT id FROM tournament_matches WHERE tournament_id IN (?)`, [tournamentIds]) : [[]];
  const fixtureIds = fixtures.map((f) => f.id);

  const removed = {};
  const del = async (name, sql, list) => {
    if (!list.length) return;
    const [res] = await tryQuery(conn, sql, [list]);
    if (res && res.affectedRows) removed[name] = (removed[name] || 0) + res.affectedRows;
  };

  // scoring data first (rows that point at innings, matches and players)
  await del("balls", `DELETE FROM balls WHERE inning_id IN (?)`, inningIds);
  await del("overs", `DELETE FROM overs WHERE inning_id IN (?)`, inningIds);
  await del("penalties", `DELETE FROM penalties WHERE inning_id IN (?)`, inningIds);
  await del("live scorecards", `DELETE FROM live_scorecards WHERE match_id IN (?)`, matchIds);
  await del("player performance", `DELETE FROM player_performance WHERE match_id IN (?)`, matchIds);
  await del("player match stats", `DELETE FROM player_match_stats WHERE match_id IN (?)`, matchIds);
  await del("tie-breaks", `DELETE FROM match_tiebreaks WHERE match_id IN (?)`, matchIds);
  await del("overlay state", `DELETE FROM match_overlay WHERE match_id IN (?)`, matchIds);
  await del("innings", `DELETE FROM innings WHERE match_id IN (?)`, matchIds);
  await del("match squads", `DELETE FROM match_squads WHERE tournament_match_id IN (?)`, fixtureIds);
  await del("fixtures", `DELETE FROM tournament_matches WHERE tournament_id IN (?)`, tournamentIds);
  await del("matches", `DELETE FROM matches WHERE tournament_id IN (?)`, tournamentIds);

  // tournament level
  await del("squads", `DELETE FROM tournament_squads WHERE tournament_id IN (?)`, tournamentIds);
  await del("points", `DELETE FROM team_points WHERE tournament_id IN (?)`, tournamentIds);
  await del("final positions", `DELETE FROM tournament_results WHERE tournament_id IN (?)`, tournamentIds);
  await del("awards", `DELETE FROM awards WHERE tournament_id IN (?)`, tournamentIds);
  await del("awards", `DELETE FROM awards WHERE subject_type = 'player' AND subject_id IN (?)`, playerIds);
  await del("awards", `DELETE FROM awards WHERE subject_type = 'team' AND subject_id IN (?)`, teamIds);
  await del("registrations", `DELETE FROM tournament_participants WHERE tournament_id IN (?)`, tournamentIds);
  await del("progress", `DELETE FROM tournament_progress WHERE tournament_id IN (?)`, tournamentIds);
  await del("old notifications", `DELETE FROM notifications WHERE tournament_id IN (?)`, tournamentIds);
  await del("tournaments", `DELETE FROM tournaments WHERE id IN (?)`, tournamentIds);
  await del("reserved dates", `DELETE FROM tentative_tournament_schedules WHERE organizer_admin_id IN (?)`, adminIds);

  // teams, players, logins
  await del("old notifications", `DELETE FROM notifications WHERE recipient_admin_id IN (?)`, adminIds);
  await del("team notifications", `DELETE FROM team_notifications WHERE team_id IN (?)`, teamIds);
  await del("team bans", `DELETE FROM bans WHERE subject_type = 'team' AND subject_id IN (?)`, teamIds);
  await del("player bans", `DELETE FROM bans WHERE subject_type = 'player' AND subject_id IN (?)`, playerIds);
  await del("player stats", `DELETE FROM players_stats WHERE player_id IN (?)`, playerIds);
  await del("old squads", `DELETE FROM teams_squad WHERE team_id IN (?)`, teamIds);
  await del("players", `DELETE FROM players_core WHERE team_id IN (?)`, teamIds);
  await del("team stats", `DELETE FROM team_stats WHERE team_id IN (?)`, teamIds);
  await del("teams", `DELETE FROM teams WHERE id IN (?)`, teamIds);
  await del("villages", `DELETE FROM villages WHERE email_address LIKE '%@${DOMAIN}'`, [1]);
  await del("admins", `DELETE FROM admins WHERE id IN (?)`, adminIds);
  await del("test association login", `DELETE FROM master_admins WHERE username = '${MASTER_USERNAME}'`, [1]);
  return removed;
}

/* ---------------------------------- seeding ---------------------------------- */

/**
 * @param conn  a connection (inside a transaction)
 * @param opts  { teams, overs, password, today: Date }
 * @returns what was made, for the summary
 */
async function seed(conn, { teams: teamCount = 16, overs = 2, password = DEFAULT_PASSWORD, today = new Date() } = {}) {
  const hash = bcrypt.hashSync(password, 10);
  const teams = buildTeams(teamCount);
  const startDate = ymd(today);
  const endDate = rules.addDays(startDate, 2);

  // the association's login for the tests
  await conn.query(`INSERT INTO master_admins (username, password, email_address) VALUES (?, ?, ?)`, [MASTER_USERNAME, hash, `association@${DOMAIN}`]);

  // each team: an approved village, its admin login, the team, and its players
  for (const t of teams) {
    const [a] = await conn.query(`INSERT INTO admins (admin_name, email, password, phone, team_name, role, is_organizer) VALUES (?, ?, ?, ?, ?, 'admin', ?)`, [t.adminName, t.email, hash, t.phone, t.name, t.organizer ? 1 : 0]);
    t.adminId = a.insertId;
    const [tm] = await conn.query(`INSERT INTO teams (team_name, admin_id) VALUES (?, ?)`, [t.name, t.adminId]);
    t.id = tm.insertId;
    await conn.query(`INSERT INTO villages (village_name, team_name, admin_name, email_address, phone_number, status) VALUES (?, ?, ?, ?, ?, 'approved')`, [t.village, t.name, t.adminName, t.email, t.phone]);
    const people = buildPlayers(t.n);
    await conn.query(`INSERT INTO players_core (team_id, players_name, mobile_number, email, password) VALUES ?`, [people.map((p) => [t.id, p.name, p.mobile, p.email, hash])]);
    const [rows] = await conn.query(`SELECT player_id FROM players_core WHERE team_id = ? ORDER BY player_id`, [t.id]);
    t.playerIds = (rows || []).map((r) => r.player_id);
  }
  const host = teams[0];

  // the dates reserved for the host, and the tournament made from them
  const [tentative] = await conn.query(
    `INSERT INTO tentative_tournament_schedules (organizer_admin_id, start_date, end_date, reserved_days, status) VALUES (?, ?, ?, 3, 'allocated')`,
    [host.adminId, startDate, endDate]
  );
  const [tour] = await conn.query(
    `INSERT INTO tournaments (tentative_id, start_date, end_date, organizer_admin_id, name, venue, status, organizing_team, total_slots, available_slots, application_deadline, current_step)
     VALUES (?, ?, ?, ?, ?, 'Test Ground', 'open', ?, ?, 0, DATE_SUB(?, INTERVAL 4 DAY), 4)`,
    [tentative.insertId, startDate, endDate, host.adminId, `${TOURNAMENT_PREFIX}Diwali Cup`, host.name, teamCount, startDate]
  );
  const tournamentId = tour.insertId;
  await conn.query(`UPDATE tentative_tournament_schedules SET tournament_id = ? WHERE id = ?`, [tournamentId, tentative.insertId]);
  await conn.query(`INSERT INTO tournament_progress (tournament_id, teams_created, groups_created, schedule_created, matches_started) VALUES (?, 1, 1, 1, 0)`, [tournamentId]);

  // registrations, already in their groups
  const groups = assignGroups(teams.map((t) => t.id));
  const groupOf = {};
  groups.forEach((g) => g.teams.forEach((id) => (groupOf[id] = g.group_name)));
  await conn.query(`INSERT INTO tournament_participants (tournament_id, team_id, group_name, status) VALUES ?`, [teams.map((t) => [tournamentId, t.id, groupOf[t.id], "confirmed"])]);

  // squads: first 11 play (the 2nd captains, the 5th keeps wicket), the next 4 are reserves
  let squads = 0;
  try {
    const rows = teams.flatMap((t) => t.playerIds.slice(0, 15).map((id, i) => [tournamentId, t.id, id, i < 11 ? "playing" : "reserve", i < 11 ? i + 1 : null, i + 1, i === 1 ? 1 : 0, i === 4 ? 1 : 0]));
    await conn.query(`INSERT INTO tournament_squads (tournament_id, team_id, player_id, role, batting_order, jersey_number, is_captain, is_keeper) VALUES ?`, [rows]);
    squads = rows.length;
  } catch (err) {
    if (!MISSING.has(err.code)) throw err;
    console.warn("  (squads skipped: run backend/migrations/2026-11-01-squads.sql, then seed again)");
  }

  // the schedule
  const fixtures = planSchedule(groups, { startDate, overs });
  const idByNo = {};
  for (const m of fixtures) {
    const [res] = await conn.query(
      `INSERT INTO tournament_matches
         (match_no, tournament_id, stage, round_number, group_name, team1_id, team2_id, match_date, match_time, venue, overs, duration_minutes,
          dependent_match1_id, dependent_match1_type, dependent_match2_id, dependent_match2_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Test Ground', ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        m.match_no, tournamentId, m.stage, m.round, m.group, m.team1Id, m.team2Id, m.slot.match_date, `${m.slot.match_date} ${m.slot.start_time}:00`, m.slot.overs, m.slot.duration_minutes,
        m.dep1 ? idByNo[m.dep1.matchNo] : null, m.dep1 ? m.dep1.type : "winner", m.dep2 ? idByNo[m.dep2.matchNo] : null, m.dep2 ? m.dep2.type : "winner",
      ]
    );
    idByNo[m.match_no] = res.insertId;
  }

  return { teams, tournamentId, fixtures: fixtures.map((m) => ({ ...m, fixtureId: idByNo[m.match_no] })), squads, startDate, overs, password, host };
}

/* ----------------------------------- main ----------------------------------- */

function summary(r) {
  const name = (id) => (r.teams.find((t) => t.id === id) || {}).name;
  console.log("\n========================  TEST DATA READY  ========================\n");
  console.log(`Tournament  : ${TOURNAMENT_PREFIX}Diwali Cup (id ${r.tournamentId}), ${r.teams.length} teams, ${r.fixtures.length} matches of ${r.overs} overs, starting ${r.startDate}`);
  console.log(`Password    : ${r.password}   (the same for every test login below)\n`);
  console.log("LOGINS");
  console.log(`  Association (master admin)   username: ${MASTER_USERNAME}`);
  console.log(`  Host team admin (organiser)  email:    ${r.host.email}   <- opens Organize, schedule, and starts the matches`);
  console.log(`  Other team admins            email:    team02@${DOMAIN} ... team${pad(r.teams.length)}@${DOMAIN}`);
  console.log(`  Players                      email:    t01p01@${DOMAIN} ... (players cannot log in yet)\n`);
  console.log("FIRST MATCHES (ready for the toss)");
  table(
    r.fixtures.filter((m) => m.stage === "group" && m.round === 1).slice(0, 8),
    [["#", (m) => m.match_no], ["fixture id", (m) => m.fixtureId], ["group", (m) => m.group], ["match", (m) => `${name(m.team1Id)} v ${name(m.team2Id)}`], ["time", (m) => `${m.slot.match_date} ${m.slot.start_time}`]]
  );
  console.log("\nTO CHECK SCORING");
  console.log(`  1. Log in at /sign-in as ${r.host.email}, open Organize, choose the tournament, and press Start on a match`);
  console.log("     (or open /match/<fixture id> while logged in as the host).");
  console.log("  2. Do the toss, choose the openers and the bowler, then score. The squads are already named.");
  console.log("  3. When a match ends, its winner appears in the next round, points and ratings are written.");
  console.log(`  4. Public pages: /results, /rankings, /tournaments/${r.tournamentId}. Overlay: /overlay/<match id>?bg=dark\n`);
  console.log(`Remove it all later with:  node scripts/seedTestData.js --clean\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  require("dotenv").config();
  const teamCount = args.teams ? parseInt(args.teams, 10) : 16;
  const overs = args.overs ? parseInt(args.overs, 10) : 2;
  if (![4, 8, 16, 32].includes(teamCount)) throw new Error("--teams must be 4, 8, 16 or 32");
  if (!Number.isInteger(overs) || overs < 1 || overs > 20) throw new Error("--overs must be 1 to 20");

  console.log(`\nDatabase: ${target()}`);
  console.log(args.clean ? "This will REMOVE all test data (logins @spark.test, teams named \"Test ...\", tournaments \"[TEST] ...\")." : `This will remove any earlier test data and create ${teamCount} test teams with a tournament and schedule.`);
  console.log("Real data is not touched.");
  if (!(await confirm("Continue?", args.yes))) return console.log("Cancelled. Nothing was changed.");

  const db = require("../dbconfigure");
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const removed = await clean(conn);
    const parts = Object.entries(removed).map(([k, v]) => `${v} ${k}`);
    if (parts.length) console.log(`Removed old test data: ${parts.join(", ")}`);
    if (args.clean) {
      await conn.commit();
      return console.log("Done.");
    }
    const result = await seed(conn, { teams: teamCount, overs, password: typeof args.password === "string" ? args.password : DEFAULT_PASSWORD });
    await conn.commit();
    summary(result);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await db.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("\nFailed, and nothing was changed:", err.message);
    if (/ER_BAD_FIELD_ERROR|Unknown column/.test(err.message)) console.error("A column is missing. Run the files in backend/migrations first (2026-10-31, 2026-11-01).");
    process.exit(1);
  });
}

module.exports = { buildTeams, buildPlayers, assignGroups, planSchedule, seed, clean, DOMAIN, DEFAULT_PASSWORD, MASTER_USERNAME };
