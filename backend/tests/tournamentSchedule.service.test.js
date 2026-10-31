// The host scheduling service end to end against an in-memory database: build, check, save, reload.

const { FakeScheduleDb } = require("./helpers/fakeScheduleDb");

jest.mock("../dbconfigure", () => ({}));
const db = require("../dbconfigure");
const service = require("../services/tournamentScheduleService");

let fake;
beforeEach(() => {
  fake = new FakeScheduleDb();
  db.query = (...a) => fake.query(...a);
  db.getConnection = () => fake.getConnection();
});

const HOST = 1;
// Short matches so all 31 fit in 3 days
const settings = { dayStart: "08:00", dayEnd: "20:00", breakStart: "13:00", breakEnd: "14:00", gapMinutes: 5, overs: { 1: 4, 2: 3, 3: 3, semi: 2, third_place: 2, final: 2 } };

const preview = (extra = {}) => service.previewSchedule(1, HOST, { settings, ...extra });
const saveFrom = async (extra = {}) => {
  const p = await preview(extra);
  await service.saveSchedule(1, HOST, { settings, slots: p.slots, ...extra });
  return p;
};

describe("plan", () => {
  test("before anything is saved there are groups and days but no fixtures", async () => {
    const plan = await service.getSchedulePlan(1, HOST);
    expect(plan.days).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(plan.groups.map((g) => g.group_name)).toEqual(["A", "B", "C", "D"]);
    expect(plan.groups[0].teams).toHaveLength(8);
    expect(plan.saved).toBe(false);
    expect(plan.fixtures).toBeNull();
    expect(plan.semiPairs).toEqual([["A", "C"], ["B", "D"]]);
  });

  test("only the hosting team can see or change it", async () => {
    await expect(service.getSchedulePlan(1, 99)).rejects.toMatchObject({ status: 403 });
    await expect(service.previewSchedule(1, 99, { settings })).rejects.toMatchObject({ status: 403 });
    await expect(service.saveSchedule(1, 99, { settings, slots: [] })).rejects.toMatchObject({ status: 403 });
    await expect(service.getSchedulePlan(7, HOST)).rejects.toMatchObject({ status: 404 });
  });
});

describe("auto-fill", () => {
  test("31 matches, no problems, every match on a tournament day", async () => {
    const p = await preview();
    expect(p.fixtures).toHaveLength(31);
    expect(p.errors).toEqual([]);
    expect(p.fits).toBe(true);
    expect(Object.keys(p.summary).sort()).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  });

  test("a third-place match makes it 32", async () => {
    expect((await preview({ thirdPlaceMatch: true })).fixtures).toHaveLength(32);
  });

  test("it reports when the matches do not fit the days", async () => {
    const p = await service.previewSchedule(1, HOST, { settings: { ...settings, overs: { 1: 5, 2: 5, 3: 5, semi: 5, final: 5 }, gapMinutes: 20 } });
    expect(p.fits).toBe(false);
    expect(p.overflowMinutes).toBeGreaterThan(0);
    expect(p.errors.some((e) => e.code === "outside_dates")).toBe(true);
  });

  test("the host's first-round pairing is used", async () => {
    const groupOrders = { A: [8, 7, 6, 5, 4, 3, 2, 1] };
    const p = await preview({ groupOrders });
    expect(p.fixtures[0]).toMatchObject({ team1Id: 8, team2Id: 7 });
    await expect(preview({ groupOrders: { A: [1, 2, 3] } })).rejects.toThrow(/does not match its teams/);
  });
});

describe("save and reload", () => {
  test("saves every match with its feeders, stage and slot", async () => {
    await saveFrom();
    expect(fake.matches).toHaveLength(31);
    const byNo = Object.fromEntries(fake.matches.map((m) => [m.match_no, m]));
    expect(byNo[3].dependent_match1_id).toBe(byNo[1].id);
    expect(byNo[3].dependent_match2_id).toBe(byNo[2].id);
    expect(byNo[29]).toMatchObject({ stage: "semi", dependent_match1_type: "winner" });
    expect(byNo[31]).toMatchObject({ stage: "final", dependent_match1_id: byNo[29].id, dependent_match2_id: byNo[30].id });
    expect(byNo[1].match_time).toMatch(/^2026-11-06 \d\d:\d\d:00$/);
    expect(byNo[1].duration_minutes).toBe(50);
    expect(byNo[1].overs).toBe(4);
    expect(byNo[1].venue).toBe("Village Ground");
    expect(fake.progress.schedule_created).toBe(1);
  });

  test("reloading gives back the same schedule, pairing and finals choices", async () => {
    const groupOrders = { B: [16, 15, 14, 13, 12, 11, 10, 9] };
    const first = await saveFrom({ groupOrders, semiPairs: [["A", "B"], ["C", "D"]], thirdPlaceMatch: true });
    const plan = await service.getSchedulePlan(1, HOST);
    expect(plan.saved).toBe(true);
    expect(plan.locked).toBe(false);
    expect(plan.thirdPlaceMatch).toBe(true);
    expect(plan.semiPairs).toEqual([["A", "B"], ["C", "D"]]);
    expect(plan.groups.find((g) => g.group_name === "B").teams.map((t) => t.id)).toEqual([16, 15, 14, 13, 12, 11, 10, 9]);
    expect(plan.fixtures).toHaveLength(32);
    first.slots.forEach((s) => {
      const back = plan.slots.find((x) => x.match_no === s.match_no);
      expect([back.match_date, back.start_time, back.duration_minutes, back.overs]).toEqual([s.match_date, s.start_time, s.duration_minutes, s.overs]);
    });
  });

  test("saving again replaces the old schedule", async () => {
    await saveFrom();
    await saveFrom({ thirdPlaceMatch: true });
    expect(fake.matches).toHaveLength(32);
  });

  test("a schedule with a clash is refused and nothing is stored", async () => {
    const p = await preview();
    const slots = p.slots.map((s) => (s.match_no === 2 ? { ...s, match_date: p.slots[0].match_date, start_time: p.slots[0].start_time } : s));
    await expect(service.saveSchedule(1, HOST, { settings, slots })).rejects.toMatchObject({ status: 422, details: { errors: expect.any(Array) } });
    expect(fake.matches).toHaveLength(0);
  });

  test("a failure half way through leaves the old schedule untouched", async () => {
    await saveFrom();
    const before = JSON.stringify(fake.matches);
    const realQuery = fake.query.bind(fake);
    let inserts = 0;
    fake.query = async (sql, p) => {
      if (sql.includes("INSERT INTO tournament_matches") && ++inserts === 10) throw new Error("disk full");
      return realQuery(sql, p);
    };
    const p = await preview();
    await expect(service.saveSchedule(1, HOST, { settings, slots: p.slots })).rejects.toThrow(/disk full/);
    fake.query = realQuery;
    expect(JSON.stringify(fake.matches)).toBe(before);
  });

  test("once a match has started the schedule is locked", async () => {
    await saveFrom();
    fake.matches[0].status = "live";
    fake.matches[0].match_id = 77;
    expect((await service.getSchedulePlan(1, HOST)).locked).toBe(true);
    await expect(preview()).rejects.toMatchObject({ status: 409 });
    await expect(service.saveSchedule(1, HOST, { settings, slots: [] })).rejects.toMatchObject({ status: 409 });
  });
});

describe("check while editing", () => {
  test("moving a match onto another reports the overlap", async () => {
    const p = await preview();
    const slots = p.slots.map((s) => (s.match_no === 2 ? { ...s, match_date: p.slots[0].match_date, start_time: p.slots[0].start_time } : s));
    const r = await service.checkSchedule(1, HOST, { settings, slots });
    expect(r.errors.map((e) => e.code)).toContain("overlap");
  });

  test("moving the final before its semi-finals is an order error", async () => {
    const p = await preview();
    const slots = p.slots.map((s) => (s.match_no === 31 ? { ...s, match_date: "2026-11-06", start_time: "08:00" } : s));
    const r = await service.checkSchedule(1, HOST, { settings, slots });
    expect(r.errors.some((e) => e.code === "order" && e.matchNo === 31)).toBe(true);
  });
});

describe("standings from the database", () => {
  test("positions follow the played matches", async () => {
    await saveFrom();
    const set = (no, patch) => Object.assign(fake.matches.find((m) => m.match_no === no), patch);
    set(29, { team1_id: 4, team2_id: 20, status: "completed", winner_team_id: 4 });
    set(30, { team1_id: 12, team2_id: 28, status: "completed", winner_team_id: 12 });
    set(31, { team1_id: 4, team2_id: 12, status: "completed", winner_team_id: 4 });
    const r = await service.getStandings(1);
    expect(r.positions.map((p) => [p.position, p.teamId])).toEqual([[1, 4], [2, 12], [3, 20], [4, 28]]);
    expect(r.positions[0].teamName).toBe("Team 4");
    expect(r.hasThirdPlaceMatch).toBe(false);
  });
});
