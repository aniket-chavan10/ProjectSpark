// Byes and leg-byes run off a no-ball (the batters ran without hitting it): they are extras, not bat runs.
//   score:  no-ball 1 + the byes; strike: decided by the byes run; bowler: charged the no-ball only;
//   scorecard: 1 no-ball and N byes; next ball: a free hit; undo: everything goes back.

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({ withTransaction: (cb) => cb(global.__fakeDb.conn) }));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const ball = require("../services/ballEventService");
const rules = require("../utils/cricketRules/cricketRules");

const A = { striker: 11, non: 12, bowler: 21 };
const setup = () => {
  const db = new FakeScoringDb();
  global.__fakeDb = db;
  db.setInitialPlayers(1, A.striker, A.non, A.bowler);
  return db;
};
const score = (db, o = {}) => {
  const live = db.live[1];
  return ball.registerBallEvent(db.conn, { inningId: 1, matchId: 100, batsmanId: live.on_strike_batsman_id, bowlerId: live.bowler_id, runsScored: 0, ...o });
};
const noBallWith = (kind, byes) => ({ extraType: "no-ball", extras: 1 + byes, runsScored: 0, noBallRunsAs: kind });

describe("rules", () => {
  test("runs run, and what the bowler is charged", () => {
    expect(rules.getRunsRun(0, 3, "no-ball", "bye")).toBe(2);
    expect(rules.shouldRotateStrike(0, 2, "no-ball", "leg-bye")).toBe(true); // one bye run
    expect(rules.shouldRotateStrike(0, 3, "no-ball", "bye")).toBe(false); // two byes run
    expect(rules.shouldRotateStrike(1, 1, "no-ball", null)).toBe(true); // a bat run, as before
    expect(rules.bowlerRunsCharged(0, 5, "no-ball", "bye")).toBe(1);
    expect(rules.bowlerRunsCharged(2, 1, "no-ball", null)).toBe(3);
    expect(rules.bowlerRunsCharged(0, 1, "bye", null)).toBe(0);
    expect(rules.bowlerRunsCharged(0, 5, "wide", null)).toBe(5);
  });

  test("only a no-ball can carry them", () => {
    expect(rules.normalizeNoBallRunsType("bat", "no-ball")).toBeNull();
    expect(rules.normalizeNoBallRunsType("leg_bye", "no-ball")).toBe("leg-bye");
    expect(() => rules.normalizeNoBallRunsType("bye", "wide")).toThrow(/only be entered on a no-ball/);
    expect(() => rules.normalizeNoBallRunsType("six", "no-ball")).toThrow(/Unknown kind/);
  });
});

describe("scoring a no-ball with byes", () => {
  test("two byes: 3 runs on the board, none to the batter, 1 to the bowler, same striker, still the same ball", async () => {
    const db = setup();
    await score(db, noBallWith("bye", 2));
    const live = db.live[1];
    expect(live.current_score).toBe(3);
    expect(live.on_strike_batsman_id).toBe(A.striker); // two runs run: ends are the same
    expect(live.legal_balls_in_over).toBe(0);
    expect(db.perf[`${A.striker}:100`].runs).toBe(0);
    expect(db.perf[`${A.striker}:100`].balls).toBe(1); // a no-ball is a ball the batter faced
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(1);
    expect(db.balls[0].nb_runs_type).toBe("bye");
  });

  test("one leg-bye: the batters crossed", async () => {
    const db = setup();
    await score(db, noBallWith("leg-bye", 1));
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
    expect(db.live[1].current_score).toBe(2);
  });

  test("the next ball is a free hit", async () => {
    const db = setup();
    await score(db, noBallWith("bye", 1));
    await expect(score(db, { isWicket: 1, wicketType: "bowled", dismissedPlayerId: db.live[1].on_strike_batsman_id })).rejects.toThrow(/free hit/);
  });

  test("a maiden is not spoiled by byes off the no-ball only if the penalty is the only charge: it is not a maiden", async () => {
    const db = setup();
    await score(db, noBallWith("bye", 2));
    for (let i = 0; i < 6; i += 1) await score(db, {});
    // the no-ball penalty is charged to the bowler, so the over is not a maiden
    expect(db.perf[`${A.bowler}:100`].maidens).toBe(0);
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(1);
  });

  test("refused: bat runs together with byes, byes without a no-ball, a missing bye count", async () => {
    const db = setup();
    await expect(score(db, { extraType: "no-ball", extras: 3, runsScored: 2, noBallRunsAs: "bye" })).rejects.toThrow(/both bat runs/);
    await expect(score(db, { extraType: "wide", extras: 3, runsScored: 0, noBallRunsAs: "bye" })).rejects.toThrow(/only be entered on a no-ball/);
    await expect(score(db, { extraType: "no-ball", extras: 1, runsScored: 0, noBallRunsAs: "bye" })).rejects.toThrow(/Enter the bye runs/);
    expect(db.balls).toHaveLength(0);
  });

  test("undo puts back the score, the strike and the bowler's figures", async () => {
    const db = setup();
    await score(db, noBallWith("leg-bye", 1));
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect(db.live[1].current_score).toBe(0);
    expect(db.live[1].on_strike_batsman_id).toBe(A.striker);
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(0);
    expect(db.balls).toHaveLength(0);
  });
});
