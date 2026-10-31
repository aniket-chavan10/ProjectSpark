// Runs the real scoring services against an in-memory fake of the tables (tests/helpers/fakeScoringDb.js).

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({
  withTransaction: (cb) => cb(global.__fakeDb.conn),
}));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const ball = require("../services/ballEventService");
const liveMatch = require("../services/liveMatchService");
const innings = require("../services/inningsService");
const matchService = require("../services/matchService");
const rules = require("../utils/cricketRules/cricketRules");

const A = { striker: 11, non: 12, bowler: 21, bowler2: 22, fielder: 31 };

const setup = (opts) => {
  const db = new FakeScoringDb(opts);
  global.__fakeDb = db;
  db.setInitialPlayers(1, A.striker, A.non, A.bowler);
  return db;
};

// Score one ball. Defaults to the player on strike / the bowler on the live scorecard.
const score = (db, o = {}, inningId = 1) => {
  const live = db.live[inningId];
  return ball.registerBallEvent(db.conn, {
    inningId,
    matchId: 100,
    batsmanId: live.on_strike_batsman_id,
    bowlerId: live.bowler_id,
    runsScored: 0,
    ...o,
  });
};
const scoreMany = async (db, n, o = {}, inningId = 1) => {
  for (let i = 0; i < n; i++) await score(db, o, inningId);
};

describe("cricket rules", () => {
  test("overs are derived from legal balls, never 0.1 float math", () => {
    expect(rules.ballsToOversString(22)).toBe("3.4");
    expect(rules.oversToBalls("3.4")).toBe(22);
    expect(rules.addBallsToOvers(0.5, 1)).toBe(1);
    expect(rules.addBallsToOvers(1, -1)).toBe(0.5);
    let o = 0;
    for (let i = 0; i < 6; i++) o = rules.addBallsToOvers(o, 1);
    expect(o).toBe(1);
  });

  test("runs run decide strike: wide counts only the runs after the penalty", () => {
    expect(rules.shouldRotateStrike(0, 1, "wide")).toBe(false); // plain wide
    expect(rules.shouldRotateStrike(0, 2, "wide")).toBe(true); // wide + 1 run
    expect(rules.shouldRotateStrike(0, 5, "wide")).toBe(false); // wide + boundary
    expect(rules.shouldRotateStrike(1, 1, "no-ball")).toBe(true);
    expect(rules.shouldRotateStrike(0, 3, "leg-bye")).toBe(true);
    expect(rules.shouldRotateStrike(4, 0, null)).toBe(false);
  });

  test("extra and wicket names are normalised", () => {
    expect(rules.normalizeExtraType("No Ball")).toBe("no-ball");
    expect(rules.normalizeExtraType("LEG_BYE")).toBe("leg-bye");
    expect(rules.normalizeWicketType("Run_Out")).toBe("run out");
    expect(() => rules.normalizeWicketType("exploded")).toThrow(/Unsupported/);
  });
});

describe("over completion", () => {
  test("6th legal ball closes the over, swaps ends and frees the bowler", async () => {
    const db = setup();
    await scoreMany(db, 6);
    const live = db.live[1];
    expect(live.bowler_id).toBeNull();
    expect(live.on_strike_batsman_id).toBe(A.non);
    expect(live.current_overs).toBe("1.0");
    expect(db.innings[1].overs).toBe("1.0");
    expect(db.overs[0].is_complete).toBe(true);
  });

  test("a new bowler starts over 2 with ball 1", async () => {
    const db = setup();
    await scoreMany(db, 6);
    await liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: A.bowler2 });
    await score(db, { runsScored: 1 });
    const last = db.balls[db.balls.length - 1];
    expect([last.over_number, last.ball_number]).toEqual([2, 1]);
    expect(db.live[1].current_overs).toBe("1.1");
  });

  test("a ball cannot be scored before the next bowler is chosen", async () => {
    const db = setup();
    await scoreMany(db, 6);
    await expect(score(db, {})).rejects.toThrow(/No bowler/);
  });

  test("maiden over is credited when nothing is charged to the bowler", async () => {
    const db = setup();
    await scoreMany(db, 6);
    expect(db.perf[`${A.bowler}:100`].maidens).toBe(1);
  });

  test("no maiden when a wide was bowled", async () => {
    const db = setup();
    await score(db, { extraType: "wide" });
    await scoreMany(db, 6);
    expect(db.perf[`${A.bowler}:100`].maidens).toBe(0);
  });
});

describe("extras", () => {
  test("wide with a run: strike changes, no legal ball, charged to the bowler", async () => {
    const db = setup();
    await score(db, { extraType: "wide", extras: 2 });
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
    expect(db.live[1].current_score).toBe(2);
    expect(db.innings[1].balls_bowled).toBe(0);
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(2);
    expect(db.perf[`${A.striker}:100`].balls).toBe(0); // a wide is not a ball faced
  });

  test("no-ball + 4: batter gets 4 and a ball faced, bowler is charged 5, ball does not count", async () => {
    const db = setup();
    await score(db, { extraType: "no-ball", runsScored: 4 });
    const bat = db.perf[`${A.striker}:100`];
    expect([bat.runs, bat.balls, bat.fours]).toEqual([4, 1, 1]);
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(5);
    expect(db.innings[1].balls_bowled).toBe(0);
    expect(db.live[1].current_score).toBe(5);
  });

  test("byes rotate the strike but are not charged to the bowler", async () => {
    const db = setup();
    await score(db, { extraType: "bye", extras: 1 });
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
    expect(db.perf[`${A.bowler}:100`].conceded).toBe(0);
    expect(db.innings[1].balls_bowled).toBe(1);
  });

  test("innings extras total is kept and shown per type", async () => {
    const db = setup();
    await score(db, { extraType: "wide" });
    await score(db, { extraType: "leg-bye", extras: 2 });
    expect(db.innings[1].extras).toBe(3);
  });

  test("rejects runs off the bat on a wide, and extras without a type", async () => {
    const db = setup();
    await expect(score(db, { extraType: "wide", runsScored: 1 })).rejects.toThrow(/bat/);
    await expect(score(db, { extras: 2 })).rejects.toThrow(/extraType/);
  });
});

describe("wickets", () => {
  test("bowled: striker removed, bowler credited, partnership reset, last wicket stored", async () => {
    const db = setup();
    await score(db, { runsScored: 2 });
    await score(db, { isWicket: 1, wicketType: "bowled" });
    const live = db.live[1];
    expect(live.on_strike_batsman_id).toBeNull();
    expect(live.non_striker_batsman_id).toBe(A.non);
    expect(live.current_wickets).toBe(1);
    expect(live.partnership_runs).toBe(0);
    expect(live.last_wicket_player_id).toBe(A.striker);
    expect(db.perf[`${A.bowler}:100`].wkts).toBe(1);
  });

  test("hit wicket without dismissedPlayerId dismisses the striker", async () => {
    const db = setup();
    await score(db, { isWicket: 1, wicketType: "hit wicket" });
    expect(db.live[1].on_strike_batsman_id).toBeNull();
    expect(db.live[1].batsman1_id).toBeNull();
  });

  test("run out: not credited to the bowler, needs a fielder and a batter at the crease", async () => {
    const db = setup();
    await expect(score(db, { isWicket: 1, wicketType: "run out", dismissedPlayerId: A.non })).rejects.toThrow(/Fielder/);
    await expect(
      score(db, { isWicket: 1, wicketType: "run out", dismissedPlayerId: 99, fielderId: A.fielder })
    ).rejects.toThrow(/not at the crease/);
    await score(db, { runsScored: 1, isWicket: 1, wicketType: "run out", dismissedPlayerId: A.non, fielderId: A.fielder });
    expect(db.perf[`${A.bowler}:100`].wkts).toBe(0);
    expect(db.live[1].current_wickets).toBe(1);
    // one run was completed, so the batters crossed: the survivor is now at the non-striker end
    expect(db.live[1].non_striker_batsman_id).toBe(A.striker);
    expect(db.live[1].on_strike_batsman_id).toBeNull();
  });

  test("a duck is only counted when the batter is out for 0, not on dot balls", async () => {
    const db = setup();
    await scoreMany(db, 3);
    expect(db.stats[A.striker].ducks).toBe(0);
    await score(db, { isWicket: 1, wicketType: "caught" });
    expect(db.stats[A.striker].ducks).toBe(1);
  });

  test("no duck for a batter who scored before getting out", async () => {
    const db = setup();
    await score(db, { runsScored: 2 });
    await score(db, { isWicket: 1, wicketType: "lbw" });
    expect(db.stats[A.striker].ducks).toBe(0);
  });

  test("impossible dismissals are rejected", async () => {
    const db = setup();
    await expect(score(db, { extraType: "wide", isWicket: 1, wicketType: "bowled" })).rejects.toThrow(/off a wide/);
    await expect(score(db, { extraType: "no-ball", isWicket: 1, wicketType: "caught" })).rejects.toThrow(/off a no-ball/);
    await expect(score(db, { isWicket: 1, wicketType: "caught", dismissedPlayerId: A.non })).rejects.toThrow(/Only the striker/);
    await expect(score(db, { isWicket: 1 })).rejects.toThrow(/wicketType/);
  });

  test("the incoming batsman must be chosen before the next ball", async () => {
    const db = setup();
    await score(db, { isWicket: 1, wicketType: "bowled" });
    await expect(score(db, {})).rejects.toThrow(/incoming batsman/);
  });

  test("only a vacant end can take a new batsman", async () => {
    const db = setup();
    await score(db, { isWicket: 1, wicketType: "bowled" });
    await expect(liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "nonStriker" })).rejects.toThrow(/not vacant/);
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
    expect(db.live[1].on_strike_batsman_id).toBe(13);
    expect(db.live[1].batsman1_id).toBe(13);
    await score(db, {});
  });

  test("all out ends the innings and blocks further balls", async () => {
    const db = setup();
    let next = 20;
    for (let w = 0; w < 10; w++) {
      if (w > 0) {
        const end = db.live[1].on_strike_batsman_id ? "nonStriker" : "striker"; // whichever end is vacant
        await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: ++next, end });
      }
      if (db.live[1].bowler_id === null) await liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: w % 2 ? 22 : 21 });
      await score(db, { isWicket: 1, wicketType: "bowled" });
    }
    expect(db.innings[1].status).toBe("completed");
    expect(db.matches[100].target_score).toBe(1);
    await expect(score(db, {})).rejects.toThrow(/already completed|over/);
  });
});

describe("strike and validation", () => {
  test("odd runs swap the strike, even runs do not", async () => {
    const db = setup();
    await score(db, { runsScored: 1 });
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
    await score(db, { runsScored: 4 });
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
  });

  test("a batsman who is not on strike is rejected", async () => {
    const db = setup();
    await expect(score(db, { batsmanId: 999, runsScored: 6 })).rejects.toThrow(/Striker mismatch/);
    expect(db.balls).toHaveLength(0);
    expect(db.perf[`999:100`]).toBeUndefined();
  });

  test("the wrong bowler is rejected", async () => {
    const db = setup();
    await expect(score(db, { bowlerId: 77 })).rejects.toThrow(/Bowler mismatch/);
  });

  test("changeStriker only accepts a batsman at the crease", async () => {
    const db = setup();
    await expect(ball.changeStriker(db.conn, 1, 99)).rejects.toThrow(/crease/);
    await ball.changeStriker(db.conn, 1, A.non);
    expect(db.live[1].on_strike_batsman_id).toBe(A.non);
    expect(db.live[1].non_striker_batsman_id).toBe(A.striker);
  });
});

describe("match result", () => {
  const startChase = (db, target) => {
    db.matches[100].target_score = target;
    db.setInitialPlayers(2, 41, 42, 51);
    return 2;
  };

  test("chase reached: match and innings complete, further balls rejected", async () => {
    const db = setup();
    const inn = startChase(db, 5);
    await score(db, { runsScored: 6 }, inn);
    expect(db.matches[100].status).toBe("completed");
    expect(db.matches[100].winner_team_id).toBe(2);
    expect(db.matches[100].victory_margin_type).toBe("wickets");
    expect(db.innings[2].status).toBe("completed");
    await expect(score(db, { runsScored: 6 }, inn)).rejects.toThrow(/already completed/);
  });

  test("scores level at the end of the chase is a tie, not a win by 0 runs", async () => {
    const db = setup({ totalOvers: 1 });
    const inn = startChase(db, 21);
    db.live[2].current_score = 14;
    db.innings[2].total_runs = 14;
    for (let i = 0; i < 6; i++) await score(db, { runsScored: i === 5 ? 6 : 0 }, inn);
    expect(db.matches[100].status).toBe("completed");
    expect(db.matches[100].winner_team_id).toBeNull();
    expect(db.matches[100].victory_margin).toBe(0);
  });

  test("fell short: the first-innings team wins by runs", async () => {
    const db = setup({ totalOvers: 1 });
    const inn = startChase(db, 21);
    for (let i = 0; i < 6; i++) await score(db, { runsScored: i === 5 ? 1 : 0 }, inn);
    expect(db.matches[100].winner_team_id).toBe(1);
    expect(db.matches[100].victory_margin_type).toBe("runs");
    expect(db.matches[100].victory_margin).toBe(19);
  });

  test("the second innings cannot be scored before the first is finished", async () => {
    const db = setup();
    db.setInitialPlayers(2, 41, 42, 51);
    await expect(score(db, {}, 2)).rejects.toThrow(/First innings/);
  });

  test("innings 1 finishing sets the target from its total", async () => {
    const db = setup({ totalOvers: 1 });
    for (let i = 0; i < 6; i++) await score(db, { runsScored: 2 });
    expect(db.matches[100].target_score).toBe(13);
    expect(db.innings[1].status).toBe("completed");
  });
});

describe("tournament bracket", () => {
  // fixtures: 1 and 2 feed 3, 3 feeds 4
  const withBracket = (db) => {
    db.tm = [
      { id: 7, match_id: 100, status: "live", team1_id: 1, team2_id: 2, dependent_match1_id: null, dependent_match2_id: null },
      { id: 8, match_id: null, status: "scheduled", team1_id: 3, team2_id: 4, dependent_match1_id: null, dependent_match2_id: null },
      { id: 9, match_id: null, status: "scheduled", team1_id: null, team2_id: null, dependent_match1_id: 7, dependent_match2_id: 8 },
      { id: 10, match_id: null, status: "scheduled", team1_id: null, team2_id: 5, dependent_match1_id: 9, dependent_match2_id: null },
    ];
  };

  test("the winner fills only the direct next match (ids come from the fixture, not match_id)", async () => {
    const db = setup();
    withBracket(db);
    db.matches[100].target_score = 5;
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, { runsScored: 6 }, 2);
    expect(db.tm.find((m) => m.id === 9).team1_id).toBe(2);
    expect(db.tm.find((m) => m.id === 10).team1_id).toBeNull(); // the final must NOT get it yet
  });

  test("the loser goes to a third-place match when the slot asks for the loser", async () => {
    const db = setup();
    withBracket(db);
    db.tm.push({ id: 11, match_id: null, status: "scheduled", team1_id: null, team2_id: null, dependent_match1_id: 7, dependent_match1_type: "loser", dependent_match2_id: 8, dependent_match2_type: "loser" });
    db.matches[100].target_score = 5;
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, { runsScored: 6 }, 2); // team 2 (chasing) wins, team 1 loses
    expect(db.tm.find((m) => m.id === 9).team1_id).toBe(2); // winner to the next round
    expect(db.tm.find((m) => m.id === 11).team1_id).toBe(1); // loser to third place
  });

  test("a tie does not advance anyone", async () => {
    const db = setup({ totalOvers: 1 });
    withBracket(db);
    db.matches[100].target_score = 7;
    db.setInitialPlayers(2, 41, 42, 51);
    for (let i = 0; i < 6; i++) await score(db, { runsScored: i === 0 ? 6 : 0 }, 2);
    expect(db.matches[100].winner_team_id).toBeNull();
    expect(db.tm.find((m) => m.id === 9).team1_id).toBeNull();
  });

  test("undoing the winning ball takes the winner back out of the bracket", async () => {
    const db = setup();
    withBracket(db);
    db.matches[100].target_score = 5;
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, { runsScored: 6 }, 2);
    await ball.undoLastBallEvent(db.conn, 2, 100);
    expect(db.matches[100].status).toBe("live");
    expect(db.innings[2].status).toBe("live");
    expect(db.tm.find((m) => m.id === 9).team1_id).toBeNull();
  });

  test("undo is refused once the next round has started", async () => {
    const db = setup();
    withBracket(db);
    db.matches[100].target_score = 5;
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, { runsScored: 6 }, 2);
    db.tm.find((m) => m.id === 9).status = "live";
    await expect(ball.undoLastBallEvent(db.conn, 2, 100)).rejects.toThrow(/next round/);
  });
});

describe("undo", () => {
  test("mid over: score, ends and figures go back", async () => {
    const db = setup();
    await score(db, { runsScored: 1 });
    await score(db, { runsScored: 4 });
    await ball.undoLastBallEvent(db.conn, 1, 100);
    const live = db.live[1];
    expect([live.current_score, live.legal_balls_in_over, live.on_strike_batsman_id]).toEqual([1, 1, A.non]);
    expect(live.partnership_runs).toBe(1);
    expect(db.perf[`${A.non}:100`].runs).toBe(0);
    expect(db.innings[1].balls_bowled).toBe(1);
  });

  test("the ball that finished an over: bowler, strike, over and maiden come back", async () => {
    const db = setup();
    await scoreMany(db, 5);
    await score(db, { runsScored: 1 });
    expect(db.live[1].bowler_id).toBeNull();
    await ball.undoLastBallEvent(db.conn, 1, 100);
    const live = db.live[1];
    expect(live.bowler_id).toBe(A.bowler);
    expect(live.on_strike_batsman_id).toBe(A.striker);
    expect(live.non_striker_batsman_id).toBe(A.non);
    expect([live.legal_balls_in_over, live.current_overs, live.current_score]).toEqual([5, "0.5", 0]);
    expect(db.overs[0].is_complete).toBe(false);
    // and the over can be finished again
    await score(db, { runsScored: 0 });
    expect(db.live[1].current_overs).toBe("1.0");
  });

  test("undo after the next bowler was already chosen removes the empty over", async () => {
    const db = setup();
    await scoreMany(db, 6);
    await liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: A.bowler2 });
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect(db.live[1].bowler_id).toBe(A.bowler);
    expect(db.overs).toHaveLength(1);
  });

  test("a wicket: the batter is put back, wickets and last wicket revert", async () => {
    const db = setup();
    await score(db, { runsScored: 3 });
    await score(db, { isWicket: 1, wicketType: "bowled" });
    await ball.undoLastBallEvent(db.conn, 1, 100);
    const live = db.live[1];
    expect([live.on_strike_batsman_id, live.non_striker_batsman_id]).toEqual([A.non, A.striker]);
    expect([live.batsman1_id, live.batsman2_id]).toEqual([A.striker, A.non]);
    expect(live.current_wickets).toBe(0);
    expect(live.last_wicket_player_id).toBeNull();
    expect(live.partnership_runs).toBe(3);
    expect(db.perf[`${A.bowler}:100`].wkts).toBe(0);
  });

  test("a wicket where the new batsman is already in (striker was out) is refused clearly", async () => {
    const db = setup();
    await score(db, { isWicket: 1, wicketType: "bowled" });
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "striker" });
    await expect(ball.undoLastBallEvent(db.conn, 1, 100)).rejects.toThrow(/incoming batsman/);
  });

  test("a run out of the non-striker can be undone even after the new batsman came in", async () => {
    const db = setup();
    await score(db, { runsScored: 0, isWicket: 1, wicketType: "run out", dismissedPlayerId: A.non, fielderId: A.fielder });
    await liveMatch.setNewBatsman({ matchId: 100, inningId: 1, newBatsmanId: 13, end: "nonStriker" });
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect([db.live[1].on_strike_batsman_id, db.live[1].non_striker_batsman_id]).toEqual([A.striker, A.non]);
  });

  test("undoing the ball that ended innings 1 clears the target; re-scoring sets the new one", async () => {
    const db = setup({ totalOvers: 1 });
    for (let i = 0; i < 6; i++) await score(db, { runsScored: 1 });
    expect(db.matches[100].target_score).toBe(7);
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect(db.matches[100].target_score).toBeNull();
    expect(db.innings[1].status).toBe("live");
    await score(db, { runsScored: 4 });
    expect(db.matches[100].target_score).toBe(10);
  });

  test("innings 1 cannot be undone once innings 2 has balls", async () => {
    const db = setup({ totalOvers: 1 });
    for (let i = 0; i < 6; i++) await score(db, { runsScored: 1 });
    db.setInitialPlayers(2, 41, 42, 51);
    await score(db, {}, 2);
    await expect(ball.undoLastBallEvent(db.conn, 1, 100)).rejects.toThrow(/second innings/i);
  });

  test("nothing to undo", async () => {
    const db = setup();
    await expect(ball.undoLastBallEvent(db.conn, 1, 100)).rejects.toThrow(/No ball events/);
  });
});

describe("career and match figures", () => {
  test("bowler overs are cricket overs (6 balls = 1.0) and undo walks them back", async () => {
    const db = setup();
    await scoreMany(db, 6);
    expect(db.perf[`${A.bowler}:100`].overs).toBe(1);
    expect(db.stats[A.bowler].overs).toBe(1);
    await ball.undoLastBallEvent(db.conn, 1, 100);
    expect(db.perf[`${A.bowler}:100`].overs).toBe(0.5);
  });
});

describe("bowler rules", () => {
  test("setNewBowler only works when the slot is empty", async () => {
    const db = setup();
    await expect(liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: A.bowler2 })).rejects.toThrow(/not empty/);
  });

  test("no new over once all overs are bowled", async () => {
    const db = setup({ totalOvers: 1 });
    db.live[1].bowler_id = null;
    db.live[1].legal_over_count = 1;
    await expect(liveMatch.setNewBowler({ matchId: 100, inningId: 1, newBowlerId: A.bowler2 })).rejects.toThrow(/overs/);
  });
});

describe("switch innings", () => {
  test("refuses while the innings is still on, and sets the target when it ends", async () => {
    const db = setup({ totalOvers: 1 });
    await scoreMany(db, 3, { runsScored: 1 });
    await expect(innings.switchInnings(db.conn, { matchId: 100, currentInningId: 1 })).rejects.toThrow(/not finished/);
    const res = await innings.switchInnings(db.conn, { matchId: 100, currentInningId: 1, forceEnd: true });
    expect(res.newInningId).toBe(2);
    expect(db.innings[1].status).toBe("completed");
    expect(db.innings[1].overs).toBe("0.3");
    expect(db.matches[100].target_score).toBe(4);
  });
});

describe("toss", () => {
  const fixture = () => {
    const db = new FakeScoringDb();
    global.__fakeDb = db;
    db.tm = [
      { id: 5, tournament_id: 1, match_no: 1, team1_id: 1, team2_id: 2, venue: "Ground", match_id: null, status: "scheduled" },
      { id: 6, tournament_id: 1, match_no: 2, team1_id: null, team2_id: 2, venue: "Ground", match_id: null, status: "scheduled" },
    ];
    return db;
  };

  test("records the toss once and returns the new ids", async () => {
    const db = fixture();
    db.tm[0].overs = 4;
    const res = await matchService.setToss(5, 2, "bat");
    expect(db.matches[res.matchId].total_overs).toBe(4); // the overs the host scheduled
    expect(res.battingTeamId).toBe(2);
    expect(res.bowlingTeamId).toBe(1);
    expect(db.tm[0].match_id).toBe(res.matchId);
    await expect(matchService.setToss(5, 2, "bat")).rejects.toThrow(/already been recorded/);
  });

  test("rejects a bad decision, an unknown winner and undecided teams", async () => {
    fixture();
    await expect(matchService.setToss(5, 2, "maybe")).rejects.toThrow(/bat/);
    await expect(matchService.setToss(5, 9, "bat")).rejects.toThrow(/Invalid toss winner/);
    await expect(matchService.setToss(6, 2, "bat")).rejects.toThrow(/not decided/);
  });
});
