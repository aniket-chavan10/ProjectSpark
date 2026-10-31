// The whole match screen flow through the REAL controllers and services: fixture details, toss,
// openers, scoring, scoreboard, scorecard, retirement, undo, second innings and the result.
// Only MySQL is replaced (tests/helpers/fakeMatchDb.js).

jest.mock("../dbconfigure", () => ({
  execute: (...a) => global.__db.execute(...a),
  query: (...a) => global.__db.execute(...a),
  getConnection: () => global.__db.getConnection(),
}));

const { FakeMatchDb } = require("./helpers/fakeMatchDb");
const liveMatch = require("../controllers/liveMatchController");
const matchController = require("../controllers/matchController");
const ballEvent = require("../controllers/ballEventController");
const innings = require("../controllers/inningsController");
const liveScore = require("../controllers/liveScoreController");

const emitted = [];
const app = { get: () => ({ to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) }) };

// call a controller like express would
const call = async (handler, { params = {}, body = {} } = {}) => {
  let status = 200;
  let json;
  const res = { status: (c) => ((status = c), res), json: (b) => ((json = b), res) };
  await handler({ params, body, app, headers: {} }, res);
  return { status, json };
};

const HOME = Array.from({ length: 11 }, (_, i) => ({ id: 101 + i, name: `Home ${i + 1}` }));
const AWAY = Array.from({ length: 11 }, (_, i) => ({ id: 201 + i, name: `Away ${i + 1}` }));

beforeEach(() => {
  emitted.length = 0;
  global.__db = new FakeMatchDb({ teams: [{ id: 1, name: "Home XI", players: HOME }, { id: 2, name: "Away XI", players: AWAY }], totalOvers: 2 });
  global.__db.fixture.overs = 2;
});

const toss = (decision = "bat", winner = 1) => call(matchController.setToss, { params: { matchId: "7" }, body: { tossWinnerId: winner, tossDecision: decision } });
const openers = (inningId, s, n, b) => call(liveMatch.setInitialPlayers, { body: { matchId: 101, inningId, strikerId: s, nonStrikerId: n, bowlerId: b } });
const ball = (inningId, o = {}) => call(ballEvent.registerBallEvent, { body: { matchId: 101, inningId, runsScored: 0, ...o } });
const board = async () => (await call(liveScore.getLiveScore, { params: { matchId: "101" } })).json;
const card = async () => (await call(liveScore.getScorecard, { params: { matchId: "101" } })).json;

test("the fixture page: both squads, the overs, and no live match yet", async () => {
  const { status, json } = await call(liveMatch.getMatchDetails, { params: { matchId: "7" } });
  expect(status).toBe(200);
  expect(json.match).toMatchObject({ match_id: null, stage: "group", overs: 2, tournament_name: "Diwali Cup", venue: "Village Ground" });
  expect([json.team1.team_name, json.team2.team_name]).toEqual(["Home XI", "Away XI"]);
  expect(json.team1.squad).toHaveLength(11);
});

test("toss creates the live match with the scheduled overs, once, and the fixture remembers it", async () => {
  const r = await toss("bowl", 1); // home won and chose to bowl, so away bat first
  expect(r.status).toBe(200);
  expect(r).toMatchObject({ json: { matchId: 101, battingTeamId: 2, bowlingTeamId: 1 } });
  expect((await call(liveMatch.getMatchDetails, { params: { matchId: "7" } })).json.match.match_id).toBe(101);
  expect((await toss("bat", 1)).status).toBe(409); // a second toss is refused
  expect((await board()).maxOvers).toBe(2);
  expect(emitted.some((e) => e.event === "toss_updated" && e.room === "match_101")).toBe(true);
});

test("openers must belong to the right teams", async () => {
  await toss("bat", 1); // home bat: innings 11
  expect((await openers(11, 201, 202, 201)).status).toBe(400); // away players cannot open for home
  expect((await openers(11, 101, 101, 201)).status).toBe(400); // the same player twice
  expect((await openers(11, 101, 102, 101)).status).toBe(400); // a batter cannot bowl
  expect((await openers(11, 101, 102, 201)).status).toBe(200);
});

test("scoring through the controllers: scoreboard flags, scorecard, undo with a stale id, retirement", async () => {
  await toss("bat", 1);
  await openers(11, 101, 102, 201);
  let sb = await board();
  expect(sb.innings[0]).toMatchObject({ lastBallId: 0, freeHit: false, maxWickets: 10, awaiting: { batsmanEnd: null, bowler: false } });
  expect(sb.teams.team1.players).toHaveLength(11);

  expect((await ball(11, { runsScored: 4, lastBallId: 0 })).status).toBe(201);
  expect((await ball(11, { runsScored: 1, lastBallId: 0 })).status).toBe(409); // stale: a double tap
  expect((await ball(11, { extraType: "no-ball" })).status).toBe(201);
  sb = await board();
  expect(sb.innings[0]).toMatchObject({ totalRuns: 5, freeHit: true });

  const wicketOnFreeHit = await ball(11, { isWicket: 1, wicketType: "bowled" });
  expect(wicketOnFreeHit.status).toBe(400);
  expect(wicketOnFreeHit.json.message).toMatch(/free hit/);

  expect((await ball(11, { isWicket: 1, wicketType: "run out", dismissedPlayerId: 102, fielderId: 205, runsScored: 1 })).status).toBe(201);
  sb = await board();
  const inn = sb.innings[0];
  expect(inn.awaiting).toEqual({ batsmanEnd: "striker", bowler: false });
  expect(inn.wicketFalls).toMatchObject([{ playerOutName: "Home 2", wicketType: "run out", fielderName: "Away 5", scoreAtFall: 6 }]);

  // the incoming batsman, then a retirement and the retired batter coming back
  expect((await call(liveMatch.setNewBatsman, { body: { matchId: 101, inningId: 11, newBatsmanId: 103, end: "striker" } })).status).toBe(200);
  expect((await call(liveMatch.setNewBatsman, { body: { matchId: 101, inningId: 11, newBatsmanId: 102, end: "striker" } })).status).toBeGreaterThanOrEqual(400); // out, and the end is taken
  expect((await call(ballEvent.retireBatsman, { body: { matchId: 101, inningId: 11, batsmanId: 101 } })).status).toBe(201);
  sb = await board();
  expect(sb.innings[0].retiredHurt).toEqual([101]);
  expect(sb.innings[0].awaiting.batsmanEnd).toBeTruthy();

  const c = await card();
  const bat = Object.fromEntries(c.innings[0].batting.map((b) => [b.name, b]));
  expect(bat["Home 1"]).toMatchObject({ runs: 5, status: "retired hurt" });
  expect(bat["Home 2"]).toMatchObject({ status: "out", howOut: "run out (Away 5)" });
  expect(c.innings[0].extras).toMatchObject({ noBalls: 1, total: 1 });

  // undo needs the id of the ball the scorer is looking at
  await call(liveMatch.setNewBatsman, { body: { matchId: 101, inningId: 11, newBatsmanId: 104, end: sb.innings[0].awaiting.batsmanEnd } });
  sb = await board();
  expect((await call(ballEvent.undoLastBallEvent, { body: { inningId: 11, matchId: 101, lastBallId: 999 } })).status).toBe(409);
  expect(emitted.filter((e) => e.event === "scoreUpdate").length).toBeGreaterThan(3); // every action is pushed to the overlay
});

test("a whole 2-over match: both innings, the target, the chase and the result", async () => {
  await toss("bat", 1);
  await openers(11, 101, 102, 201);
  // innings 1: 12 legal balls of 1 run: 12/0
  for (let over = 0; over < 2; over++) {
    for (let b = 0; b < 6; b++) expect((await ball(11, { runsScored: 1 })).status).toBe(201);
    if (over === 0) expect((await call(liveMatch.setNewBowler, { body: { matchId: 101, inningId: 11, newBowlerId: 202 } })).status).toBe(200);
  }
  let sb = await board();
  expect(sb.innings[0]).toMatchObject({ status: "completed", totalRuns: 12, overs: "2.0" });
  expect(sb.innings[1].targetScore).toBe(13);
  expect(sb.status).toBe("live");

  // innings 2 cannot be set up with the wrong players, then a quick win
  expect((await openers(12, 101, 102, 201)).status).toBe(400);
  expect((await openers(12, 201, 202, 101)).status).toBe(200);
  expect((await ball(12, { runsScored: 6 })).status).toBe(201);
  expect((await ball(12, { runsScored: 6 })).status).toBe(201);
  expect((await ball(12, { runsScored: 1 })).status).toBe(201); // 13: chased
  sb = await board();
  expect(sb.status).toBe("completed");
  expect(sb.matchResult).toMatchObject({ winnerTeamName: "Away XI", marginType: "wickets", marginValue: 10 });
  expect((await ball(12, { runsScored: 1 })).status).toBe(409); // nothing after the end
  expect(global.__db.tm[0]).toMatchObject({ status: "completed", winner_team_id: 2 });

  const c = await card();
  expect(c.innings.map((i) => `${i.runs}/${i.wickets}`)).toEqual(["12/0", "13/0"]);
  expect(c.innings[0].bowling.map((b) => [b.name, b.overs, b.runs])).toEqual([["Away 1", "1.0", 6], ["Away 2", "1.0", 6]]);
});

test("ending the innings early sets the target and moves on", async () => {
  await toss("bat", 1);
  await openers(11, 101, 102, 201);
  await ball(11, { runsScored: 3 });
  const early = await call(innings.switchInnings, { body: { matchId: 101, currentInningId: 11 } });
  expect(early.status).toBe(409); // not finished, and no forceEnd
  const forced = await call(innings.switchInnings, { body: { matchId: 101, currentInningId: 11, forceEnd: true } });
  expect(forced.status).toBe(201);
  expect((await board()).innings[1].targetScore).toBe(4);
});
