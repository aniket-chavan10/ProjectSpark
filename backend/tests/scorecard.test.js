// The full scorecard, built from the ball log the scoring engine writes.

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({ withTransaction: (cb) => cb(global.__fakeDb.conn) }));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const ball = require("../services/ballEventService");
const liveMatch = require("../services/liveMatchService");
const { buildInningsScorecard, howOut } = require("../services/scorecardService");

const NAMES = { 11: "Asha", 12: "Bala", 13: "Chitra", 14: "Dev", 21: "Esha", 22: "Farid", 31: "Gopal" };
const nameOf = (id) => NAMES[id] || `P${id}`;

const play = async () => {
  const db = new FakeScoringDb({ totalOvers: 5 });
  global.__fakeDb = db;
  db.setInitialPlayers(1, 11, 12, 21);
  const score = (o) => ball.registerBallEvent(db.conn, { inningId: 1, matchId: 100, batsmanId: db.live[1].on_strike_batsman_id, bowlerId: db.live[1].bowler_id, runsScored: 0, ...o });

  // over 1 by Esha: 4, 1 (Bala on strike), wide, 6, dot, caught Bala (fielder Gopal), 2 -> but Bala out; Chitra in
  await score({ runsScored: 4 }); // Asha 4
  await score({ runsScored: 1 }); // Asha 5, strike to Bala
  await score({ extraType: "wide" }); // wide
  await score({ runsScored: 6 }); // Bala 6
  await score({}); // Bala dot
  await score({ isWicket: 1, wicketType: "caught", fielderId: 31 }); // Bala c Gopal b Esha
  await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
  await score({ runsScored: 2 }); // Chitra 2 -> 6th legal ball: over ends
  await liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: 22 });
  // over 2 by Farid: maiden
  for (let i = 0; i < 6; i++) await score({});
  return db;
};

test("batting card: runs, balls, fours, sixes, how out, and who is still in", async () => {
  const db = await play();
  const live = db.live[1];
  const card = buildInningsScorecard({
    balls: db.balls,
    nameOf,
    crease: { strikerId: live.on_strike_batsman_id, nonStrikerId: live.non_striker_batsman_id },
    squadIds: [11, 12, 13, 14],
  });
  const by = Object.fromEntries(card.batting.map((b) => [b.name, b]));
  expect(card.batting.map((b) => b.name)).toEqual(["Asha", "Bala", "Chitra"]);
  expect(by.Asha).toMatchObject({ runs: 5, balls: 8, fours: 1, sixes: 0, status: "not out", howOut: "not out" });
  expect(by.Bala).toMatchObject({ runs: 6, balls: 3, sixes: 1, status: "out", howOut: "c Gopal b Esha" });
  expect(by.Chitra).toMatchObject({ runs: 2, balls: 1, status: "not out" });
  expect(card.didNotBat.map((p) => p.name)).toEqual(["Dev"]);
});

test("bowling card: overs, maidens, runs charged (wides count, byes do not), wickets", async () => {
  const db = await play();
  const card = buildInningsScorecard({ balls: db.balls, nameOf, crease: {}, squadIds: [] });
  const by = Object.fromEntries(card.bowling.map((b) => [b.name, b]));
  expect(by.Esha).toMatchObject({ overs: "1.0", maidens: 0, runs: 14, wickets: 1, wides: 1 }); // 4+1+1(wd)+6+0+0+2? see below
  expect(by.Farid).toMatchObject({ overs: "1.0", maidens: 1, runs: 0, wickets: 0 });
});

test("extras and fall of wickets", async () => {
  const db = await play();
  const card = buildInningsScorecard({ balls: db.balls, nameOf, crease: {}, squadIds: [] });
  expect(card.extras).toEqual({ wides: 1, noBalls: 0, byes: 0, legByes: 0, total: 1 });
  expect(card.fallOfWickets).toEqual([{ wicketNumber: 1, playerId: 12, playerName: "Bala", score: 12, over: "0.5", how: "c Gopal b Esha" }]);
  expect(card.lastOverBowlerId).toBe(22);
});

describe("how a batter was out", () => {
  const row = (o) => ({ bowler_id: 21, fielder_id: null, ...o });
  test.each([
    [{ wicket_type: "bowled" }, "b Esha"],
    [{ wicket_type: "lbw" }, "lbw b Esha"],
    [{ wicket_type: "caught", fielder_id: 31 }, "c Gopal b Esha"],
    [{ wicket_type: "caught", fielder_id: 21 }, "c & b Esha"],
    [{ wicket_type: "caught" }, "c & b Esha"],
    [{ wicket_type: "stumped", fielder_id: 31 }, "st Gopal b Esha"],
    [{ wicket_type: "hit wicket" }, "hit wicket b Esha"],
    [{ wicket_type: "run out", fielder_id: 31 }, "run out (Gopal)"],
    [{ wicket_type: "run out" }, "run out"],
  ])("%j -> %s", (r, text) => expect(howOut(row(r), nameOf)).toBe(text));
});

test("a retired-hurt batter is listed as such, and a retired-out batter as out", async () => {
  const db = new FakeScoringDb({ totalOvers: 5 });
  global.__fakeDb = db;
  db.setInitialPlayers(1, 11, 12, 21);
  await ball.registerBallEvent(db.conn, { inningId: 1, matchId: 100, batsmanId: 11, bowlerId: 21, runsScored: 3 });
  await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 12 }); // hurt
  await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
  await ball.retireBatsman(db.conn, { inningId: 1, matchId: 100, batsmanId: 13, retiredOut: true });
  const live = db.live[1];
  const card = buildInningsScorecard({ balls: db.balls, nameOf, crease: { strikerId: live.on_strike_batsman_id, nonStrikerId: live.non_striker_batsman_id }, squadIds: [] });
  const by = Object.fromEntries(card.batting.map((b) => [b.name, b]));
  expect(by.Bala).toMatchObject({ status: "retired hurt", howOut: "retired hurt" });
  expect(by.Chitra).toMatchObject({ status: "out", howOut: "retired out" });
  expect(card.fallOfWickets.map((f) => [f.playerName, f.how])).toEqual([["Chitra", "retired out"]]);
  expect(card.bowling[0]).toMatchObject({ wickets: 0, overs: "0.1" }); // retired out is not the bowler's wicket
});
