// The checks made before a new batsman / bowler is accepted (controller level), against a small fake database.

jest.mock("../dbconfigure", () => ({ execute: jest.fn() }));
const db = require("../dbconfigure");
const validator = require("../utils/playerValidator");

// 1 = team batting, 2 = team bowling. Players 11-14 bat for team 1, 21-25 bowl for team 2.
const world = (o = {}) => {
  const w = {
    teamOf: { 11: 1, 12: 1, 13: 1, 14: 1, 21: 2, 22: 2, 23: 2, 24: 2, 25: 2 },
    out: [], // batters already dismissed
    crease: [11, 12],
    overs: [], // bowler of each over, oldest first
    legalBy: {}, // bowler -> legal balls bowled
    totalOvers: 5,
    ...o,
  };
  db.execute.mockImplementation(async (sql, p = []) => {
    const s = sql.replace(/\s+/g, " ");
    if (s.includes("FROM match_squads")) return [w.squad ? (s.includes("COUNT(*)") ? [{ n: w.squad.length }] : w.squad.includes(Number(p[2])) ? [{ player_id: p[2] }] : []) : (s.includes("COUNT(*)") ? [{ n: 0 }] : [])];
    if (s.includes("SELECT team_id FROM innings")) return [[{ team_id: 1 }]];
    if (s.includes("SELECT team1_id, team2_id FROM matches")) return [[{ team1_id: 1, team2_id: 2 }]];
    if (s.includes("FROM players_core WHERE team_id = ? AND player_id = ?")) return [w.teamOf[p[1]] === Number(p[0]) ? [{ player_id: p[1] }] : []];
    if (s.includes("FROM balls WHERE inning_id = ? AND dismissed_player_id = ?")) return [w.out.includes(Number(p[1])) ? [{ 1: 1 }] : []];
    if (s.includes("FROM live_scorecards WHERE inning_id")) return [[{ on_strike_batsman_id: w.crease[0], non_striker_batsman_id: w.crease[1] }]];
    if (s.includes("SELECT bowler_id FROM overs")) return [w.overs.length ? [{ bowler_id: w.overs[w.overs.length - 1] }] : []];
    if (s.includes("SELECT total_overs FROM matches")) return [[{ total_overs: w.totalOvers }]];
    if (s.includes("COUNT(*) AS balls FROM balls")) return [[{ balls: w.legalBy[p[1]] || 0 }]];
    throw new Error("unhandled " + s.slice(0, 80));
  });
  return w;
};

describe("new batsman", () => {
  const check = (newBatsmanId, end = "striker") => validator.validateNewBatsman({ matchId: 100, inningId: 1, newBatsmanId, end });

  test("a team-mate who is not out and not batting is fine", async () => {
    world();
    await expect(check(13)).resolves.toBeUndefined();
  });
  test("a player of the other team is refused", async () => {
    world();
    await expect(check(21)).rejects.toThrow(/playing XI/);
  });
  test("a batter who is already out is refused", async () => {
    world({ out: [13] });
    await expect(check(13)).rejects.toThrow(/already out/);
  });
  test("a batter who is at the crease is refused", async () => {
    world();
    await expect(check(12)).rejects.toThrow(/already at the crease/);
  });
  test("a batter who retired hurt may come back (he is not out)", async () => {
    world({ out: [] });
    await expect(check(14)).resolves.toBeUndefined();
  });
  test("a bad end or a missing player is refused", async () => {
    world();
    await expect(check(13, "middle")).rejects.toThrow(/Invalid end/);
    await expect(check(null)).rejects.toThrow(/newBatsmanId is required/);
  });
});

describe("new bowler", () => {
  const check = (newBowlerId) => validator.validateNewBowler({ matchId: 100, inningId: 1, newBowlerId });

  test("a bowler of the fielding team is fine", async () => {
    world({ overs: [22] });
    await expect(check(23)).resolves.toBeUndefined();
  });
  test("a player of the batting team cannot bowl", async () => {
    world();
    await expect(check(11)).rejects.toThrow(/playing XI/);
  });
  test("nobody bowls two overs in a row", async () => {
    world({ overs: [21, 22] });
    await expect(check(22)).rejects.toThrow(/two overs in a row/);
    await expect(check(21)).resolves.toBeUndefined(); // he bowled the over before the last one
  });
  test("a bowler is limited to a fifth of the overs (5 overs: 1 each, 20 overs: 4 each)", async () => {
    world({ overs: [22], totalOvers: 5, legalBy: { 21: 6 } });
    await expect(check(21)).rejects.toThrow(/maximum 1 over/);
    world({ overs: [22], totalOvers: 20, legalBy: { 21: 24 } });
    await expect(check(21)).rejects.toThrow(/maximum 4 over/);
    world({ overs: [22], totalOvers: 20, legalBy: { 21: 18 } });
    await expect(check(21)).resolves.toBeUndefined();
  });
  test("a missing bowler is refused", async () => {
    world();
    await expect(check(null)).rejects.toThrow(/newBowlerId is required/);
  });
});

describe("squad of the match", () => {
  const batter = (id) => validator.validateNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: id, end: "striker" });
  const bowler = (id) => validator.validateNewBowler({ matchId: 100, inningId: 1, newBowlerId: id });

  test("a reserve of the batting team cannot come in to bat", async () => {
    world({ squad: [11, 12, 13] }); // 14 is on the bench
    await expect(batter(14)).rejects.toThrow(/playing XI/i);
  });
  test("a player of the playing XI can", async () => {
    world({ squad: [11, 12, 13] });
    await expect(batter(13)).resolves.toBeUndefined();
  });
  test("a reserve of the fielding team cannot bowl", async () => {
    world({ squad: [21, 22, 23] }); // 24, 25 on the bench
    await expect(bowler(25)).rejects.toThrow(/playing XI/i);
  });
});
