// Random whole matches pushed through the real scoring services, checked ball by ball against an
// independent model of the Laws (tests/helpers/matchOracle.js), plus: undo must give back the exact
// earlier state, and illegal input must be refused without changing anything.
//
//   FUZZ_SEEDS=2000 npx jest tests/scoring.fuzz.test.js     (default 150 matches)

jest.mock("../dbconfigure", () => ({ execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../utils/db-transaction", () => ({ withTransaction: (cb) => cb(global.__fakeDb.conn) }));

const { FakeScoringDb } = require("./helpers/fakeScoringDb");
const { InningsOracle } = require("./helpers/matchOracle");
const ball = require("../services/ballEventService");
const liveMatch = require("../services/liveMatchService");

const SEEDS = Number(process.env.FUZZ_SEEDS || 150);

/* ------------------------------ helpers ------------------------------ */

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

const clone = (o) => JSON.parse(JSON.stringify(o));

// The whole database as plain data. Empty open overs are ignored: the engine may keep one around.
function state(db) {
  const s = clone({ matches: db.matches, innings: db.innings, live: db.live, overs: db.overs, balls: db.balls, perf: db.perf, stats: db.stats, tm: db.tm });
  s.overs = s.overs.filter((o) => o.is_complete || s.balls.some((b) => b.over_id === o.over_id));
  // a row with only zeros is an empty figures row, which is the same as no row
  const zero = (r) => Object.values(r).every((v) => v === 0);
  for (const t of ["perf", "stats"]) for (const k of Object.keys(s[t])) if (zero(s[t][k])) delete s[t][k];
  return s;
}

// innings 1 is batted by team 1 and bowled by team 2; innings 2 the other way round, with different players
const SIDES = {
  1: { team: 1, batters: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111], bowlers: [201, 202, 203, 204, 205] },
  2: { team: 2, batters: [401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411], bowlers: [501, 502, 503, 504, 505] },
};
const FIELDER = 301;

/* ------------------------------ event generator ------------------------------ */

function nextEvent(rng, o) {
  const r = rng();
  let e;
  if (r < 0.06) e = { kind: "wide", bat: 0, extras: 1 + pick(rng, [0, 0, 0, 1, 1, 2, 4]) };
  else if (r < 0.11) e = { kind: "no-ball", bat: pick(rng, [0, 0, 1, 1, 2, 4, 6]), extras: pick(rng, [0, 1]) };
  else if (r < 0.15) e = { kind: "bye", bat: 0, extras: pick(rng, [1, 1, 2, 4]) };
  else if (r < 0.19) e = { kind: "leg-bye", bat: 0, extras: pick(rng, [1, 1, 2]) };
  else e = { kind: "normal", bat: pick(rng, [0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 4, 6]), extras: 0 };

  // sometimes a dismissal that the Laws allow for this delivery
  if (rng() < 0.09) {
    const pool = ["bowled", "caught", "lbw", "stumped", "hit wicket", "run out", "obstructing the field"].filter((t) => !o.checkWicket(e.kind, t));
    if (pool.length) {
      const type = pick(rng, pool);
      if (type === "run out") {
        e.wicket = { type, dismissed: rng() < 0.5 ? o.striker : o.nonStriker };
        if (e.kind === "normal" || e.kind === "no-ball") e.bat = pick(rng, [0, 1, 2]);
        if (e.kind === "bye" || e.kind === "leg-bye") e.extras = pick(rng, [1, 2]);
        if (e.kind === "wide") e.extras = 1 + pick(rng, [0, 1]);
      } else if (type === "obstructing the field") {
        e.wicket = { type, dismissed: rng() < 0.5 ? o.striker : o.nonStriker };
        if (e.kind === "normal" || e.kind === "no-ball") e.bat = 0;
      } else {
        // out on a dead ball: no runs off the bat, and a wide only keeps its one-run penalty
        e.wicket = { type, dismissed: o.striker };
        e.bat = 0;
        if (e.kind === "wide") e.extras = 1;
      }
    }
  }
  return e;
}

function toInput(e, o, inningId, sendOptionalDefaults) {
  const input = {
    inningId,
    matchId: 100,
    batsmanId: o.striker,
    bowlerId: o.bowler,
    runsScored: e.bat,
    extraType: e.kind === "normal" ? null : e.kind,
    extras: e.kind === "normal" ? 0 : e.extras,
  };
  if (e.wicket) {
    input.isWicket = 1;
    input.wicketType = e.wicket.type;
    input.dismissedPlayerId = e.wicket.dismissed;
    if (e.wicket.type === "run out") input.fielderId = FIELDER;
    else if (sendOptionalDefaults && ["bowled", "caught", "lbw", "stumped", "hit wicket"].includes(e.wicket.type)) input.dismissedPlayerId = undefined; // the engine should default to the striker
  }
  return input;
}

/* ------------------------------ comparison ------------------------------ */

function diffs(db, o, inningId, { done }) {
  const out = [];
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) out.push(`${name}: engine ${JSON.stringify(got)} / laws ${JSON.stringify(want)}`);
  };
  const live = db.live[inningId];
  const inn = db.innings[inningId];
  eq("score", live.current_score, o.score);
  eq("wickets", live.current_wickets, o.wickets);
  eq("legal balls in over", live.legal_balls_in_over, o.legalBalls % 6);
  eq("completed overs", Math.floor(parseFloat(live.legal_over_count)), Math.floor(o.legalBalls / 6));
  eq("current overs", live.current_overs, o.overs);
  eq("striker", live.on_strike_batsman_id, o.striker);
  eq("non-striker", live.non_striker_batsman_id, o.nonStriker);
  eq("partnership", live.partnership_runs, o.partnership);
  eq("bowler slot", live.bowler_id, o.bowler);
  eq("innings runs", inn.total_runs, o.score);
  eq("innings wickets", inn.wickets, o.wickets);
  eq("balls bowled", inn.balls_bowled, o.legalBalls);
  eq("innings overs", inn.overs, o.overs);
  eq("innings extras", inn.extras, o.extrasTotal);
  eq("innings status", inn.status === "completed", done);
  eq("last wicket player", live.last_wicket_player_id, o.lastWicket ? o.lastWicket.id : null);
  if (o.lastWicket) eq("last wicket type", live.last_wicket_description, o.lastWicket.type);

  for (const [id, b] of Object.entries(o.bat)) {
    const p = db.perf[`${id}:100`];
    if (!p) {
      if (b.runs || b.balls) out.push(`no figures for batter ${id}`);
      continue;
    }
    eq(`batter ${id} runs/balls/4s/6s`, [p.runs, p.balls, p.fours, p.sixes], [b.runs, b.balls, b.fours, b.sixes]);
  }
  for (const [id, w] of Object.entries(o.bowl)) {
    const p = db.perf[`${id}:100`];
    if (!p) {
      out.push(`no figures for bowler ${id}`);
      continue;
    }
    eq(`bowler ${id} overs`, p.overs, Number(`${Math.floor(w.legal / 6)}.${w.legal % 6}`));
    eq(`bowler ${id} conceded/wickets/maidens`, [p.conceded, p.wkts, p.maidens], [w.conceded, w.wkts, w.maidens]);
  }
  // career ducks: one per batter who was bowled/caught/... for 0 (a retirement is not a dismissal for a duck)
  const ducks = {};
  o.outs.forEach((x) => {
    if (x.runs === 0 && !x.retired) ducks[x.id] = (ducks[x.id] || 0) + 1;
  });
  for (const id of Object.keys(o.bat)) {
    const s = db.stats[id];
    eq(`ducks ${id}`, s ? s.ducks : 0, ducks[id] || 0);
  }
  return out;
}

/* ------------------------------ one innings ------------------------------ */

async function playInnings(db, rng, ctx) {
  const { inningId, maxOvers, target, seed, squad } = ctx;
  const { batters: BATTERS, bowlers: BOWLERS, team } = SIDES[inningId];
  const quota = Math.ceil(maxOvers / 5);
  const maxWickets = squad >= 2 && squad <= 11 ? squad - 1 : 10;
  db.squad[team] = squad;
  const lineUp = squad >= 2 && squad <= 11 ? BATTERS.slice(0, squad) : BATTERS;

  const o = new InningsOracle({ maxOvers, maxWickets, striker: BATTERS[0], nonStriker: BATTERS[1], bowler: BOWLERS[0], target });
  db.setInitialPlayers(inningId, BATTERS[0], BATTERS[1], BOWLERS[0]);
  let nextBatter = 2;
  let retiredHurt = []; // batters who may come back
  let step = 0;
  const log = [];
  const fail = (what, extra) => {
    throw new Error(`seed ${seed} innings ${inningId} step ${step} (squad ${squad}): ${what}\n${extra || ""}\nlast events: ${JSON.stringify(log.slice(-6))}`);
  };

  const chooseBowler = (oracle) => {
    const ok = BOWLERS.filter((b) => b !== oracle.lastBowler && (oracle.bowl[b] ? oracle.bowl[b].legal : 0) < quota * 6);
    return pick(rng, ok);
  };

  // who can come in: a fresh batter, or a retired-hurt one (not the one who just left)
  const incomingCandidates = (justLeft) => [
    ...(nextBatter < lineUp.length ? [{ id: lineUp[nextBatter], fresh: true }] : []),
    ...retiredHurt.filter((id) => id !== justLeft).map((id) => ({ id, fresh: false })),
  ];

  while (!o.over) {
    step += 1;

    // sometimes a batter retires before the next ball
    let retire = null;
    if (rng() < 0.02 && o.striker && o.nonStriker) {
      const who = rng() < 0.5 ? o.striker : o.nonStriker;
      const out = rng() < 0.3;
      if (incomingCandidates(who).length) retire = { who, out };
    }

    const e = retire ? null : nextEvent(rng, o);
    const input = retire ? null : toInput(e, o, inningId, rng() < 0.5);
    if (!retire && rng() < 0.4) input.lastBallId = await require("../models/ballModel").getLastBallId(db.conn, inningId);
    log.push(retire ? { retire, over: o.overs } : { e, over: o.overs });

    const before = state(db);
    const oracleBefore = clone(o);
    const lineUpBefore = { nextBatter, retiredHurt: [...retiredHurt] };
    const survivorBefore = retire ? (retire.who === o.striker ? o.nonStriker : o.striker) : o.striker === (e.wicket && e.wicket.dismissed) ? o.nonStriker : o.striker;
    const willUndo = rng() < 0.08;

    let res;
    try {
      if (retire) {
        await ball.retireBatsman(db.conn, { inningId, matchId: 100, batsmanId: retire.who, retiredOut: retire.out });
        o.retire(retire.who, retire.out);
        if (!retire.out) retiredHurt.push(retire.who);
        res = { wicket: true, overEnded: false };
      } else {
        await ball.registerBallEvent(db.conn, input);
        res = o.apply(e);
      }
    } catch (err) {
      fail(`engine refused a legal ${retire ? "retirement" : "delivery"}: ${err.message}`, JSON.stringify(retire || input));
    }
    const done = o.over;

    const d = diffs(db, o, inningId, { done });
    if (d.length) fail("engine and Laws disagree", d.join("\n"));

    // choose the next batsman / bowler the way a scorer would
    const selectNext = async () => {
      if (res.wicket && !o.over) {
        const left = retire ? retire.who : e.wicket.dismissed;
        const end = db.live[inningId].on_strike_batsman_id ? "nonStriker" : "striker";
        const cands = incomingCandidates(left);
        const c = cands.length > 1 && rng() < 0.4 ? cands.find((x) => !x.fresh) : cands[0];
        await liveMatch.setNewBatsman({ matchId: 100, inningId, newBatsmanId: c.id, end });
        if (c.fresh) nextBatter += 1;
        else retiredHurt = retiredHurt.filter((id) => id !== c.id);
        o.addBatsman(c.id);
      }
      if (res.overEnded && !o.over) {
        const id = chooseBowler(o);
        await liveMatch.setNewBowler({ matchId: 100, inningId, newBowlerId: id });
        o.bowler = id;
      }
    };

    if (willUndo) {
      // undo straight away, or after the next batsman / bowler were chosen
      const afterSelections = rng() < 0.5;
      if (afterSelections) await selectNext();
      let refused = null;
      try {
        await ball.undoLastBallEvent(db.conn, inningId, 100);
      } catch (err) {
        refused = err;
      }
      if (refused) {
        const known = /incoming batsman has already been selected/.test(refused.message);
        if (!(known && afterSelections && res.wicket)) fail(`undo refused: ${refused.message}`);
        // the scorer is told to say who stayed at the crease: that must make the undo work
        try {
          await ball.undoLastBallEvent(db.conn, inningId, 100, { survivorId: survivorBefore });
        } catch (err) {
          fail(`undo refused even with survivorId: ${err.message}`);
        }
      }
      const after = state(db);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        const keys = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
        fail(`undo did not restore the earlier state (${keys.join(", ")})`, keys.map((k) => `${k}\n before ${JSON.stringify(before[k]).slice(0, 600)}\n after  ${JSON.stringify(after[k]).slice(0, 600)}`).join("\n"));
      }
      Object.assign(o, oracleBefore);
      nextBatter = lineUpBefore.nextBatter;
      retiredHurt = lineUpBefore.retiredHurt;
      continue;
    }

    await selectNext();
  }
  return o;
}

/* ------------------------------ whole matches ------------------------------ */

describe("random matches against the Laws of Cricket", () => {
  const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1);

  test.each(seeds)("match %i", async (seed) => {
    const rng = rngFrom(seed * 7919);
    const maxOvers = pick(rng, [1, 2, 3, 4, 5, 6, 8]);
    const db = new FakeScoringDb({ totalOvers: maxOvers });
    global.__fakeDb = db;
    // most sides have 11 players, some play fewer; sometimes nothing is recorded (then 10 wickets)
    const squad1 = pick(rng, [11, 11, 11, 8, 5, 0]);
    const squad2 = pick(rng, [11, 11, 11, 8, 5, 0]);

    const first = await playInnings(db, rng, { inningId: 1, maxOvers, target: null, seed, squad: squad1 });
    expect(db.matches[100].target_score).toBe(first.score + 1);
    expect(db.matches[100].status).toBe("live");

    const second = await playInnings(db, rng, { inningId: 2, maxOvers, target: first.score + 1, seed, squad: squad2 });
    const m = db.matches[100];
    expect(m.status).toBe("completed");
    if (second.winner === "tie") {
      expect(m.winner_team_id).toBeNull();
      expect(m.victory_margin).toBe(0);
    } else if (second.winner === "chasing") {
      expect(m.winner_team_id).toBe(2);
      expect([m.victory_margin_type, m.victory_margin]).toEqual(["wickets", second.maxWickets - second.wickets]);
    } else {
      expect(m.winner_team_id).toBe(1);
      expect([m.victory_margin_type, m.victory_margin]).toEqual(["runs", first.score - second.score]);
    }

    // nothing more can be scored once the match is over
    db.live[2].bowler_id = 501;
    await expect(ball.registerBallEvent(db.conn, { inningId: 2, matchId: 100, runsScored: 1 })).rejects.toThrow();
  });
});

/* ------------------------------ illegal input ------------------------------ */

describe("illegal deliveries are refused and change nothing", () => {
  const bad = (name, input, pattern, setup) =>
    test(name, async () => {
      const db = new FakeScoringDb({ totalOvers: 5 });
      global.__fakeDb = db;
      db.setInitialPlayers(1, 101, 102, 201);
      if (setup) await setup(db);
      const before = JSON.stringify(state(db));
      await expect(ball.registerBallEvent(db.conn, { inningId: 1, matchId: 100, batsmanId: 101, bowlerId: 201, runsScored: 0, ...input })).rejects.toThrow(pattern);
      expect(JSON.stringify(state(db))).toBe(before);
    });

  const noBallFirst = (db) => ball.registerBallEvent(db.conn, { inningId: 1, matchId: 100, batsmanId: 101, bowlerId: 201, runsScored: 0, extraType: "no-ball" });

  bad("runs off the bat on a wide", { extraType: "wide", runsScored: 2 }, /bat/);
  bad("a wicket with no type", { isWicket: 1 }, /wicketType/);
  bad("caught of the non-striker", { isWicket: 1, wicketType: "caught", dismissedPlayerId: 102 }, /Only the striker/);
  bad("bowled off a no-ball", { extraType: "no-ball", isWicket: 1, wicketType: "bowled" }, /off a no-ball/);
  bad("lbw off a wide", { extraType: "wide", isWicket: 1, wicketType: "lbw" }, /off a wide/);
  bad("wrong striker", { batsmanId: 102 }, /Striker mismatch/);
  bad("wrong bowler", { bowlerId: 202 }, /Bowler mismatch/);
  bad("a negative run count", { runsScored: -1 }, /runsScored/);
  bad("nine runs off the bat", { runsScored: 9 }, /runsScored/);
  bad("bye with no runs", { extraType: "bye" }, /extras/);
  bad("an unknown extra type", { extraType: "overthrow" }, /Unknown extra type/);
  bad("an unknown dismissal", { isWicket: 1, wicketType: "exploded" }, /Unsupported wicket type/);
  bad("caught on a free hit", { isWicket: 1, wicketType: "caught" }, /free hit/, noBallFirst);
  bad("runs scored off a ball the batter was caught on", { isWicket: 1, wicketType: "caught", runsScored: 2 }, /No runs can be scored/);
  bad("byes after the batter was bowled", { isWicket: 1, wicketType: "bowled", extraType: "bye", extras: 1 }, /dead/);
  bad("a run-scoring stumping off a wide", { isWicket: 1, wicketType: "stumped", extraType: "wide", extras: 3 }, /one-run wide/);
  bad("a stale scoreboard (double tap)", { lastBallId: 99 }, /scoreboard has changed/);
  bad("a retirement written as a delivery", { isRetiredHurt: 1, runsScored: 2 }, /not a delivery/);
  bad("a retirement used as a dismissal type", { isWicket: 1, wicketType: "retired out" }, /not a delivery/);
});
