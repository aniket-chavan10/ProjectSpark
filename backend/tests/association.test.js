// Points, player figures, rankings, result text, bans at the toss, and the "never block the result" rule
// of the post-match steps. Pure logic runs directly; the toss runs the REAL services on the fake match DB.

jest.mock("../dbconfigure", () => ({
  execute: (...a) => global.__db.execute(...a),
  query: (...a) => global.__db.execute(...a),
  getConnection: () => global.__db.getConnection(),
}));

const { FakeMatchDb } = require("./helpers/fakeMatchDb");
const matchController = require("../controllers/matchController");
const squads = require("../services/squadService");
const points = require("../services/pointsService");
const stats = require("../services/playerStatsService");
const ranking = require("../services/playerRankingService");
const hooks = require("../services/postMatchHooks");
const bans = require("../services/banService");
const overlay = require("../services/overlayService");
const { resultText, stageLabel } = require("../utils/resultText");

/* --------------------------------- points --------------------------------- */

describe("which rule a win earns", () => {
  const group = (round) => ({ stage: "group", round_number: round });

  test("group rounds are round1, round2 ... and the last round of the group is the group final", () => {
    expect(points.ruleKeyFor(group(1), 3)).toBe("round1");
    expect(points.ruleKeyFor(group(2), 3)).toBe("round2");
    expect(points.ruleKeyFor(group(3), 3)).toBe("group_final");
    // a 4-team group has only two rounds
    expect(points.ruleKeyFor(group(1), 2)).toBe("round1");
    expect(points.ruleKeyFor(group(2), 2)).toBe("group_final");
  });

  test("a group of one round is not a 'final' of anything: it is round1", () => {
    expect(points.ruleKeyFor(group(1), 1)).toBe("round1");
  });

  test("a 16-team group goes round1, round2, round3, then the group final", () => {
    expect(points.ruleKeyFor(group(3), 4)).toBe("round3");
    expect(points.ruleKeyFor(group(4), 4)).toBe("group_final");
  });

  test("knock-outs", () => {
    expect(points.ruleKeyFor({ stage: "semi", round_number: 4 })).toBe("semi");
    expect(points.ruleKeyFor({ stage: "final", round_number: 5 })).toBe("final");
    expect(points.ruleKeyFor({ stage: "third_place", round_number: 5 })).toBe("third_place");
  });
});

describe("ranking order", () => {
  const row = (name, p, titles = 0, won = 0) => ({ name, points: p, titles, won });

  test("points first, then titles, then wins, then name", () => {
    const out = points.assignRanks([row("Delta", 50, 0, 3), row("Alpha", 90), row("Charlie", 50, 1, 1), row("Bravo", 50, 0, 3)]);
    expect(out.map((r) => r.name)).toEqual(["Alpha", "Charlie", "Bravo", "Delta"]);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3, 3]); // Bravo and Delta are level
  });

  test("a team with nothing yet ranks last without breaking", () => {
    expect(points.assignRanks([row("Zed", 0), row("Amy", 10)]).map((r) => r.name)).toEqual(["Amy", "Zed"]);
  });
});

/* ---------------------- the full path of one champion ---------------------- */

describe("what a champion collects", () => {
  test("every round on the way adds up, so the final is worth the most", () => {
    // 8-team group (3 rounds) + semi + final with the default rules
    const rules = { participation: 5, round1: 10, round2: 15, group_final: 25, semi: 40, final: 60 };
    const path = [{ stage: "group", round_number: 1 }, { stage: "group", round_number: 2 }, { stage: "group", round_number: 3 }, { stage: "semi" }, { stage: "final" }];
    const total = path.reduce((sum, f) => sum + rules[points.ruleKeyFor(f, 3)], rules.participation);
    expect(total).toBe(155);
    // the runner-up played the same path but lost the final
    expect(total - rules.final).toBe(95);
  });
});

/* ----------------------------- player figures ----------------------------- */

const inning = (inningId, teamId, batting, bowling) => ({ inningId, teamId, batting, bowling });
const bat = (playerId, runs, balls, status = "out", extra = {}) => ({ playerId, runs, balls, fours: 0, sixes: 0, status, howOut: status === "out" ? "b X" : "not out", ...extra });
const bowl = (playerId, legalBalls, runs, wickets, extra = {}) => ({ playerId, legalBalls, runs, wickets, maidens: 0, wides: 0, noBalls: 0, ...extra });

describe("player figures of a match", () => {
  const innings = [
    inning(1, 1, [bat(11, 30, 20, "out"), bat(12, 12, 10, "not out"), bat(13, 0, 3, "out")], [bowl(21, 12, 20, 0)]),
    inning(2, 2, [bat(21, 5, 6, "out")], [bowl(11, 12, 18, 2, { maidens: 1 }), bowl(12, 6, 9, 0)]),
  ];
  const balls = {
    1: [],
    2: [
      { is_wicket: 1, wicket_type: "caught", fielder_id: 12, bowler_id: 11, batsman_id: 21 },
      { is_wicket: 1, wicket_type: "caught", fielder_id: 11, bowler_id: 11, batsman_id: 22 }, // caught and bowled
      { is_wicket: 1, wicket_type: "stumped", fielder_id: 14, bowler_id: 12, batsman_id: 23 },
      { is_wicket: 1, wicket_type: "run out", fielder_id: 13, bowler_id: 12, batsman_id: 24 },
      { is_wicket: 1, wicket_type: "bowled", fielder_id: null, bowler_id: 11, batsman_id: 25 },
    ],
  };
  const squadRows = [
    { team_id: 1, player_id: 11, role: "playing", is_keeper: 0 },
    { team_id: 1, player_id: 14, role: "playing", is_keeper: 1 },
    { team_id: 1, player_id: 15, role: "reserve", is_keeper: 0 },
    { team_id: 2, player_id: 21, role: "playing", is_keeper: 0 },
  ];
  const rows = stats.computeRows({ matchId: 9, tournamentId: 3, seasonYear: 2026, innings, ballsByInning: balls, squads: squadRows });
  const by = (id) => rows.find((r) => r.player_id === id);

  test("batting: runs, balls, whether out", () => {
    expect(by(11)).toMatchObject({ team_id: 1, batted: 1, runs: 30, balls: 20, not_out: 0 });
    expect(by(12)).toMatchObject({ runs: 12, not_out: 1 });
    expect(by(13)).toMatchObject({ runs: 0, balls: 3, not_out: 0 }); // a duck
  });

  test("bowling is credited to the fielding side, even though the same player also batted", () => {
    expect(by(11)).toMatchObject({ bowled_balls: 12, runs_conceded: 18, wickets: 2, maidens: 1 });
    expect(by(21)).toMatchObject({ team_id: 2, bowled_balls: 12, wickets: 0, batted: 1, runs: 5 });
  });

  test("a player who bowled for one team is on that team, not the batting one", () => {
    // player 11 batted for team 1 and bowled in innings 2 where team 1 fielded: still team 1
    expect(by(11).team_id).toBe(1);
  });

  test("fielding: catches (including caught and bowled), stumpings, run outs; a bowled wicket gives none", () => {
    expect(by(12).catches).toBe(1);
    expect(by(11).catches).toBe(1);
    expect(by(14).stumpings).toBe(1);
    expect(by(13).run_outs).toBe(1);
    expect(rows.reduce((n, r) => n + r.catches + r.stumpings + r.run_outs, 0)).toBe(4);
  });

  test("the squad adds a row for a player who did nothing, and marks the keeper; reserves are not in the XI", () => {
    expect(by(14)).toMatchObject({ in_xi: 1, is_keeper: 1, batted: 0 });
    expect(by(15)).toMatchObject({ in_xi: 0, batted: 0 });
  });

  test("player of the match comes from the winning side, whoever did most", () => {
    const best = stats.suggestPlayerOfMatch(rows, 1);
    expect(best.player_id).toBe(11); // 30 runs + 2 wickets + a catch, in the winning team
    const other = stats.suggestPlayerOfMatch(rows, 2);
    expect(other.team_id).toBe(2);
  });

  test("with nothing to choose from, nobody is suggested", () => {
    expect(stats.suggestPlayerOfMatch([], 1)).toBeNull();
    expect(stats.suggestPlayerOfMatch([by(15)], 1)).toBeNull(); // a reserve who did not play
  });
});

/* -------------------------------- leaderboards -------------------------------- */

describe("leaderboards", () => {
  const base = { matches: 3, innings: 3, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, highest: 0, fifties: 0, hundreds: 0, ducks: 0, bowledBalls: 0, runsConceded: 0, wickets: 0, maidens: 0, bestWickets: 0, catches: 0, stumpings: 0, runOuts: 0, keeperMatches: 0, keeperDismissals: 0 };
  const p = (name, extra) => ranking.withDerived({ playerId: name.charCodeAt(0), name, ...base, ...extra });

  const squad = [
    p("Asha", { runs: 120, balls: 80, notOuts: 1 }),
    p("Bela", { runs: 120, balls: 60, notOuts: 0 }),
    p("Chet", { wickets: 6, bowledBalls: 36, runsConceded: 30 }),
    p("Dev", { wickets: 6, bowledBalls: 36, runsConceded: 24 }),
    p("Esha", { runs: 90, balls: 70, wickets: 4, bowledBalls: 30, runsConceded: 40 }),
    p("Farid", { runs: 20, balls: 25, keeperMatches: 3, keeperDismissals: 7 }),
    p("Gita", { keeperMatches: 3, keeperDismissals: 7, runs: 60, balls: 50 }),
  ];

  test("batters: more runs first, then the better average", () => {
    const out = ranking.rankPlayers(squad, "batting");
    // equal runs: Asha averages 120 (not out once), Bela 40 (out three times) -> Asha first
    expect(out[0].name).toBe("Asha");
    expect(out[1].name).toBe("Bela");
    expect(out.map((x) => x.rank)).toEqual(out.map((_, i) => i + 1));
  });

  test("bowlers: more wickets first, then the lower economy; players with no wicket are left out", () => {
    const out = ranking.rankPlayers(squad, "bowling");
    expect(out.map((x) => x.name)).toEqual(["Dev", "Chet", "Esha"]);
    expect(out[0].economy).toBe(4);
  });

  test("all-rounders must have both runs and wickets", () => {
    expect(ranking.rankPlayers(squad, "allrounder").map((x) => x.name)).toEqual(["Esha"]);
  });

  test("keepers: most dismissals while keeping, then runs", () => {
    expect(ranking.rankPlayers(squad, "keeper").map((x) => x.name)).toEqual(["Gita", "Farid"]);
  });

  test("an unknown category is empty, not an error", () => {
    expect(ranking.rankPlayers(squad, "nonsense")).toEqual([]);
  });

  test("average is blank for a batter never out, strike rate and economy are rounded", () => {
    const neverOut = p("Hari", { runs: 40, balls: 30, notOuts: 3 });
    expect(neverOut.average).toBeNull();
    expect(neverOut.strikeRate).toBe(133.33);
    expect(p("Ila", { bowledBalls: 7, runsConceded: 10 }).economy).toBe(8.57);
    expect(p("Ila", { bowledBalls: 7 }).overs).toBe("1.1");
  });

  test("a role is worked out from what the player does", () => {
    expect(ranking.roleOf(squad[5])).toBe("Wicket-keeper");
    expect(ranking.roleOf(squad[4])).toBe("All-rounder");
    expect(ranking.roleOf(squad[2])).toBe("Bowler");
    expect(ranking.roleOf(squad[0])).toBe("Batter");
    expect(ranking.roleOf(p("Nobody", {}))).toBe("Player");
  });
});

/* ------------------------------- result text ------------------------------- */

describe("result text", () => {
  const done = { status: "completed" };
  const names = { 1: "Home XI", 2: "Away XI" };

  test("by runs and by wickets, singular and plural", () => {
    expect(resultText({ ...done, winner_team_id: 1, victory_margin_type: "runs", victory_margin: 12 }, names)).toBe("Home XI won by 12 runs");
    expect(resultText({ ...done, winner_team_id: 2, victory_margin_type: "wickets", victory_margin: 1 }, names)).toBe("Away XI won by 1 wicket");
    expect(resultText({ ...done, winner_team_id: 2, victory_margin_type: "runs", victory_margin: 1 }, names)).toBe("Away XI won by 1 run");
  });

  test("a tie, an unfinished match and a missing margin", () => {
    expect(resultText({ ...done, winner_team_id: null }, names)).toBe("Match tied");
    expect(resultText({ status: "live", winner_team_id: null }, names)).toBeNull();
    expect(resultText({ ...done, winner_team_id: 1 }, names)).toBe("Home XI won");
  });

  test("stage names", () => {
    expect(stageLabel("group", "B", 2)).toBe("Group B · Round 2");
    expect(stageLabel("final")).toBe("Final");
    expect(stageLabel("third_place")).toBe("Third-place match");
  });
});

/* ------------------------------ bans (status) ------------------------------ */

describe("ban status", () => {
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  test("active, upcoming, expired, revoked", () => {
    expect(bans._statusOf({ starts_on: day(-2), ends_on: day(3), revoked_at: null })).toBe("active");
    expect(bans._statusOf({ starts_on: day(-2), ends_on: null, revoked_at: null })).toBe("active");
    expect(bans._statusOf({ starts_on: day(2), ends_on: day(9), revoked_at: null })).toBe("upcoming");
    expect(bans._statusOf({ starts_on: day(-9), ends_on: day(-2), revoked_at: null })).toBe("expired");
    expect(bans._statusOf({ starts_on: day(-9), ends_on: null, revoked_at: "2026-01-01" })).toBe("revoked");
  });
});

/* ---------------------------- bans at the toss ---------------------------- */

describe("the toss and bans", () => {
  const HOME = Array.from({ length: 12 }, (_, i) => ({ id: 101 + i, name: `Home ${i + 1}`, mobile: `98000000${String(i).padStart(2, "0")}` }));
  const AWAY = Array.from({ length: 12 }, (_, i) => ({ id: 201 + i, name: `Away ${i + 1}`, mobile: `97000000${String(i).padStart(2, "0")}` }));
  const ids = (from, n) => Array.from({ length: n }, (_, i) => from + i);
  const call = async (handler, { params = {}, body = {} } = {}) => {
    let status = 200;
    let json;
    const res = { status: (c) => ((status = c), res), json: (b) => ((json = b), res) };
    await handler({ params, body, app: { get: () => ({ to: () => ({ emit: () => {} }) }) }, headers: {} }, res);
    return { status, json };
  };
  const toss = () => call(matchController.setToss, { params: { matchId: "7" }, body: { tossWinnerId: 1, tossDecision: "bat" } });
  let db;

  beforeEach(async () => {
    db = global.__db = new FakeMatchDb({ teams: [{ id: 1, name: "Home XI", players: HOME }, { id: 2, name: "Away XI", players: AWAY }], totalOvers: 2 });
    db.fixture.overs = 2;
    jest.spyOn(console, "error").mockImplementation(() => {});
    await squads.saveTournamentSquad(1, 1, { playing: ids(101, 11), reserves: [] });
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [] });
  });
  afterEach(() => jest.restoreAllMocks());

  test("with no ban the toss goes ahead", async () => {
    expect((await toss()).status).toBe(200);
  });

  test("a banned team cannot play: the toss is refused and nothing is created", async () => {
    db.teamBans = [2];
    const r = await toss();
    expect(r.status).toBe(403);
    expect(r.json.message).toMatch(/Away XI is banned .* cannot play this match/);
    expect(db.matchSquads).toHaveLength(0);
  });

  test("a player banned after the squad was picked stops the toss until the squad is changed", async () => {
    db.bannedPlayers = [103];
    const r = await toss();
    expect(r.status).toBe(409);
    expect(r.json.message).toMatch(/Player 103 is banned and cannot play/);
    expect(db.matchSquads).toHaveLength(0); // the squads were not frozen
  });
});

/* ----------------------- steps after a match never block ----------------------- */

describe("steps after a match", () => {
  test("a failing step (for example the migration is missing) does not stop the others or throw", async () => {
    const seen = [];
    const conn = {
      query: async (sql) => {
        seen.push(sql.slice(0, 40));
        throw new Error("Table 'x' doesn't exist");
      },
      execute: async () => {
        throw new Error("Table 'x' doesn't exist");
      },
    };
    await expect(hooks.onMatchCompleted(conn, 5)).resolves.toBeUndefined();
    await expect(hooks.onMatchReopened(conn, 5)).resolves.toBeUndefined();
    // every step was still tried
    expect(seen.length).toBeGreaterThanOrEqual(6);
  });
});

/* ------------------------------- overlay desk ------------------------------- */

describe("the overlay desk", () => {
  test("only known scenes are accepted", () => {
    expect(overlay.SCENES).toEqual(expect.arrayContaining(["none", "squads", "openers", "bowler", "scorecard", "potm", "message"]));
  });

  describe("choosing a scene", () => {
    let saved;
    beforeEach(() => {
      saved = null;
      global.__db = {
        execute: async (sql, p) => {
          if (/FROM matches WHERE match_id/.test(sql)) return [[{ match_id: 1, tournament_id: 1, team1_id: 1, team2_id: 2, status: "live" }]];
          if (/INSERT INTO match_overlay/.test(sql)) {
            saved = { scene: p[1], payload: p[2], auto_hide: p[3], shown_at: new Date(), updated_at: new Date() };
            return [{ affectedRows: 1 }];
          }
          if (/FROM match_overlay/.test(sql)) return [[saved || undefined]];
          throw new Error("unexpected SQL " + sql.slice(0, 60));
        },
      };
    });
    const refused = (input, pattern) => expect(overlay.setState(1, input)).rejects.toMatchObject({ status: 400, message: expect.stringMatching(pattern) });

    test("an unknown scene is refused", async () => {
      await refused({ scene: "fireworks" }, /Unknown scene/);
      expect(saved).toBeNull();
    });

    test("a message needs text, and the hide time must be 2 to 120 seconds", async () => {
      await refused({ scene: "message", payload: { text: "   " } }, /Type the message/);
      await refused({ scene: "toss", autoHide: 1 }, /2 to 120/);
      await refused({ scene: "toss", autoHide: 500 }, /2 to 120/);
      await refused({ scene: "toss", autoHide: "abc" }, /2 to 120/);
      expect(saved).toBeNull();
    });

    test("options are cleaned: only what the scene uses is kept", async () => {
      const state = await overlay.setState(1, { scene: "scorecard", payload: { innings: 7, text: "ignored", teamId: 9 }, autoHide: "15" });
      expect(state).toMatchObject({ scene: "scorecard", payload: { innings: 1 }, autoHide: 15 });
      const squadsOf = await overlay.setState(1, { scene: "squads", payload: { teamId: "2" } });
      expect(squadsOf.payload).toEqual({ teamId: 2 });
      const msg = await overlay.setState(1, { scene: "message", payload: { text: "  Drinks   break ", subtext: "back soon" } });
      expect(msg.payload).toEqual({ text: "Drinks break", subtext: "back soon" });
    });

    test("hiding clears the timer", async () => {
      const state = await overlay.setState(1, { scene: "none", autoHide: 30 });
      expect(state).toMatchObject({ scene: "none", autoHide: null });
    });
  });
});
