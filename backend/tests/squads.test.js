// Squads and players: a team admin names 11 playing + up to 4 reserves for a tournament, can change the XI for a
// single match until the toss, and the toss freezes it. Scoring then only accepts players of the frozen XI.
// The REAL services and controllers run; only MySQL is replaced (tests/helpers/fakeMatchDb.js).

jest.mock("../dbconfigure", () => ({
  execute: (...a) => global.__db.execute(...a),
  query: (...a) => global.__db.execute(...a),
  getConnection: () => global.__db.getConnection(),
}));

// the project's node_modules are not needed to run these tests: stand-ins for the two libraries the code uses
jest.mock("bcryptjs", () => ({ hash: async (v) => `hashed:${v}` }), { virtual: true });
jest.mock(
  "jsonwebtoken",
  () => ({
    sign: (payload) => Buffer.from(JSON.stringify(payload)).toString("base64"),
    verify: (token) => {
      try {
        return JSON.parse(Buffer.from(token, "base64").toString());
      } catch {
        throw new Error("invalid token");
      }
    },
  }),
  { virtual: true }
);

const { FakeMatchDb } = require("./helpers/fakeMatchDb");
const squads = require("../services/squadService");
const players = require("../services/playerService");
const matchController = require("../controllers/matchController");
const liveMatch = require("../controllers/liveMatchController");

const HOME = Array.from({ length: 16 }, (_, i) => ({ id: 101 + i, name: `Home ${i + 1}`, mobile: `98000000${String(i).padStart(2, "0")}` }));
const AWAY = Array.from({ length: 12 }, (_, i) => ({ id: 201 + i, name: `Away ${i + 1}`, mobile: `97000000${String(i).padStart(2, "0")}` }));
const ids = (from, n) => Array.from({ length: n }, (_, i) => from + i);

const call = async (handler, { params = {}, body = {} } = {}) => {
  let status = 200;
  let json;
  const res = { status: (c) => ((status = c), res), json: (b) => ((json = b), res) };
  await handler({ params, body, app: { get: () => ({ to: () => ({ emit: () => {} }) }) }, headers: {} }, res);
  return { status, json };
};

let db;
beforeEach(() => {
  db = global.__db = new FakeMatchDb({ teams: [{ id: 1, name: "Home XI", players: HOME }, { id: 2, name: "Away XI", players: AWAY }], totalOvers: 2 });
  db.fixture.overs = 2;
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const full = (extra = {}) => ({ playing: ids(101, 11), reserves: ids(112, 4), ...extra });
const refused = (promise, status, pattern) => expect(promise).rejects.toMatchObject({ status, message: expect.stringMatching(pattern) });

describe("the squad rules", () => {
  test("11 playing and 4 reserves is a full squad", async () => {
    const out = await squads.saveTournamentSquad(1, 1, full({ captainId: 101, keeperId: 102, jerseys: { 101: 7, 102: 1, 112: 99 } }));
    expect(out.submitted).toBe(true);
    expect(out.squad.playing).toHaveLength(11);
    expect(out.squad.reserves).toHaveLength(4);
    expect(out.squad.playing[0]).toMatchObject({ playerId: 101, jersey: 7, isCaptain: true });
    expect(out.squad.playing[1]).toMatchObject({ playerId: 102, isKeeper: true });
    expect(out.limits).toEqual({ playingMax: 11, playingMin: 2, reservesMax: 4 });
  });

  test("the batting order is the order the XI was sent in", async () => {
    const out = await squads.saveTournamentSquad(1, 1, { playing: [105, 101, 103], reserves: [] });
    expect(out.squad.playing.map((p) => p.playerId)).toEqual([105, 101, 103]);
  });

  test("12 in the XI, 5 reserves, or fewer than 2 players are refused", async () => {
    await refused(squads.saveTournamentSquad(1, 1, { playing: ids(101, 12) }), 400, /at most 11/);
    await refused(squads.saveTournamentSquad(1, 1, { playing: ids(101, 11), reserves: ids(112, 5) }), 400, /at most 4 reserves/);
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101] }), 400, /at least 2/);
  });

  test("a player cannot be both playing and a reserve, or listed twice", async () => {
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101, 102], reserves: [102] }), 400, /only be in the squad once/);
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101, 101] }), 400, /only be in the squad once/);
  });

  test("a player of another team (or one that does not exist) is refused", async () => {
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101, 201] }), 400, /does not belong to your team/);
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101, 99999] }), 400, /does not belong to your team/);
  });

  test("a banned player cannot be picked", async () => {
    db.players[103].is_banned = 1;
    await refused(squads.saveTournamentSquad(1, 1, { playing: [101, 103] }), 400, /Home 3 is banned/);
  });

  test("captain and keeper must be in the playing XI, jerseys must differ", async () => {
    await refused(squads.saveTournamentSquad(1, 1, full({ captainId: 112 })), 400, /captain must be in the playing XI/);
    await refused(squads.saveTournamentSquad(1, 1, full({ keeperId: 113 })), 400, /keeper must be in the playing XI/);
    await refused(squads.saveTournamentSquad(1, 1, full({ jerseys: { 101: 7, 102: 7 } })), 400, /same jersey/);
    await refused(squads.saveTournamentSquad(1, 1, full({ jerseys: { 101: 1000 } })), 400, /between 0 and 999/);
  });

  test("a refused save leaves the earlier squad untouched", async () => {
    await squads.saveTournamentSquad(1, 1, { playing: [101, 102], reserves: [] });
    await refused(squads.saveTournamentSquad(1, 1, { playing: ids(101, 12) }), 400, /at most 11/);
    expect((await squads.getTournamentSquad(1, 1)).squad.playing.map((p) => p.playerId)).toEqual([101, 102]);
  });

  test("saving again replaces the squad", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    const out = await squads.saveTournamentSquad(1, 1, { playing: [101, 102], reserves: [103] });
    expect(out.squad.playing).toHaveLength(2);
    expect(out.squad.reserves.map((p) => p.playerId)).toEqual([103]);
  });

  test("a team that is not in the tournament cannot name a squad", async () => {
    await refused(squads.saveTournamentSquad(1, 3, { playing: [101, 102] }), 403, /not registered/);
    await refused(squads.getTournamentSquad(9, 1), 404, /not found/);
  });

  test("one team's squad never shows up for another", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    expect((await squads.getTournamentSquad(1, 2)).submitted).toBe(false);
  });
});

describe("a squad for one match", () => {
  test("starts as the tournament squad, a change is the match's own, and reset goes back", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    let m = await squads.getMatchSquad(7, 1);
    expect(m.source).toBe("tournament");
    expect(m.squad.playing).toHaveLength(11);

    m = await squads.saveMatchSquad(7, 1, { playing: [102, 101, 103, 104, 105], reserves: [106] });
    expect(m.source).toBe("match");
    expect(m.squad.playing.map((p) => p.playerId)).toEqual([102, 101, 103, 104, 105]);
    expect((await squads.getTournamentSquad(1, 1)).squad.playing).toHaveLength(11); // the tournament squad is untouched

    m = await squads.resetMatchSquad(7, 1);
    expect(m.source).toBe("tournament");
    expect(m.squad.playing).toHaveLength(11);
  });

  test("with no squad at all the source says so", async () => {
    expect((await squads.getMatchSquad(7, 1)).source).toBe("none");
  });

  test("the same rules apply for a match", async () => {
    await refused(squads.saveMatchSquad(7, 1, { playing: ids(101, 12) }), 400, /at most 11/);
    await refused(squads.saveMatchSquad(7, 1, { playing: [101, 201] }), 400, /does not belong to your team/);
  });

  test("a team can only touch its own fixtures", async () => {
    await refused(squads.getMatchSquad(7, 3), 403, /not playing in this match/);
    await refused(squads.saveMatchSquad(7, 3, { playing: [101, 102] }), 403, /not playing in this match/);
    await refused(squads.getMatchSquad(999, 1), 404, /not found/);
  });

  test("each team of the same fixture has its own", async () => {
    await squads.saveMatchSquad(7, 1, { playing: [101, 102], reserves: [] });
    await squads.saveMatchSquad(7, 2, { playing: [201, 202, 203], reserves: [] });
    expect((await squads.getMatchSquad(7, 1)).squad.playing).toHaveLength(2);
    expect((await squads.getMatchSquad(7, 2)).squad.playing).toHaveLength(3);
  });

  test("lists show the team's tournaments and fixtures with where the squad comes from", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    await squads.saveMatchSquad(7, 1, { playing: [101, 102], reserves: [] });
    const t = await squads.listMyTournaments(1);
    expect(t).toEqual([expect.objectContaining({ id: 1, name: "Diwali Cup", squadSubmitted: true, playingCount: 11 })]);
    const m = await squads.listMyMatches(1, 1);
    expect(m).toEqual([expect.objectContaining({ id: 7, opponent: "Away XI", squadSource: "match", locked: null })]);
    expect((await squads.listMyMatches(1, 2))[0]).toMatchObject({ opponent: "Home XI", squadSource: "none" });
  });
});

describe("the toss freezes the squads", () => {
  const toss = (decision = "bat", winner = 1) => call(matchController.setToss, { params: { matchId: "7" }, body: { tossWinnerId: winner, tossDecision: decision } });
  const frozen = (team) => db.matchSquads.filter((r) => r.tournament_match_id === 7 && r.team_id === team);

  test("both squads are copied into the match, the match's own change winning over the tournament squad", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [212] });
    await squads.saveMatchSquad(7, 2, { playing: ids(201, 6), reserves: [] });
    expect((await toss()).status).toBe(200);
    expect(frozen(1).filter((r) => r.role === "playing")).toHaveLength(11);
    expect(frozen(1).filter((r) => r.role === "reserve")).toHaveLength(4);
    expect(frozen(2).filter((r) => r.role === "playing")).toHaveLength(6);
    expect(frozen(2).filter((r) => r.role === "reserve")).toHaveLength(0);
  });

  test("after the toss the squads are locked", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [] });
    await toss();
    await refused(squads.saveMatchSquad(7, 1, { playing: [101, 102], reserves: [] }), 409, /toss is done/);
    await refused(squads.resetMatchSquad(7, 1), 409, /toss is done/);
    expect((await squads.getMatchSquad(7, 1)).locked).toMatch(/toss is done/);
    expect(frozen(1).filter((r) => r.role === "playing")).toHaveLength(11);
  });

  test("a team with no players to field stops the toss and nothing is created", async () => {
    db.legacyXI = { 1: [], 2: ids(201, 11) }; // no squad named and no old playing XI for team 1
    const r = await toss();
    expect(r.status).toBe(409);
    expect(r.json.message || r.json.error).toMatch(/Home XI has not named its playing XI/);
    expect(db.matchSquads).toHaveLength(0);
    expect(Object.keys(db.matches)).toHaveLength(0);
    expect(db.tm[0].match_id).toBeNull();
  });

  test("a match from before squads existed falls back to the old playing XI", async () => {
    const r = await toss();
    expect(r.status).toBe(200);
    expect(frozen(1).filter((r) => r.role === "playing")).toHaveLength(16);
  });

  test("a squad of 6 means 5 wickets end the innings", async () => {
    await squads.saveTournamentSquad(1, 1, { playing: ids(101, 6), reserves: [107] });
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [] });
    await toss("bat", 1);
    const squadModel = require("../models/squadModel");
    expect(await squadModel.getMaxWickets(db, 1, 101)).toBe(5);
    expect(await squadModel.getMaxWickets(db, 2, 101)).toBe(10);
  });

  test("scoring accepts the playing XI and refuses a reserve", async () => {
    await squads.saveTournamentSquad(1, 1, { playing: ids(101, 11), reserves: [112] });
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [212] });
    await toss("bat", 1); // home bat: innings 11
    const open = (s, n, b) => call(liveMatch.setInitialPlayers, { body: { matchId: 101, inningId: 11, strikerId: s, nonStrikerId: n, bowlerId: b } });
    expect((await open(112, 102, 201)).status).toBe(400); // home reserve cannot bat
    expect((await open(101, 102, 212)).status).toBe(400); // away reserve cannot bowl
    expect((await open(101, 102, 201)).status).toBe(200);
  });

  test("the match screen shows the XI and the reserves of each side", async () => {
    await squads.saveTournamentSquad(1, 1, full());
    await squads.saveTournamentSquad(1, 2, { playing: ids(201, 11), reserves: [] });
    const { json } = await call(liveMatch.getMatchDetails, { params: { matchId: "7" } });
    expect(json.team1.squad).toHaveLength(11);
    expect(json.team1.reserves).toHaveLength(4);
    expect(json.team1.squadSource).toBe("tournament");
    expect(json.team2.reserves).toHaveLength(0);
  });
});

describe("a team's players", () => {
  test("add: the name and a 10 digit mobile are needed, +91 and spaces are tidied", async () => {
    const p = await players.createPlayer(1, { name: "  Ravi   Kumar ", mobile: "+91 98765 43210", email: "Ravi@Example.com" }, "uploads/r.jpg");
    expect(p).toMatchObject({ name: "Ravi Kumar", mobile: "9876543210", email: "ravi@example.com", photo: "uploads/r.jpg" });
    expect(db.players[p.id].team_id).toBe(1);
  });

  test("bad details are refused", async () => {
    await refused(players.createPlayer(1, { name: "R", mobile: "9876543210" }), 400, /name/);
    await refused(players.createPlayer(1, { name: "Ravi", mobile: "12345" }), 400, /10-digit/);
    await refused(players.createPlayer(1, { name: "Ravi", mobile: "9876543210", email: "nope" }), 400, /email/);
  });

  test("the same mobile twice in one team is refused, in another team it is fine", async () => {
    await players.createPlayer(1, { name: "Ravi", mobile: "9876543210" });
    await refused(players.createPlayer(1, { name: "Ravi Two", mobile: "9876543210" }), 409, /already in your team/);
    await expect(players.createPlayer(2, { name: "Ravi", mobile: "9876543210" })).resolves.toMatchObject({ name: "Ravi" });
  });

  test("the list holds only the team's own players", async () => {
    expect(await players.listPlayers(1)).toHaveLength(16);
    expect(await players.listPlayers(2)).toHaveLength(12);
  });

  test("edit: keeps what is not sent, and a team cannot touch another team's player", async () => {
    const p = await players.updatePlayer(1, 101, { name: "Home One" });
    expect(p).toMatchObject({ name: "Home One", mobile: HOME[0].mobile });
    await refused(players.updatePlayer(1, 201, { name: "Hijack" }), 404, /not found in your team/);
    expect(db.players[201].players_name).toBe("Away 1");
  });

  test("remove: someone who never played goes, and leaves every squad", async () => {
    await squads.saveTournamentSquad(1, 1, { playing: [101, 102], reserves: [103] });
    await players.removePlayer(1, 103);
    expect(db.players[103]).toBeUndefined();
    expect((await squads.getTournamentSquad(1, 1)).squad.reserves).toHaveLength(0);
  });

  test("remove: someone who has played a ball, or sits in a frozen squad, stays", async () => {
    db.balls.push({ ball_id: 1, inning_id: 11, batsman_id: 101, bowler_id: 201, dismissed_player_id: null, fielder_id: null });
    await refused(players.removePlayer(1, 101), 409, /been in a match/);

    db.matchSquads.push({ tournament_match_id: 7, team_id: 1, player_id: 102, role: "reserve" });
    db.tm[0].match_id = 100;
    await refused(players.removePlayer(1, 102), 409, /been in a match/);
    expect(db.players[102]).toBeDefined();
  });

  test("remove: another team's player is not found", async () => {
    await refused(players.removePlayer(1, 201), 404, /not found in your team/);
  });
});

describe("who may use the team admin API", () => {
  const jwt = require("jsonwebtoken");
  const requireTeamAdmin = require("../middlewares/teamAdminAuth");
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  const run = (token) => {
    const req = { header: (h) => (h === "Authorization" && token ? `Bearer ${token}` : undefined) };
    let status = 200;
    let next = false;
    const res = { status: (c) => ((status = c), res), json: () => res };
    requireTeamAdmin(req, res, () => (next = true));
    return { status, next, req };
  };
  const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET);

  test("a team admin gets in, and the team comes from the token", () => {
    const r = run(sign({ id: 5, team_id: 3 }));
    expect(r.next).toBe(true);
    expect(r.req.team).toEqual({ adminId: 5, teamId: 3 });
  });
  test("no token, a bad token, a token with no team, or a player token are refused", () => {
    expect(run(undefined).status).toBe(401);
    expect(run("garbage").status).toBe(401);
    expect(run(sign({ id: 1, role: "master" })).status).toBe(403);
    expect(run(sign({ id: 9, team_id: 3, role: "player" })).status).toBe(403);
  });
});
