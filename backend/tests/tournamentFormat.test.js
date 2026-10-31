const { buildFixtures, computeStandings, defaultSemiPairs, STAGE } = require("../utils/tournamentFormat");
const rules = require("../utils/scheduleRules");

const groupsOf = (names = ["A", "B", "C", "D"], size = 8) =>
  names.map((n, gi) => ({ group_name: n, teams: Array.from({ length: size }, (_, i) => gi * size + i + 1) }));

describe("fixtures", () => {
  test("4 groups of 8: 28 group matches, 2 semi-finals and a final = 31", () => {
    const { matches } = buildFixtures(groupsOf());
    expect(matches).toHaveLength(31);
    expect(matches.filter((m) => m.stage === STAGE.GROUP)).toHaveLength(28);
    expect(matches.filter((m) => m.stage === STAGE.SEMI)).toHaveLength(2);
    expect(matches.at(-1).stage).toBe(STAGE.FINAL);
  });

  test("an optional third-place match makes it 32 and uses the semi-final losers", () => {
    const { matches } = buildFixtures(groupsOf(), { thirdPlaceMatch: true });
    expect(matches).toHaveLength(32);
    const third = matches.find((m) => m.stage === STAGE.THIRD);
    expect([third.dep1.type, third.dep2.type]).toEqual(["loser", "loser"]);
    expect(matches.at(-1).stage).toBe(STAGE.FINAL); // the final is still last
  });

  test("a group is numbered in play order: 1v2, 3v4, round 2, 5v6, 7v8, round 2, group final", () => {
    const { matches } = buildFixtures(groupsOf());
    const a = matches.slice(0, 7);
    expect(a.map((m) => [m.team1Id, m.team2Id])).toEqual([[1, 2], [3, 4], [null, null], [5, 6], [7, 8], [null, null], [null, null]]);
    expect(a[2].dep1).toEqual({ matchNo: 1, type: "winner" });
    expect(a[2].dep2).toEqual({ matchNo: 2, type: "winner" });
    expect(a[6].dep1).toEqual({ matchNo: 3, type: "winner" });
    expect(a[6].dep2).toEqual({ matchNo: 6, type: "winner" });
    expect(a.map((m) => m.round)).toEqual([1, 1, 2, 1, 1, 2, 3]);
  });

  test("the host chooses which group winners meet in the semi-finals", () => {
    const { matches, groupWinnerMatchNo } = buildFixtures(groupsOf(), { semiPairs: [["A", "D"], ["B", "C"]] });
    const [s1, s2] = matches.filter((m) => m.stage === STAGE.SEMI);
    expect([s1.dep1.matchNo, s1.dep2.matchNo]).toEqual([groupWinnerMatchNo.A, groupWinnerMatchNo.D]);
    expect([s2.dep1.matchNo, s2.dep2.matchNo]).toEqual([groupWinnerMatchNo.B, groupWinnerMatchNo.C]);
    expect(s1.team1Label).toBe("Group A winner");
    expect(s1.team2Label).toBe("Group D winner");
  });

  test("default semi-finals are A v C and B v D", () => {
    expect(defaultSemiPairs(["A", "B", "C", "D"])).toEqual([["A", "C"], ["B", "D"]]);
  });

  test("semi-final pairs must use each group once", () => {
    expect(() => buildFixtures(groupsOf(), { semiPairs: [["A", "B"], ["A", "C"]] })).toThrow(/exactly once/);
    expect(() => buildFixtures(groupsOf(), { semiPairs: [["A", "B"]] })).toThrow(/exactly once/);
  });

  test("a group needs a power-of-two number of teams and no repeats", () => {
    const g = groupsOf();
    g[1].teams = g[1].teams.slice(0, 7);
    expect(() => buildFixtures(g)).toThrow(/Group B has 7 teams/);
    const dup = groupsOf();
    dup[0].teams[1] = dup[0].teams[0];
    expect(() => buildFixtures(dup)).toThrow(/same team more than once/);
  });

  test("two groups go straight to the final", () => {
    const { matches } = buildFixtures(groupsOf(["A", "B"]));
    expect(matches).toHaveLength(15);
    expect(matches.at(-1)).toMatchObject({ stage: STAGE.FINAL, team1Label: "Group A winner", team2Label: "Group B winner" });
  });

  test("slot labels name the match when the feeder is not a group final", () => {
    const { matches } = buildFixtures(groupsOf(), { thirdPlaceMatch: true });
    expect(matches[2].team1Label).toBe("Winner of Match 1");
    expect(matches.find((m) => m.stage === STAGE.THIRD).team1Label).toBe("Loser of Match 29");
    expect(matches.at(-1).team1Label).toBe("Winner of Match 29");
  });
});

describe("standings", () => {
  const done = (o) => ({ status: "completed", ...o });
  // semi 1: A(1) v C(3) -> C(3) loses ; semi 2: B(2) v D(4) -> D(4) loses ; final: A v B
  const base = [
    done({ match_no: 29, stage: "semi", team1_id: 1, team2_id: 3, winner_team_id: 1 }),
    done({ match_no: 30, stage: "semi", team1_id: 2, team2_id: 4, winner_team_id: 2 }),
  ];

  test("nothing is decided before the final", () => {
    expect(computeStandings([...base, { match_no: 31, stage: "final", status: "scheduled", team1_id: 1, team2_id: 2 }])).toEqual([]);
  });

  test("with no third-place match, the semi-final loser who lost to the champion is 3rd", () => {
    const standings = computeStandings([...base, done({ match_no: 31, stage: "final", team1_id: 1, team2_id: 2, winner_team_id: 1 })]);
    expect(standings.map((s) => [s.position, s.teamId])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(standings[2].decidedBy).toBe("semi_final_loser");
  });

  test("if the other finalist wins, the other semi-final loser is 3rd", () => {
    const standings = computeStandings([...base, done({ match_no: 31, stage: "final", team1_id: 1, team2_id: 2, winner_team_id: 2 })]);
    expect(standings.map((s) => [s.position, s.teamId])).toEqual([[1, 2], [2, 1], [3, 4], [4, 3]]);
  });

  test("when a third-place match exists it decides 3rd and 4th, and waits until it is played", () => {
    const final = done({ match_no: 32, stage: "final", team1_id: 1, team2_id: 2, winner_team_id: 1 });
    const pending = { match_no: 31, stage: "third_place", status: "scheduled", team1_id: 3, team2_id: 4 };
    expect(computeStandings([...base, pending, final]).map((s) => s.position)).toEqual([1, 2]);
    const played = computeStandings([...base, { ...pending, status: "completed", winner_team_id: 4 }, final]);
    expect(played.map((s) => [s.position, s.teamId])).toEqual([[1, 1], [2, 2], [3, 4], [4, 3]]);
  });
});

describe("auto-plan", () => {
  const days = ["2026-11-06", "2026-11-07", "2026-11-08"];
  const fixtures = (third = false) => buildFixtures(groupsOf(), { thirdPlaceMatch: third }).matches;
  const settings = { days, dayStart: "08:00", dayEnd: "20:00", breakStart: "13:00", breakEnd: "14:00", gapMinutes: 5 };
  const merged = (fx, slots) => fx.map((m) => ({ ...m, ...slots.find((s) => s.match_no === m.match_no) }));

  test("length follows the overs: 5 overs = 60 min, 2 overs = 30 min, 1 over = 20 min", () => {
    expect([5, 4, 2, 1].map(rules.defaultDurationMinutes)).toEqual([60, 50, 30, 20]);
  });

  test("a schedule that fits has no errors and keeps every match inside the days and the hours", () => {
    const fx = fixtures();
    const plan = rules.autoPlan(fx, { ...settings, overs: { 1: 4, 2: 3, 3: 3, semi: 2, final: 2 } });
    expect(plan.fits).toBe(true);
    const { errors } = rules.validateSchedule(merged(fx, plan.slots), { startDate: days[0], endDate: days[2], dayStart: "08:00", dayEnd: "20:00" });
    expect(errors).toEqual([]);
    plan.slots.forEach((s) => {
      expect(days).toContain(s.match_date);
      expect(s.start_time >= "08:00" && s.end_time <= "20:00").toBe(true);
      // never inside the lunch break
      expect(s.end_time <= "13:00" || s.start_time >= "14:00").toBe(true);
    });
  });

  test("group A is completely finished before group B starts", () => {
    const fx = fixtures();
    const plan = rules.autoPlan(fx, { ...settings, overs: { 1: 4, 2: 3, 3: 3, semi: 2, final: 2 } });
    const m = merged(fx, plan.slots);
    const end = (g) => Math.max(...m.filter((x) => x.group === g).map((x) => rules.toMinutes(x.match_date, x.end_time)));
    const start = (g) => Math.min(...m.filter((x) => x.group === g).map((x) => rules.toMinutes(x.match_date, x.start_time)));
    expect(end("A")).toBeLessThanOrEqual(start("B"));
    expect(end("B")).toBeLessThanOrEqual(start("C"));
    expect(end("C")).toBeLessThanOrEqual(start("D"));
  });

  test("semi-finals, third place and the final come last, in that order", () => {
    const fx = fixtures(true);
    const m = merged(fx, rules.autoPlan(fx, { ...settings, overs: { 1: 4, 2: 3, 3: 3, semi: 2, third_place: 2, final: 2 } }).slots);
    const startOf = (stage) => Math.min(...m.filter((x) => x.stage === stage).map((x) => rules.toMinutes(x.match_date, x.start_time)));
    const groupsEnd = Math.max(...m.filter((x) => x.stage === "group").map((x) => rules.toMinutes(x.match_date, x.end_time)));
    expect(groupsEnd).toBeLessThanOrEqual(startOf("semi"));
    expect(startOf("semi")).toBeLessThan(startOf("third_place"));
    expect(startOf("third_place")).toBeLessThan(startOf("final"));
  });

  test("it says so when the matches do not fit, and by how much", () => {
    const fx = fixtures();
    const plan = rules.autoPlan(fx, { ...settings, days: [days[0]] }); // one day for 31 matches
    expect(plan.fits).toBe(false);
    expect(plan.overflowMinutes).toBeGreaterThan(0);
    const { errors } = rules.validateSchedule(merged(fx, plan.slots), { startDate: days[0], endDate: days[0] });
    expect(errors.some((e) => e.code === "outside_dates")).toBe(true);
  });

  test("first rounds of a group are played together so the winners get a rest (when asked)", () => {
    const fx = fixtures();
    const plan = rules.autoPlan(fx, { ...settings, restFriendly: true });
    const order = [...plan.slots].sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time)).map((s) => s.match_no);
    expect(order.slice(0, 7)).toEqual([1, 2, 4, 5, 3, 6, 7]);
    const natural = rules.autoPlan(fx, { ...settings, restFriendly: false });
    const order2 = [...natural.slots].sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time)).map((s) => s.match_no);
    expect(order2.slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("bad settings are rejected", () => {
    const fx = fixtures();
    expect(() => rules.autoPlan(fx, { ...settings, days: [] })).toThrow(/at least one playing day/);
    expect(() => rules.autoPlan(fx, { ...settings, dayStart: "19:00", dayEnd: "08:00" })).toThrow(/end after it starts/);
  });
});

describe("schedule checks", () => {
  const fx = buildFixtures(groupsOf(["A", "B"], 2)).matches; // m1 A, m2 B, m3 final (4 teams, tiny)
  const at = (no, date, time, mins = 60) => ({ match_no: no, match_date: date, start_time: time, duration_minutes: mins });
  const run = (slots, extra = {}) => {
    const merged = fx.map((m) => ({ ...m, ...(slots.find((s) => s.match_no === m.match_no) || {}) }));
    return rules.validateSchedule(merged, { startDate: "2026-11-06", endDate: "2026-11-08", ...extra });
  };

  test("a clean schedule", () => {
    const r = run([at(1, "2026-11-06", "09:00"), at(2, "2026-11-06", "10:30"), at(3, "2026-11-07", "09:00")]);
    expect(r.errors).toEqual([]);
  });

  test("matches without a time are errors", () => {
    expect(run([at(1, "2026-11-06", "09:00")]).errors.filter((e) => e.code === "unscheduled")).toHaveLength(2);
  });

  test("two matches on the one ground cannot overlap", () => {
    const r = run([at(1, "2026-11-06", "09:00"), at(2, "2026-11-06", "09:30"), at(3, "2026-11-07", "09:00")]);
    expect(r.errors.map((e) => e.code)).toEqual(["overlap"]);
  });

  test("back-to-back is fine", () => {
    const r = run([at(1, "2026-11-06", "09:00"), at(2, "2026-11-06", "10:00"), at(3, "2026-11-07", "09:00")]);
    expect(r.errors).toEqual([]);
  });

  test("the final cannot start before the matches feeding it are over", () => {
    const r = run([at(1, "2026-11-06", "09:00"), at(2, "2026-11-06", "10:00"), at(3, "2026-11-06", "10:30")]);
    expect(r.errors.map((e) => e.code)).toContain("order");
  });

  test("little rest for a winner is only a warning", () => {
    const r = run([at(1, "2026-11-06", "09:00"), at(2, "2026-11-06", "10:00"), at(3, "2026-11-06", "11:10")]);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.code === "rest" && w.matchNo === 3)).toBe(true);
  });

  test("a match outside the tournament dates is an error", () => {
    const r = run([at(1, "2026-11-05", "09:00"), at(2, "2026-11-06", "10:30"), at(3, "2026-11-07", "09:00")]);
    expect(r.errors.map((e) => e.code)).toEqual(["outside_dates"]);
  });

  test("outside the usual hours is only a warning", () => {
    const r = run([at(1, "2026-11-06", "06:00"), at(2, "2026-11-06", "10:30"), at(3, "2026-11-07", "09:00")], { dayStart: "08:00", dayEnd: "19:00" });
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toContain("hours");
  });
});
