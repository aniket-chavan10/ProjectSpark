// Laws of Cricket, one scenario at a time: free hit, dead balls, retirements, smaller sides,
// starting an innings, double taps, and the choices the scorer has to make.

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({ withTransaction: (cb) => cb(global.__fakeDb.conn) }));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const ball = require("../services/ballEventService");
const liveMatch = require("../services/liveMatchService");
const rules = require("../utils/cricketRules/cricketRules");

const setup = (opts) => {
  const db = new FakeScoringDb(opts);
  global.__fakeDb = db;
  db.setInitialPlayers(1, 11, 12, 21);
  return db;
};
const score = (db, o = {}, inningId = 1) =>
  ball.registerBallEvent(db.conn, { inningId, matchId: 100, batsmanId: db.live[inningId].on_strike_batsman_id, bowlerId: db.live[inningId].bowler_id, runsScored: 0, ...o });

describe("free hit", () => {
  test("the ball after a no-ball is a free hit: only a run out (or obstructing) can dismiss", async () => {
    const db = setup();
    await score(db, { extraType: "no-ball" });
    for (const type of ["bowled", "caught", "lbw", "stumped", "hit wicket"]) {
      await expect(score(db, { isWicket: 1, wicketType: type })).rejects.toThrow(/free hit/);
    }
    await score(db, { runsScored: 1, isWicket: 1, wicketType: "run out", dismissedPlayerId: 12, fielderId: 31 });
    expect(db.live[1].current_wickets).toBe(1);
  });

  test("a wide on a free hit keeps the free hit for the next ball", async () => {
    const db = setup();
    await score(db, { extraType: "no-ball" });
    await score(db, { extraType: "wide" }); // free hit not used up
    await expect(score(db, { isWicket: 1, wicketType: "lbw" })).rejects.toThrow(/free hit/);
    await score(db, { runsScored: 1 }); // the free hit is faced
    await score(db, { isWicket: 1, wicketType: "lbw" }); // the next ball is a normal one again
    expect(db.live[1].current_wickets).toBe(1);
  });

  test("a no-ball on a free hit gives another free hit", async () => {
    const db = setup();
    await score(db, { extraType: "no-ball" });
    await score(db, { extraType: "no-ball" });
    await expect(score(db, { isWicket: 1, wicketType: "bowled" })).rejects.toThrow(/free hit/);
  });

  test("a wide that was not on a free hit gives no free hit", async () => {
    const db = setup();
    await score(db, { extraType: "wide" });
    await score(db, { isWicket: 1, wicketType: "bowled" });
    expect(db.live[1].current_wickets).toBe(1);
  });

  test("the free hit is shown by the rules helper too", () => {
    expect(rules.isFreeHit([])).toBe(false);
    expect(rules.isFreeHit([null, "no-ball"])).toBe(false);
    expect(rules.isFreeHit(["no-ball", null])).toBe(true);
    expect(rules.isFreeHit(["wide", "wide", "No Ball", null])).toBe(true);
    expect(rules.isFreeHit(["wide", null, "no-ball"])).toBe(false);
  });
});

describe("a batter out on a dead ball", () => {
  test("stumped off a wide keeps only the one-run wide", async () => {
    const db = setup();
    await score(db, { extraType: "wide", extras: 1, isWicket: 1, wicketType: "stumped" });
    expect([db.live[1].current_score, db.live[1].current_wickets, db.innings[1].balls_bowled]).toEqual([1, 1, 0]);
  });

  test("hit wicket off a wide is out, a run-scoring one is not allowed", async () => {
    const db = setup();
    await expect(score(db, { extraType: "wide", extras: 3, isWicket: 1, wicketType: "hit wicket" })).rejects.toThrow(/one-run wide/);
    await score(db, { extraType: "wide", extras: 1, isWicket: 1, wicketType: "hit wicket" });
    expect(db.live[1].current_wickets).toBe(1);
  });

  test("a run out keeps the runs that were completed", async () => {
    const db = setup();
    await score(db, { runsScored: 2, isWicket: 1, wicketType: "run out", dismissedPlayerId: 11, fielderId: 31 });
    expect(db.live[1].current_score).toBe(2);
  });
});

describe("retirement", () => {
  test("is not a delivery: no ball, no runs, the over and bowler stay as they were", async () => {
    const db = setup();
    await score(db, { runsScored: 1 });
    await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 12 }); // the striker after the single
    const live = db.live[1];
    expect([live.legal_balls_in_over, live.current_overs, live.current_wickets, live.bowler_id, live.current_score]).toEqual([1, "0.1", 0, 21, 1]);
    expect(live.on_strike_batsman_id).toBeNull();
    expect(live.partnership_runs).toBe(0);
    expect(db.innings[1].balls_bowled).toBe(1);
    expect(db.perf["12:100"]).toBeUndefined(); // nothing was faced
  });

  test("retired hurt is not a wicket and the batter can come back later", async () => {
    const db = setup();
    await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 11 });
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
    await score(db, { isWicket: 1, wicketType: "bowled" }); // 13 is out
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 11, end: "striker" }); // 11 returns
    expect(db.live[1].on_strike_batsman_id).toBe(11);
    expect(db.live[1].current_wickets).toBe(1);
  });

  test("retired out is a wicket, but not the bowler's and not a duck", async () => {
    const db = setup();
    await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 12, retiredOut: true });
    expect(db.live[1].current_wickets).toBe(1);
    expect(db.live[1].last_wicket_description).toBe("retired out");
    expect(db.perf["21:100"]).toBeUndefined();
    expect(db.stats[12]).toBeUndefined();
  });

  test("a retirement can be taken back like a ball", async () => {
    const db = setup();
    await score(db, { runsScored: 3 });
    const before = JSON.stringify([db.live, db.innings]);
    await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 11 });
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect(JSON.stringify([db.live, db.innings])).toBe(before);
  });

  test("only a batter at the crease can retire, and a retirement is not sent as a delivery", async () => {
    const db = setup();
    await expect(ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 99 })).rejects.toThrow(/not at the crease/);
    await expect(score(db, { isRetiredHurt: 1, runsScored: 1 })).rejects.toThrow(/not a delivery/);
    // sent on its own through the ball endpoint it is a retirement
    await score(db, { isRetiredHurt: 1, dismissedPlayerId: 12 });
    expect(db.live[1].non_striker_batsman_id).toBeNull();
  });
});

describe("a side with fewer than 11 players", () => {
  test("is all out one wicket short of its number of players", async () => {
    const db = setup();
    db.squad[1] = 4; // 4 players: all out after 3 wickets
    let next = 20;
    for (let w = 0; w < 3; w++) {
      if (w > 0) await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: ++next, end: "striker" });
      await score(db, { isWicket: 1, wicketType: "bowled" });
    }
    expect(db.innings[1].status).toBe("completed");
    expect(db.matches[100].target_score).toBe(1);
    await expect(score(db, {})).rejects.toThrow(/already completed|over/);
  });

  test("the chasing side wins by the wickets it had in hand, out of its own number of players", async () => {
    const db = setup();
    db.squad[2] = 6; // 5 wickets
    db.matches[100].target_score = 3;
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, { isWicket: 1, wicketType: "bowled" }, 2);
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 2, newBatsmanId: 43, end: "striker" });
    await score(db, { runsScored: 4 }, 2);
    expect([db.matches[100].victory_margin_type, db.matches[100].victory_margin]).toEqual(["wickets", 4]);
  });

  test("nothing recorded, a huge squad or a squad of one all fall back to 10 wickets", () => {
    expect([0, 1, 12, 20, undefined, "x"].map(rules.maxWicketsFor)).toEqual([10, 10, 10, 10, 10, 10]);
    expect([2, 8, 11].map(rules.maxWicketsFor)).toEqual([1, 7, 10]);
  });
});

describe("starting an innings", () => {
  test("the openers can be changed until the first ball, not after", async () => {
    const db = setup();
    await liveMatch.setInitialPlayers({ matchId: 100, inningId: 1, strikerId: 13, nonStrikerId: 14, bowlerId: 22 });
    expect([db.live[1].on_strike_batsman_id, db.live[1].bowler_id]).toEqual([13, 22]);
    await score(db, { runsScored: 1 });
    await expect(liveMatch.setInitialPlayers({ matchId: 100, inningId: 1, strikerId: 11, nonStrikerId: 12, bowlerId: 21 })).rejects.toThrow(/already started/);
    expect(db.live[1].current_score).toBe(1); // the live innings was not wiped
  });

  test("the second innings cannot be set up before the first is finished", async () => {
    const db = setup();
    await expect(liveMatch.setInitialPlayers({ matchId: 100, inningId: 2, strikerId: 41, nonStrikerId: 42, bowlerId: 51 })).rejects.toThrow(/First innings/);
  });

  test("nothing can be set up after the match is over", async () => {
    const db = setup();
    db.matches[100].status = "completed";
    await expect(liveMatch.setInitialPlayers({ matchId: 100, inningId: 1, strikerId: 13, nonStrikerId: 14, bowlerId: 22 })).rejects.toThrow(/already completed/);
  });
});

describe("double taps and stale screens", () => {
  test("a ball sent twice with the same last-ball id is only scored once", async () => {
    const db = setup();
    await score(db, { runsScored: 1 });
    const seen = db.balls.at(-1).ball_id;
    await score(db, { runsScored: 4, lastBallId: seen }); // the scorer saw ball `seen` and scores the next one
    await expect(score(db, { runsScored: 4, lastBallId: seen })).rejects.toThrow(/scoreboard has changed/); // the same request again
    expect(db.live[1].current_score).toBe(5);
    expect(db.balls).toHaveLength(2);
  });

  test("the first ball of an innings expects last-ball id 0", async () => {
    const db = setup();
    await score(db, { runsScored: 1, lastBallId: 0 });
    await expect(score(db, { lastBallId: 0 })).rejects.toThrow(/scoreboard has changed/);
  });

  test("undo only takes back the ball the scorer is looking at", async () => {
    const db = setup();
    await score(db, { runsScored: 1 });
    const seen = db.balls.at(-1).ball_id;
    await score(db, { runsScored: 2 }); // somebody else scored another ball
    await expect(ball.undoLastBallEvent(db.conn, 1, 100, { lastBallId: seen })).rejects.toThrow(/no longer the one/);
    await ball.undoLastBallEvent(db.conn, 1, 100, { lastBallId: db.balls.at(-1).ball_id });
    expect(db.live[1].current_score).toBe(1);
  });
});

describe("taking back a wicket after the new batsman came in", () => {
  test("the striker's wicket needs to know who stayed, then everything is restored", async () => {
    const db = setup();
    await score(db, { runsScored: 2 });
    const before = JSON.stringify([db.live, db.innings, db.perf]);
    await score(db, { isWicket: 1, wicketType: "bowled" });
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
    await expect(ball.undoLastBallEvent(db.conn, 1, 100)).rejects.toThrow(/survivorId/);
    await expect(ball.undoLastBallEvent(db.conn, 1, 100, { survivorId: 999 })).rejects.toThrow(/survivorId/);
    await ball.undoLastBallEvent(db.conn, 1, 100, { survivorId: 12 });
    expect(JSON.stringify([db.live, db.innings, db.perf])).toBe(before);
  });
});

describe("the match outcome", () => {
  const base = { inningsNumber: 2, target: 21, maxWickets: 10, maxOvers: 5, battingTeamId: 2, team1Id: 1, team2Id: 2 };

  test.each([
    ["chased down", { score: 21, wickets: 4, legalBalls: 20 }, { chaseWon: true, winnerTeamId: 2, marginType: "wickets", margin: 6 }],
    ["won with a wide, mid-over", { score: 25, wickets: 9, legalBalls: 11 }, { chaseWon: true, margin: 1 }],
    ["one short is a tie", { score: 20, wickets: 10, legalBalls: 22 }, { tie: true, winnerTeamId: null, margin: 0 }],
    ["fell short on overs", { score: 15, wickets: 5, legalBalls: 30 }, { winnerTeamId: 1, marginType: "runs", margin: 5 }],
    ["still going", { score: 15, wickets: 5, legalBalls: 20 }, { matchCompleted: false, inningsFinished: false }],
  ])("second innings %s", (name, state, expected) => {
    expect(rules.decideOutcome({ ...base, ...state })).toMatchObject(expected);
  });

  test("the first innings only ends the innings", () => {
    expect(rules.decideOutcome({ ...base, inningsNumber: 1, target: null, score: 90, wickets: 3, legalBalls: 30 })).toMatchObject({ inningsFinished: true, matchCompleted: false });
  });
});
