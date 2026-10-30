jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));

const { getLiveScoreboard } = require("../services/liveScoreService");

// Canned rows keyed by the table/columns each model query reads.
const makeConn = ({ match, innings, live, perf = [], balls = [], wickets = [], extras = [], players = [], teams = {} }) => ({
  execute: async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ");
    if (s.includes("FROM matches WHERE match_id")) return [[match]];
    if (s.includes("FROM innings WHERE match_id")) return [innings];
    if (s.includes("FROM live_scorecards l JOIN teams")) return [live];
    if (s.includes("FROM player_performance")) return [perf];
    if (s.includes("GROUP BY extra_type")) return [extras.filter((e) => e.inning_id === params[0]).map(({ extra_type, total }) => ({ extra_type, total }))];
    if (s.includes("AS legal_balls_upto")) return [wickets.filter((w) => w.inning_id === params[0])];
    if (s.includes("FROM balls") && s.includes("ORDER BY over_number DESC")) return [balls.filter((b) => b.inning_id === params[0])];
    if (s.includes("INNER JOIN teams_squad")) return [[]];
    if (s.includes("FROM players_core")) return [players];
    if (s.includes("FROM teams WHERE id")) return [teams[params[0]] ? [teams[params[0]]] : []];
    throw new Error("unexpected SQL " + s.slice(0, 80));
  },
});

const baseMatch = { match_id: 100, tournament_id: 1, match_no: 1, team1_id: 1, team2_id: 2, total_overs: 5, status: "live", target_score: null };
const inn = (o) => ({ inning_id: 1, team_id: 1, total_runs: 0, wickets: 0, innings_number: 1, balls_bowled: 0, status: "live", extras: 0, ...o });
const ls = (o) => ({ inning_id: 1, on_strike_batsman_id: 11, non_striker_batsman_id: 12, batsman1_id: 11, batsman2_id: 12, bowler_id: 21, partnership_runs: 0, ...o });
const teams = { 1: { id: 1, team_name: "Alpha", logo: null }, 2: { id: 2, team_name: "Beta", logo: null } };
const players = [11, 12, 21, 31].map((id) => ({ player_id: id, players_name: `P${id}`, profile_picture: null, team_id: 1 }));

test("each batsman appears once, striker first, with derived strike rate", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn({ balls_bowled: 4, total_runs: 7 })],
    live: [ls()],
    perf: [{ player_id: 11, runs_scored: 6, balls_faced: 4, fours: 1, sixes: 0 }],
    players,
    teams,
  });
  const out = await getLiveScoreboard(conn, 100);
  const batsmen = out.innings[0].currentBatsmen;
  expect(batsmen.map((b) => b.playerId)).toEqual([11, 12]);
  expect(batsmen[0]).toMatchObject({ isOnStrike: true, runs: 6, balls: 4, strikeRate: "150.00" });
  expect(out.innings[0].overs).toBe("0.4");
  expect(out.innings[0].runRate).toBe(10.5);
});

test("a dismissed batsman is left out until the new one comes in", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn({ balls_bowled: 1, wickets: 1 })],
    live: [ls({ on_strike_batsman_id: null, batsman1_id: null })],
    players,
    teams,
  });
  const out = await getLiveScoreboard(conn, 100);
  expect(out.innings[0].currentBatsmen.map((b) => b.playerId)).toEqual([12]);
});

test("extras are broken down per type from the ball log", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn()],
    live: [ls()],
    extras: [
      { inning_id: 1, extra_type: "wide", total: 3 },
      { inning_id: 1, extra_type: "no-ball", total: 1 },
      { inning_id: 1, extra_type: "leg-bye", total: 2 },
    ],
    players,
    teams,
  });
  const { extrasBreakdown } = (await getLiveScoreboard(conn, 100)).innings[0];
  expect(extrasBreakdown).toEqual({ wides: 3, noBalls: 1, byes: 0, legByes: 2, penalty: 0, total: 6 });
});

test("fall of wickets carries names, score, over and type", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn({ wickets: 1 })],
    live: [ls()],
    wickets: [
      { inning_id: 1, dismissed_player_id: 11, bowler_id: 21, fielder_id: 31, wicket_type: "caught", legal_balls_upto: 8, score_at_fall: 23 },
    ],
    players,
    teams,
  });
  const [w] = (await getLiveScoreboard(conn, 100)).innings[0].wicketFalls;
  expect(w).toMatchObject({ wicketNumber: 1, playerOutName: "P11", scoreAtFall: 23, over: "1.2", wicketType: "caught", bowlerName: "P21", fielderName: "P31" });
});

test("bowler economy comes from conceded runs and cricket overs", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn({ balls_bowled: 9 })],
    live: [ls()],
    perf: [{ player_id: 21, total_runs_conceded: 9, overs_bowled: 1.3, wickets_taken: 1, maiden_overs: 0 }],
    players,
    teams,
  });
  const bowler = (await getLiveScoreboard(conn, 100)).innings[0].currentBowler;
  expect(bowler.economy).toBe("6.00"); // 9 runs off 9 balls
});

test("the current over is shown oldest ball first", async () => {
  const conn = makeConn({
    match: baseMatch,
    innings: [inn({ balls_bowled: 3 })],
    live: [ls()],
    balls: [3, 2, 1].map((n) => ({ inning_id: 1, over_number: 1, ball_number: n, runs_scored: n, is_wicket: 0, extras: 0 })),
    players,
    teams,
  });
  const summary = (await getLiveScoreboard(conn, 100)).innings[0].currentOverSummary;
  expect(summary.map((b) => b.ballNumber)).toEqual([1, 2, 3]);
});

test("a completed tied match reports a tie, not a win", async () => {
  const conn = makeConn({
    match: { ...baseMatch, status: "completed", target_score: 21 },
    innings: [
      inn({ inning_id: 1, team_id: 1, total_runs: 20, innings_number: 1, balls_bowled: 30 }),
      inn({ inning_id: 2, team_id: 2, total_runs: 20, innings_number: 2, balls_bowled: 30, status: "completed" }),
    ],
    live: [ls({ inning_id: 1 }), ls({ inning_id: 2 })],
    players,
    teams,
  });
  const out = await getLiveScoreboard(conn, 100);
  expect(out.matchResult).toEqual({ winnerTeamId: null, winnerTeamName: null, marginType: "tie", marginValue: 0 });
});

test("a knockout match whose teams are not decided yet does not crash", async () => {
  const conn = makeConn({
    match: { ...baseMatch, team1_id: null, team2_id: null },
    innings: [],
    live: [],
    players: [],
    teams,
  });
  const out = await getLiveScoreboard(conn, 100);
  expect(out.teams.team1.players).toEqual([]);
});
