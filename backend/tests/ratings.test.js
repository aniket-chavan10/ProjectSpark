// Rating points and ratings, awards, tie-breaks, sponsors. Pure logic runs directly; the engine part runs the
// REAL scoring services on the fake match tables.

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({ withTransaction: (cb) => cb(global.__fakeDb.conn) }));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const ball = require("../services/ballEventService");
const dbconfig = require("../dbconfigure");
const tieBreak = require("../services/tieBreakService");
const { matchPoints, POINTS } = require("../utils/ratingRules");
const ratings = require("../services/ratingService");
const awards = require("../services/awardService");
const stats = require("../services/playerStatsService");
const sponsors = require("../services/sponsorService");
const { resultText } = require("../utils/resultText");

const row = (extra = {}) => ({
  in_xi: 1, batted: 0, runs: 0, balls: 0, fours: 0, sixes: 0, not_out: 0, bowled_balls: 0, runs_conceded: 0, wickets: 0, maidens: 0, dots: 0, catches: 0, stumpings: 0, run_outs: 0,
  ...extra,
});

/* ------------------------------- rating points ------------------------------- */

describe("rating points of a match", () => {
  const par = { parRpb: 1.5 }; // a 9-runs-an-over match

  test("a quick 40 beats a slow 40 on the same day", () => {
    const quick = matchPoints(row({ batted: 1, runs: 40, balls: 18, fours: 4, sixes: 2 }), par);
    const slow = matchPoints(row({ batted: 1, runs: 40, balls: 40, fours: 2 }), par);
    expect(quick.bat).toBeGreaterThan(slow.bat);
  });

  test("the same score counts for more when the match was low scoring", () => {
    const lowDay = matchPoints(row({ batted: 1, runs: 30, balls: 20 }), { parRpb: 1.0 });
    const highDay = matchPoints(row({ batted: 1, runs: 30, balls: 20 }), { parRpb: 2.0 });
    expect(lowDay.bat).toBeGreaterThan(highDay.bat);
  });

  test("milestones, a duck and the strike-rate limits", () => {
    expect(matchPoints(row({ batted: 1, runs: 0, balls: 3 }), par).bat).toBeLessThan(0); // duck
    expect(matchPoints(row({ batted: 1, runs: 0, balls: 3, not_out: 1 }), par).bat).toBeGreaterThan(matchPoints(row({ batted: 1, runs: 0, balls: 3 }), par).bat);
    const fifty = matchPoints(row({ batted: 1, runs: 50, balls: 33 }), par);
    expect(fifty.bat).toBe(50 + POINTS.fifty + Math.min(POINTS.srCap, 0.5 * (50 - 1.5 * 33)));
    // a huge innings cannot be inflated by the strike-rate bonus beyond its cap
    expect(matchPoints(row({ batted: 1, runs: 100, balls: 10 }), par).bat).toBe(100 + POINTS.hundred + POINTS.srCap);
  });

  test("not out in a winning chase earns the finisher bonus, only then", () => {
    const base = row({ batted: 1, runs: 12, balls: 8, not_out: 1 });
    expect(matchPoints(base, { ...par, won: true, chased: true }).bat - matchPoints(base, { ...par, won: true, chased: false }).bat).toBe(POINTS.finisher);
    expect(matchPoints({ ...base, not_out: 0 }, { ...par, won: true, chased: true }).bat).toBe(matchPoints({ ...base, not_out: 0 }, par).bat);
  });

  test("bowling: wickets, three-wicket bonus, maidens, dots, economy against the match", () => {
    const spell = matchPoints(row({ bowled_balls: 12, runs_conceded: 8, wickets: 3, maidens: 1, dots: 6 }), par);
    // 3 wickets 60 + 10 bonus + maiden 8 + dots 6 + economy bonus 0.75 * (18 - 8) = 7.5
    expect(spell.bowl).toBe(91.5);
    const expensive = matchPoints(row({ bowled_balls: 12, runs_conceded: 60 }), par);
    expect(expensive.bowl).toBe(POINTS.econFloor); // never worse than the floor
  });

  test("fielding and bonuses", () => {
    expect(matchPoints(row({ catches: 2, stumpings: 1, run_outs: 1 }), par).field).toBe(2 * POINTS.catch + POINTS.stumping + POINTS.runOut);
    expect(matchPoints(row(), { ...par, won: true }).bonus).toBe(POINTS.win);
    expect(matchPoints(row(), { ...par, won: true, potm: true }).bonus).toBe(POINTS.win + POINTS.playerOfMatch);
    expect(matchPoints(row({ in_xi: 0 }), { ...par, won: true }).bonus).toBe(0); // a reserve gets no win bonus
  });

  test("a player who only fielded gets no batting or bowling points", () => {
    const p = matchPoints(row({ catches: 1 }), par);
    expect(p).toMatchObject({ bat: 0, bowl: 0 });
  });

  test("computeRows judges against the match's own run rate and gives the winner's bonus", () => {
    const innings = [
      { inningId: 1, teamId: 1, inningsNumber: 1, runs: 30, batting: [{ playerId: 11, runs: 30, balls: 18, fours: 2, sixes: 1, status: "out", howOut: "b X" }], bowling: [{ playerId: 21, legalBalls: 12, runs: 28, wickets: 0, maidens: 0 }] },
      { inningId: 2, teamId: 2, inningsNumber: 2, runs: 20, batting: [{ playerId: 21, runs: 20, balls: 12, fours: 0, sixes: 0, status: "out", howOut: "b Y" }], bowling: [{ playerId: 11, legalBalls: 12, runs: 20, wickets: 1, maidens: 0 }] },
    ];
    const legal = (inning, n, bowler, runs) => Array.from({ length: n }, () => ({ legal_delivery: 1, runs_scored: runs, bowler_id: bowler, is_wicket: 0 }));
    const balls = { 1: [...legal(1, 6, 21, 0), ...legal(1, 6, 21, 2)], 2: legal(2, 12, 11, 1) };
    const rows = stats.computeRows({ matchId: 1, tournamentId: 1, seasonYear: 2026, innings, ballsByInning: balls, squads: [], winnerTeamId: 1, potmId: 11 });
    const a = rows.find((r) => r.player_id === 11);
    const b = rows.find((r) => r.player_id === 21);
    expect(a.won).toBe(1);
    expect(b.won).toBe(0);
    expect(a.bonus_points).toBe(POINTS.win + POINTS.playerOfMatch);
    expect(b.bonus_points).toBe(0);
    expect(b.dots).toBe(6); // six dot balls bowled by 21 in innings 1
    expect(a.bat_points).toBeGreaterThan(0);
  });
});

/* ---------------------------------- ratings ---------------------------------- */

describe("ratings", () => {
  const game = (player, daysAgo, extra = {}) => ({
    player_id: player, match_id: 1000 - daysAgo, date: new Date(Date.UTC(2026, 10, 30) - daysAgo * 864e5), team_id: 1, opp_team_id: 2,
    batted: 1, bowled_balls: 0, bat_points: 0, bowl_points: 0, field_points: 0, bonus_points: 0, ...extra,
  });

  test("the rating is the average of match points scaled to 1000, and capped", () => {
    const rows = [game(1, 2, { bat_points: 40 }), game(1, 1, { bat_points: 40 })];
    expect(ratings.buildRatings(rows, {})[0].batting).toBe(400);
    expect(ratings.buildRatings([game(2, 2, { bat_points: 400 }), game(2, 1, { bat_points: 400 })], {})[0].batting).toBe(1000);
  });

  test("recent matches count more than old ones", () => {
    const improving = [game(1, 20, { bat_points: 10 }), game(1, 10, { bat_points: 10 }), game(1, 1, { bat_points: 80 })];
    const fading = [game(2, 20, { bat_points: 80 }), game(2, 10, { bat_points: 10 }), game(2, 1, { bat_points: 10 })];
    const [a, b] = ratings.buildRatings([...improving, ...fading], {});
    expect(a.playerId).toBe(1);
    expect(a.batting).toBeGreaterThan(b.batting);
  });

  test("a player with too few matches is not rated yet", () => {
    const [r] = ratings.buildRatings([game(1, 1, { bat_points: 50 })], {});
    expect(r).toMatchObject({ matches: 1, overall: null, batting: null });
    expect(ratings.rankBy([r], "overall")).toEqual([]);
  });

  test("beating strong teams is worth more than beating weak ones", () => {
    const vs = (opp) => [game(1, 2, { bat_points: 40, opp_team_id: opp }), game(1, 1, { bat_points: 40, opp_team_id: opp })];
    const strong = ratings.buildRatings(vs(2), { 2: 155, 3: 5 })[0].batting;
    const weak = ratings.buildRatings(vs(3), { 2: 155, 3: 5 })[0].batting;
    expect(strong).toBeGreaterThan(weak);
    expect(ratings.opposition(155, 155)).toBeCloseTo(1.2);
    expect(ratings.opposition(0, 155)).toBeCloseTo(0.9);
    expect(ratings.opposition(10, 0)).toBe(1); // nobody has points yet
  });

  test("an all-rounder needs both batting and bowling; the harmonic mean punishes lopsided players", () => {
    const both = [1, 2].flatMap((d) => [game(1, d, { bat_points: 40, bowl_points: 40, bowled_balls: 12 })]);
    const lopsided = [1, 2].flatMap((d) => [game(2, d, { bat_points: 90, bowl_points: 10, bowled_balls: 12 })]);
    const batOnly = [1, 2].flatMap((d) => [game(3, d, { bat_points: 80 })]);
    const all = ratings.buildRatings([...both, ...lopsided, ...batOnly], {});
    const byId = Object.fromEntries(all.map((r) => [r.playerId, r]));
    expect(byId[3].allrounder).toBeNull();
    expect(byId[1].allrounder).toBe(400);
    expect(byId[2].allrounder).toBeLessThan((byId[2].batting + byId[2].bowling) / 2);
    expect(ratings.rankBy(all, "allrounder").map((r) => r.playerId)).toEqual([1, 2]);
  });

  test("the order is by the chosen rating, then matches played", () => {
    const rows = [1, 2].flatMap((d) => [game(1, d, { bat_points: 50 }), game(2, d, { bat_points: 50 })]);
    rows.push(game(2, 3, { bat_points: 50 }));
    const out = ratings.rankBy(ratings.buildRatings(rows, {}), "batting");
    expect(out.map((r) => r.playerId)).toEqual([2, 1]); // equal rating, player 2 played more
    expect(out.map((r) => r.rank)).toEqual([1, 2]);
  });
});

/* ----------------------------------- awards ----------------------------------- */

describe("awards", () => {
  const p = (id, extra = {}) => ({
    playerId: id, name: `P${id}`, matches: 5, innings: 5, runs: 0, balls: 0, sixes: 0, fours: 0, wickets: 0, bowledBalls: 0, runsConceded: 0, catches: 0, stumpings: 0, runOuts: 0,
    keeperMatches: 0, keeperDismissals: 0, average: null, strikeRate: null, economy: null, overs: "0.0", points: 0, overall: null, batting: null, bowling: null, allrounder: null, ...extra,
  });
  const squad = [
    p(1, { runs: 210, balls: 120, strikeRate: 175, sixes: 9, batting: 700, points: 250, overall: 640 }),
    p(2, { runs: 180, balls: 140, strikeRate: 128, sixes: 4, batting: 520, points: 190, overall: 500 }),
    p(3, { wickets: 12, bowledBalls: 60, runsConceded: 70, economy: 7, overs: "10.0", bowling: 660, points: 230, overall: 600 }),
    p(4, { wickets: 12, bowledBalls: 60, runsConceded: 55, economy: 5.5, overs: "10.0", bowling: 720, points: 210, overall: 610 }),
    p(5, { runs: 90, balls: 70, wickets: 5, bowledBalls: 30, runsConceded: 40, economy: 8, overs: "5.0", batting: 400, bowling: 450, allrounder: 424, points: 150, overall: 420 }),
    p(6, { keeperMatches: 5, keeperDismissals: 8, runs: 60, balls: 50, batting: 300, points: 120, overall: 330 }),
    p(7, { runs: 5, balls: 4, wickets: 1, bowledBalls: 6, runsConceded: 3, economy: 3, overs: "1.0", points: 20 }), // too little to win economy
  ];
  const teams = [{ teamId: 1, points: 155, titles: 1 }, { teamId: 2, points: 95, titles: 0 }, { teamId: 3, points: 55, titles: 0 }];
  const fairPlay = [{ teamId: 1, matches: 7, perMatch: 2.5 }, { teamId: 2, matches: 7, perMatch: 1.1 }, { teamId: 3, matches: 2, perMatch: 0 }];
  const built = Object.fromEntries(awards.buildAwards({ players: squad, teams, fairPlay }).map((a) => [a.key, a]));
  const winner = (key) => built[key].nominees[0].subjectId;

  test("each award goes to the right player", () => {
    expect(winner("player_of_season")).toBe(1);
    expect(winner("best_batter")).toBe(1);
    expect(winner("best_bowler")).toBe(4); // same wickets as 3, better economy
    expect(winner("best_allrounder")).toBe(5);
    expect(winner("best_keeper")).toBe(6);
    expect(winner("most_sixes")).toBe(1);
    expect(winner("best_strike_rate")).toBe(1);
    expect(winner("best_economy")).toBe(4);
  });

  test("a tiny sample cannot win: 6 balls bowled is not enough for best economy, 4 balls faced not for strike rate", () => {
    expect(built.best_economy.nominees.map((n) => n.subjectId)).not.toContain(7);
    expect(built.best_strike_rate.nominees.map((n) => n.subjectId)).not.toContain(7);
  });

  test("each award has a winner and up to two nominees", () => {
    expect(built.best_batter.nominees).toHaveLength(3);
    expect(built.best_batter.nominees.map((n) => n.subjectId)).toEqual([1, 2, 5]);
    expect(built.best_batter.nominees[0].valueText).toMatch(/210 runs/);
  });

  test("team awards: most points, and the fewest wides and no-balls among teams that played enough", () => {
    expect(winner("team_of_season")).toBe(1);
    expect(built.team_of_season.nominees[0].subjectType).toBe("team");
    expect(winner("fair_play")).toBe(2); // team 3 played too few matches to count
    expect(built.fair_play.nominees.map((n) => n.subjectId)).not.toContain(3);
  });

  test("the XI has a keeper, nobody twice, and fills up from the best overall when specialists run out", () => {
    const xi = built.xi_of_season.nominees.map((n) => n.subjectId);
    expect(xi[0]).toBe(6);
    expect(new Set(xi).size).toBe(xi.length);
    expect(xi).toHaveLength(6); // seven players exist, but one has no rating yet, so is not picked
    expect(xi).not.toContain(7);
    expect(built.xi_of_season.slots).toBe(true);
  });

  test("tournament awards use the same figures", () => {
    const t = Object.fromEntries(awards.buildAwards({ players: squad, tournament: true }).map((a) => [a.key, a]));
    expect(Object.keys(t).sort()).toEqual(["player_of_tournament", "tournament_best_batter", "tournament_best_bowler"]);
    expect(t.tournament_best_batter.nominees[0].subjectId).toBe(1);
  });

  test("with no data there are no awards, not errors", () => {
    expect(awards.buildAwards({ players: [], teams: [], fairPlay: [] })).toEqual([]);
  });
});

/* ---------------------------------- sponsors ---------------------------------- */

describe("sponsors", () => {
  test("a valid sponsor is cleaned: https added, placements and tier checked", () => {
    expect(sponsors.clean({ name: "  Patil   Motors ", link: "patilmotors.in", tier: "gold", placements: ["home", "footer", "fireworks"] })).toMatchObject({
      name: "Patil Motors", link: "https://patilmotors.in", tier: "gold", placements: "home,footer", active: 1,
    });
    expect(sponsors.clean({ name: "X Co", tier: "platinum", placements: "results" }).tier).toBe("partner");
  });

  test("bad input is refused with a reason", () => {
    expect(() => sponsors.clean({ name: "A", placements: "home" })).toThrow(/name/);
    expect(() => sponsors.clean({ name: "Fine Co", placements: "nowhere" })).toThrow(/where/);
    expect(() => sponsors.clean({ name: "Fine Co", placements: "home", startsOn: "2026-12-10", endsOn: "2026-12-01" })).toThrow(/end date/);
    expect(() => sponsors.clean({ name: "Fine Co", placements: "home", link: "http://" })).toThrow(/address/);
  });
});

/* ------------------------------ tie-break text ------------------------------ */

describe("how a tie was settled", () => {
  const names = { 1: "Home XI", 2: "Away XI" };
  const done = { status: "completed", winner_team_id: 1 };
  test("the result says how", () => {
    expect(resultText({ ...done, decided_by: "tie_super_over" }, names)).toBe("Match tied · Home XI won the super over");
    expect(resultText({ ...done, decided_by: "tie_batted_first" }, names)).toBe("Match tied · Home XI win for batting first");
    expect(resultText({ ...done, decided_by: "tie_manual" }, names)).toBe("Match tied · Home XI awarded the win");
    expect(resultText({ ...done, victory_margin_type: "runs", victory_margin: 4 }, names)).toBe("Home XI won by 4 runs");
  });
});

/* --------------------------- a tie in the scoring engine --------------------------- */

describe("a match that ends level", () => {
  const A = { striker: 11, non: 12, bowler: 21 };
  const bracket = (db) => {
    db.tm = [
      { id: 7, match_id: 100, status: "live", stage: "semi", team1_id: 1, team2_id: 2, dependent_match1_id: null, dependent_match2_id: null },
      { id: 9, match_id: null, status: "scheduled", team1_id: null, team2_id: null, dependent_match1_id: 7, dependent_match2_id: null },
    ];
  };
  const playTie = async (rule) => {
    const db = new FakeScoringDb({ totalOvers: 1 });
    global.__fakeDb = db;
    db.setInitialPlayers(1, A.striker, A.non, A.bowler);
    bracket(db);
    db.tieRules = { group: rule, knockout: rule };
    db.matches[100].target_score = 7;
    db.setInitialPlayers(2, 41, 42, 51);
    for (let i = 0; i < 6; i++) {
      const live = db.live[2];
      await ball.registerBallEvent(db.conn, { inningId: 2, matchId: 100, batsmanId: live.on_strike_batsman_id, bowlerId: live.bowler_id, runsScored: i === 0 ? 6 : 0 });
    }
    return db;
  };

  test("with 'batted first wins' the team that batted first goes through at once", async () => {
    const db = await playTie("batted_first");
    expect(db.matches[100].status).toBe("completed");
    expect(db.matches[100].winner_team_id).toBe(1); // team 1 batted first in the fake
    expect(db.matches[100].decided_by).toBe("tie_batted_first");
    expect(db.tm.find((m) => m.id === 9).team1_id).toBe(1);
    expect(db.tiebreaks).toEqual([{ match_id: 100, method: "batted_first", winner_team_id: 1 }]);
  });

  test("with 'super over' or 'host decides' it stays tied and nobody moves on", async () => {
    for (const rule of ["super_over", "manual"]) {
      const db = await playTie(rule);
      expect(db.matches[100].winner_team_id).toBeNull();
      expect(db.tm.find((m) => m.id === 9).team1_id).toBeNull();
    }
  });

  test("a broken rule lookup (migration not run) leaves the match tied instead of failing it", async () => {
    const db = new FakeScoringDb({ totalOvers: 1 });
    global.__fakeDb = db;
    db.tm = []; // no fixture: the rule lookup finds nothing
    expect(await tieBreak.autoWinner(db.conn, 100)).toBeNull();
    expect(await tieBreak.autoWinner({ query: async () => { throw new Error("Unknown column 'tie_rule_group'"); } }, 100)).toBeNull();
  });
});

/* ------------------------------- settling a tie ------------------------------- */

describe("settling a tie by hand", () => {
  const run = (input, { tied = true, firstTeam = 1 } = {}) => {
    const sql = [];
    const conn = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: async (s, p) => {
        sql.push([s.replace(/\s+/g, " ").trim(), p]);
        if (/FROM matches WHERE match_id = \? FOR UPDATE/.test(s)) return [[{ match_id: 100, status: "completed", winner_team_id: tied ? null : 1, team1_id: 1, team2_id: 2 }]];
        if (/FROM innings WHERE match_id/.test(s)) return [[{ team_id: firstTeam }]];
        return [[], []];
      },
      execute: async () => [[], []],
    };
    dbconfig.getConnection.mockResolvedValue(conn);
    return tieBreak.resolve(100, input, 5).then((out) => ({ out, sql, conn }), (err) => ({ err, sql, conn }));
  };

  test("the higher super-over score wins and the match is updated", async () => {
    const { out, sql, conn } = await run({ method: "super_over", team1Runs: "11", team1Wickets: "1", team2Runs: "8", team2Wickets: "2" });
    expect(out).toEqual({ matchId: 100, winnerTeamId: 1, decidedBy: "tie_super_over" });
    expect(sql.find(([s]) => s.startsWith("UPDATE matches SET winner_team_id"))[1]).toEqual([1, "tie_super_over", 100]);
    expect(sql.find(([s]) => s.startsWith("INSERT INTO match_tiebreaks"))[1].slice(0, 7)).toEqual([100, "super_over", 11, 1, 8, 2, 1]);
    expect(conn.commit).toHaveBeenCalled();
  });

  test("a level super over is refused, and so is nonsense", async () => {
    expect((await run({ method: "super_over", team1Runs: 9, team1Wickets: 0, team2Runs: 9, team2Wickets: 0 })).err).toMatchObject({ status: 409, message: expect.stringMatching(/level too/) });
    expect((await run({ method: "super_over", team1Runs: "x", team1Wickets: 0, team2Runs: 9, team2Wickets: 0 })).err).toMatchObject({ status: 400 });
    expect((await run({ method: "toss" })).err).toMatchObject({ status: 400 });
    expect((await run({ method: "manual", winnerTeamId: 9 })).err).toMatchObject({ status: 400, message: expect.stringMatching(/one of the two teams/) });
  });

  test("batted first and the host's pick", async () => {
    expect((await run({ method: "batted_first" }, { firstTeam: 2 })).out).toMatchObject({ winnerTeamId: 2, decidedBy: "tie_batted_first" });
    expect((await run({ method: "manual", winnerTeamId: 2, note: "umpires decided" })).out).toMatchObject({ winnerTeamId: 2, decidedBy: "tie_manual" });
  });

  test("only a match that is tied and finished can be settled; failures roll back", async () => {
    const r = await run({ method: "batted_first" }, { tied: false });
    expect(r.err).toMatchObject({ status: 409 });
    expect(r.conn.rollback).toHaveBeenCalled();
    expect(r.conn.commit).not.toHaveBeenCalled();
  });

  test("the tournament's own rules must be one of the three", async () => {
    dbconfig.query.mockResolvedValue([{ affectedRows: 1 }]);
    await expect(tieBreak.setRules(1, { group: "coin_flip", knockout: "manual" })).rejects.toMatchObject({ status: 400 });
    await expect(tieBreak.setRules(1, { group: "batted_first", knockout: "super_over" })).resolves.toEqual({ group: "batted_first", knockout: "super_over" });
  });
});
