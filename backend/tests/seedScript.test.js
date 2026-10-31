// The test-data script: what it builds, and that it never touches rows that are not test data.
// A scripted connection stands in for MySQL and records every statement.

jest.mock("bcryptjs", () => ({ hashSync: (v) => `hash:${v}`, compareSync: (plain, hash) => hash === `hash:${plain}` }), { virtual: true });

const seedScript = require("../scripts/seedTestData");
const reset = require("../scripts/resetLogin");
const format = require("../utils/tournamentFormat");

/** A connection that answers inserts with growing ids and selects from `tables`; keeps a log. */
function scripted(tables = {}) {
  const log = [];
  let id = 100;
  const conn = {
    log,
    query: async (sql, params = []) => {
      const text = sql.replace(/\s+/g, " ").trim();
      log.push({ text, params });
      if (/^INSERT/i.test(text)) return [{ insertId: ++id, affectedRows: Array.isArray(params[0]) ? params[0].length : 1 }, []];
      if (/^SELECT player_id FROM players_core WHERE team_id = \?/.test(text)) return [Array.from({ length: 15 }, (_, i) => ({ player_id: params[0] * 1000 + i })), []];
      for (const [pattern, rows] of Object.entries(tables)) if (text.includes(pattern)) return [rows, []];
      if (/^DELETE/i.test(text)) return [{ affectedRows: 1 }, []];
      return [[], []];
    },
  };
  return conn;
}

const inserts = (conn, table) => conn.log.filter((l) => l.text.startsWith(`INSERT INTO ${table} `));

describe("what the seed builds", () => {
  test("teams are clearly test teams, with unique logins and one host", () => {
    const teams = seedScript.buildTeams(32);
    expect(teams).toHaveLength(32);
    expect(new Set(teams.map((t) => t.name)).size).toBe(32);
    expect(new Set(teams.map((t) => t.email)).size).toBe(32);
    expect(teams.every((t) => t.name.startsWith("Test ") && t.email.endsWith("@spark.test"))).toBe(true);
    expect(teams.filter((t) => t.organizer).map((t) => t.email)).toEqual(["team01@spark.test"]);
  });

  test("mobiles and emails are unique across every player (the database requires it)", () => {
    const all = Array.from({ length: 32 }, (_, i) => seedScript.buildPlayers(i + 1)).flat();
    expect(all).toHaveLength(32 * 15);
    expect(new Set(all.map((p) => p.mobile)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.email)).size).toBe(all.length);
    expect(all.every((p) => /^\d{10}$/.test(p.mobile))).toBe(true);
  });

  test("16 teams make 4 groups of 4, 32 make 4 groups of 8, fewer make 2 groups", () => {
    const ids = (n) => Array.from({ length: n }, (_, i) => i + 1);
    expect(seedScript.assignGroups(ids(16)).map((g) => g.teams.length)).toEqual([4, 4, 4, 4]);
    expect(seedScript.assignGroups(ids(32)).map((g) => g.group_name)).toEqual(["A", "B", "C", "D"]);
    expect(seedScript.assignGroups(ids(8)).map((g) => g.teams.length)).toEqual([4, 4]);
  });

  test("the schedule has the right number of matches, all with a time, in the order feeders come first", () => {
    for (const [teams, matches] of [[16, 15], [32, 31], [8, 7]]) {
      const groups = seedScript.assignGroups(Array.from({ length: teams }, (_, i) => i + 1));
      const plan = seedScript.planSchedule(groups, { startDate: "2026-11-06", overs: 2 });
      expect(plan).toHaveLength(matches);
      expect(plan.every((m) => m.slot && m.slot.match_date && m.slot.start_time && m.slot.overs === 2)).toBe(true);
      plan.forEach((m) => [m.dep1, m.dep2].filter(Boolean).forEach((d) => expect(d.matchNo).toBeLessThan(m.match_no)));
      expect(plan.filter((m) => m.stage === format.STAGE.FINAL)).toHaveLength(1);
    }
  });
});

describe("seeding", () => {
  const run = (opts = {}) => {
    const conn = scripted();
    return seedScript.seed(conn, { today: new Date(2026, 10, 6), ...opts }).then((result) => ({ conn, result }));
  };

  test("creates every login with the one password, hashed", async () => {
    const { conn, result } = await run({ teams: 16, password: "Open-Sesame1" });
    expect(inserts(conn, "master_admins")[0].params).toEqual(["testassociation", "hash:Open-Sesame1", "association@spark.test"]);
    const admins = inserts(conn, "admins");
    expect(admins).toHaveLength(16);
    expect(admins.every((a) => a.params[2] === "hash:Open-Sesame1" && a.params[1].endsWith("@spark.test"))).toBe(true);
    expect(admins[0].params[5]).toBe(1); // the host is marked as an organiser
    expect(admins[1].params[5]).toBe(0);
    expect(inserts(conn, "teams")).toHaveLength(16);
    expect(inserts(conn, "villages")).toHaveLength(16);
    expect(inserts(conn, "players_core")).toHaveLength(16);
    expect(inserts(conn, "players_core")[0].params[0]).toHaveLength(15);
    expect(result.password).toBe("Open-Sesame1");
  });

  test("the tournament, its dates, registrations and squads", async () => {
    const { conn, result } = await run({ teams: 16, overs: 3 });
    const tournament = inserts(conn, "tournaments")[0];
    expect(tournament.params[1]).toBe("2026-11-06");
    expect(tournament.params[2]).toBe("2026-11-08"); // three days
    expect(tournament.params[4]).toBe("[TEST] Diwali Cup");
    expect(inserts(conn, "tentative_tournament_schedules")[0].params[2]).toBe("2026-11-08");

    const participants = inserts(conn, "tournament_participants")[0].params[0];
    expect(participants).toHaveLength(16);
    expect(participants.every((p) => p[3] === "confirmed")).toBe(true);
    expect(new Set(participants.map((p) => p[2]))).toEqual(new Set(["A", "B", "C", "D"]));

    const squads = inserts(conn, "tournament_squads")[0].params[0];
    expect(squads).toHaveLength(16 * 15);
    const one = squads.filter((r) => r[1] === result.teams[0].id);
    expect(one.filter((r) => r[3] === "playing")).toHaveLength(11);
    expect(one.filter((r) => r[3] === "reserve")).toHaveLength(4);
    expect(one.filter((r) => r[6] === 1)).toHaveLength(1); // one captain
    expect(one.filter((r) => r[7] === 1)).toHaveLength(1); // one keeper
  });

  test("the fixtures are saved with the overs asked for and point at the matches that feed them", async () => {
    const { conn, result } = await run({ teams: 16, overs: 3 });
    const fixtures = inserts(conn, "tournament_matches");
    expect(fixtures).toHaveLength(15);
    expect(fixtures.every((f) => f.params[9] === 3)).toBe(true); // overs
    const final = result.fixtures.find((m) => m.stage === "final");
    const finalRow = fixtures[result.fixtures.indexOf(final)];
    expect(finalRow.params[12]).not.toBeNull(); // dependent_match1_id is a real id
    expect(result.fixtures.every((m) => m.fixtureId)).toBe(true);
    // every fixture starts as 'scheduled' so the toss is available
    expect(fixtures.every((f) => f.text.includes("'scheduled'"))).toBe(true);
  });

  test("it only ever writes test rows", async () => {
    const { conn } = await run({ teams: 8 });
    const wrote = conn.log.filter((l) => /^(INSERT|UPDATE|DELETE)/.test(l.text));
    expect(wrote.every((l) => !/^DELETE/.test(l.text))).toBe(true); // seeding itself deletes nothing
    expect(inserts(conn, "admins").every((l) => l.params[1].endsWith("@spark.test"))).toBe(true);
    expect(inserts(conn, "teams").every((l) => l.params[0].startsWith("Test "))).toBe(true);
  });
});

describe("cleaning", () => {
  test("finds test data only by its markers and removes it children first", async () => {
    const conn = scripted({
      "FROM admins WHERE email LIKE": [{ id: 7, team_name: "Test Rampur" }],
      "FROM teams WHERE team_name IN": [{ id: 70 }],
      "FROM tournaments WHERE name LIKE": [{ id: 5 }],
      "FROM players_core WHERE team_id IN": [{ player_id: 700 }],
      "FROM matches WHERE tournament_id IN": [{ match_id: 50 }],
      "FROM innings WHERE match_id IN": [{ inning_id: 500 }],
      "FROM tournament_matches WHERE tournament_id IN": [{ id: 900 }],
    });
    const removed = await seedScript.clean(conn);
    const selects = conn.log.filter((l) => l.text.startsWith("SELECT"));
    expect(selects[0].params).toEqual(["%@spark.test"]);
    expect(selects.find((l) => l.text.includes("FROM tournaments")).params).toEqual(["[TEST] %"]);

    const order = conn.log.filter((l) => l.text.startsWith("DELETE")).map((l) => l.text.match(/DELETE FROM (\w+)/)[1]);
    const before = (a, b) => expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
    before("balls", "innings");
    before("overs", "innings");
    before("innings", "matches");
    before("tournament_matches", "matches");
    before("tournament_participants", "tournaments");
    before("tournaments", "tentative_tournament_schedules");
    before("players_core", "teams");
    before("teams", "admins");
    expect(removed.balls).toBe(1);
    // every delete is limited by ids found from the markers, never a bare table delete
    conn.log.filter((l) => l.text.startsWith("DELETE")).forEach((l) => expect(l.text).toMatch(/WHERE/));
  });

  test("with no test data, the only deletes are the two that match a marker by themselves", async () => {
    const conn = scripted();
    await seedScript.clean(conn);
    const deletes = conn.log.filter((l) => l.text.startsWith("DELETE")).map((l) => l.text);
    expect(deletes).toHaveLength(2);
    expect(deletes[0]).toContain("villages WHERE email_address LIKE '%@spark.test'");
    expect(deletes[1]).toContain("master_admins WHERE username = 'testassociation'");
  });

  test("a table from a migration that was not run is skipped, not an error", async () => {
    const conn = scripted({ "FROM admins WHERE email LIKE": [{ id: 7, team_name: "Test X" }], "FROM teams WHERE team_name IN": [{ id: 70 }] });
    const original = conn.query;
    conn.query = async (sql, params) => {
      if (/FROM team_notifications|FROM bans/.test(sql)) throw Object.assign(new Error("no table"), { code: "ER_NO_SUCH_TABLE" });
      return original(sql, params);
    };
    await expect(seedScript.clean(conn)).resolves.toBeDefined();
  });
});

describe("recovering a forgotten login", () => {
  test("the default password from the approval screen is recognised, a changed one is not", () => {
    const row = { village_name: "Rampur", team_name: "Rampur Warriors" };
    expect(reset.defaultCandidates(row)).toEqual(["admin_rampur", "admin_rampur warriors"]);
    expect(reset.matchingDefault("hash:admin_rampur", reset.defaultCandidates(row))).toBe("admin_rampur");
    expect(reset.matchingDefault("hash:something-else", reset.defaultCandidates(row))).toBeNull();
  });

  test("a new password is stored hashed, for an existing login", async () => {
    const calls = [];
    const db = { query: async (sql, p) => (calls.push([sql, p]), sql.startsWith("SELECT") ? [[{ id: 1 }]] : [{}]) };
    expect(await reset.setPassword(db, { table: "admins", key: "email", value: "a@b.c", password: "NewPass1" })).toBe("updated");
    expect(calls[1]).toEqual(["UPDATE admins SET password = ? WHERE email = ?", ["hash:NewPass1", "a@b.c"]]);
  });

  test("an unknown login is refused with a pointer to --list; a master login can be created", async () => {
    const empty = { query: async () => [[]] };
    await expect(reset.setPassword(empty, { table: "admins", key: "email", value: "nobody@x.y", password: "pw1234" })).rejects.toThrow(/--list/);
    const made = [];
    const db = { query: async (sql, p) => (made.push([sql, p]), sql.startsWith("SELECT") ? [[]] : [{}]) };
    expect(await reset.setPassword(db, { table: "master_admins", key: "username", value: "boss", password: "pw1234", create: true, email: "b@x.y" })).toBe("created");
    expect(made[1][1]).toEqual(["boss", "hash:pw1234", "b@x.y"]);
    await expect(reset.setPassword({ query: async () => [[]] }, { table: "master_admins", key: "username", value: "boss", password: "pw1234", create: true })).rejects.toThrow(/--email/);
  });

  test("a generated password is long enough and plain characters", () => {
    for (let i = 0; i < 20; i++) expect(reset.randomPassword()).toMatch(/^[A-Za-z0-9]{10}$/);
  });
});
