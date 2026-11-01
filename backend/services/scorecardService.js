// The full scorecard of a match, built from the ball log: batting card with how each batter was out,
// bowling figures, extras, fall of wickets and who did not bat.

const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const liveScorecardModel = require("../models/liveScorecardModel");
const ballsModel = require("../models/ballModel");
const playerModel = require("../models/playerModel");
const squadModel = require("../models/squadModel");
const teamModel = require("../models/teamModel");
const { ballsToOversString, bowlerRunsCharged } = require("../utils/cricketRules/cricketRules");

const BOWLER_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];
const n = (v) => (v === null || v === undefined ? null : Number(v));
const isDelivery = (b) => Number(b.legal_delivery) === 1 || !!b.extra_type; // a retirement is in the log but is not a delivery
const strikeRate = (runs, balls) => (balls > 0 ? ((runs * 100) / balls).toFixed(2) : "0.00");
const economy = (runs, legal) => (legal > 0 ? ((runs * 6) / legal).toFixed(2) : "0.00");

/** "c Smith b Jones", "lbw b Jones", "run out (Smith)" ... */
function howOut(row, nameOf) {
  const type = String(row.wicket_type || "").toLowerCase();
  const bowler = nameOf(row.bowler_id);
  const fielder = row.fielder_id ? nameOf(row.fielder_id) : null;
  switch (type) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return !fielder || n(row.fielder_id) === n(row.bowler_id) ? `c & b ${bowler}` : `c ${fielder} b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "stumped":
      return `st ${fielder || "wk"} b ${bowler}`;
    case "hit wicket":
      return `hit wicket b ${bowler}`;
    case "run out":
      return fielder ? `run out (${fielder})` : "run out";
    default:
      return type || "out";
  }
}

/**
 * @param balls    rows of the balls table of one innings, in the order bowled
 * @param nameOf   id -> name
 * @param crease   { strikerId, nonStrikerId } at the moment
 * @param squadIds players of the batting side (to list who did not bat)
 */
function buildInningsScorecard({ balls, nameOf, crease = {}, squadIds = [] }) {
  // ---- batting ----
  const order = [];
  const bat = {};
  const touch = (id) => {
    if (id === null || id === undefined) return null;
    if (!bat[id]) {
      bat[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: null, retired: false };
      order.push(id);
    }
    return bat[id];
  };

  const bowl = {};
  const bowlerOrder = [];
  const overs = {}; // over_id -> { bowlers:Set, legal, charge }
  const extras = { wide: 0, "no-ball": 0, bye: 0, "leg-bye": 0 };
  const fall = [];
  let runningScore = 0;
  let runningLegal = 0;
  let wickets = 0;
  let lastOverBowler = null;

  for (const b of balls) {
    touch(n(b.batsman_id));
    if (b.dismissed_player_id) touch(n(b.dismissed_player_id));
    const delivery = isDelivery(b);
    const type = String(b.extra_type || "").toLowerCase() || null;
    const runs = Number(b.runs_scored || 0);
    const ex = Number(b.extras || 0);

    if (delivery) {
      const s = touch(n(b.batsman_id));
      s.runs += runs;
      if (type !== "wide") s.balls += 1;
      if (runs === 4) s.fours += 1;
      if (runs === 6) s.sixes += 1;

      const id = n(b.bowler_id);
      if (!bowl[id]) {
        bowl[id] = { legal: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
        bowlerOrder.push(id);
      }
      const w = bowl[id];
      const nbType = type === "no-ball" ? b.nb_runs_type || null : null;
      const charge = bowlerRunsCharged(runs, ex, type, nbType);
      w.runs += charge;
      if (type === "wide") w.wides += ex;
      if (type === "no-ball") w.noBalls += 1;
      if (Number(b.legal_delivery) === 1) w.legal += 1;
      if (nbType) {
        // a no-ball whose runs were byes / leg-byes: 1 is the no-ball, the rest are those byes
        extras["no-ball"] += 1;
        extras[nbType] += ex - 1;
      } else if (type && extras[type] !== undefined) extras[type] += ex;

      const o = (overs[b.over_id] ||= { bowlers: new Set(), legal: 0, charge: 0 });
      o.bowlers.add(id);
      o.charge += charge;
      if (Number(b.legal_delivery) === 1) o.legal += 1;
      lastOverBowler = id;
    }

    runningScore += runs + ex;
    if (Number(b.legal_delivery) === 1) runningLegal += 1;

    if (Number(b.is_wicket) === 1) {
      wickets += 1;
      const id = n(b.dismissed_player_id);
      const s = touch(id);
      const wicketType = String(b.wicket_type || "").toLowerCase();
      s.out = wicketType === "retired out" ? "retired out" : howOut(b, nameOf);
      if (BOWLER_WICKETS.includes(wicketType) && bowl[n(b.bowler_id)]) bowl[n(b.bowler_id)].wickets += 1;
      fall.push({
        wicketNumber: wickets,
        playerId: id,
        playerName: nameOf(id),
        score: runningScore,
        over: ballsToOversString(runningLegal),
        how: s.out,
      });
    } else if (Number(b.is_retired_hurt) === 1 && b.dismissed_player_id) {
      touch(n(b.dismissed_player_id)).retired = true;
    }
  }

  // maidens: a full over of 6 legal balls by one bowler with nothing charged
  Object.values(overs).forEach((o) => {
    if (o.legal === 6 && o.charge === 0 && o.bowlers.size === 1) bowl[[...o.bowlers][0]].maidens += 1;
  });

  [crease.strikerId, crease.nonStrikerId].forEach((id) => touch(n(id)));

  const batting = order.map((id) => {
    const s = bat[id];
    const atCrease = id === n(crease.strikerId) || id === n(crease.nonStrikerId);
    const status = s.out ? "out" : atCrease ? "not out" : s.retired ? "retired hurt" : "not out";
    return {
      playerId: id,
      name: nameOf(id),
      status,
      howOut: s.out || (status === "retired hurt" ? "retired hurt" : "not out"),
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      strikeRate: strikeRate(s.runs, s.balls),
      onStrike: id === n(crease.strikerId),
    };
  });

  const bowling = bowlerOrder.map((id) => {
    const w = bowl[id];
    return {
      playerId: id,
      name: nameOf(id),
      overs: ballsToOversString(w.legal),
      legalBalls: w.legal,
      maidens: w.maidens,
      runs: w.runs,
      wickets: w.wickets,
      economy: economy(w.runs, w.legal),
      wides: w.wides,
      noBalls: w.noBalls,
    };
  });

  const batted = new Set(order);
  return {
    batting,
    didNotBat: squadIds.filter((id) => !batted.has(Number(id))).map((id) => ({ playerId: Number(id), name: nameOf(Number(id)) })),
    bowling,
    extras: { wides: extras.wide, noBalls: extras["no-ball"], byes: extras.bye, legByes: extras["leg-bye"], total: Object.values(extras).reduce((a, b) => a + b, 0) },
    fallOfWickets: fall,
    lastOverBowlerId: lastOverBowler,
  };
}

/** Load a match and build the scorecard of each innings. */
async function getScorecard(conn, matchId) {
  const match = await matchModel.getMatchDetails(conn, matchId);
  if (!match) throw new Error("Match not found");
  const inningsList = await inningsModel.getInningsByMatch(conn, matchId);
  const liveRows = await liveScorecardModel.getLiveScorecardsByMatch(conn, matchId);
  const liveByInning = Object.fromEntries(liveRows.map((l) => [l.inning_id, l]));

  const ballsByInning = {};
  const ids = new Set();
  for (const inning of inningsList) {
    ballsByInning[inning.inning_id] = await ballsModel.getAllBallsByInnings(conn, inning.inning_id);
    ballsByInning[inning.inning_id].forEach((b) => [b.batsman_id, b.bowler_id, b.dismissed_player_id, b.fielder_id].forEach((x) => x && ids.add(Number(x))));
    const l = liveByInning[inning.inning_id];
    if (l) [l.on_strike_batsman_id, l.non_striker_batsman_id].forEach((x) => x && ids.add(Number(x)));
  }

  const teams = {};
  for (const id of [match.team1_id, match.team2_id]) {
    if (!id) continue;
    const team = await teamModel.getTeamById(conn, id);
    const squad = await squadModel.getPlayingXI(conn, matchId, id);
    squad.forEach((p) => ids.add(Number(p.player_id)));
    teams[id] = { team, squadIds: squad.map((p) => Number(p.player_id)) };
  }

  const players = await playerModel.getPlayersByIds(conn, [...ids]);
  const names = Object.fromEntries(players.map((p) => [Number(p.player_id), p.players_name]));
  const nameOf = (id) => (id === null || id === undefined ? "" : names[Number(id)] || `Player ${id}`);

  return {
    matchId: match.match_id,
    status: match.status,
    innings: inningsList.map((inning) => {
      const live = liveByInning[inning.inning_id] || {};
      const side = teams[inning.team_id] || {};
      const card = buildInningsScorecard({
        balls: ballsByInning[inning.inning_id],
        nameOf,
        crease: { strikerId: live.on_strike_batsman_id, nonStrikerId: live.non_striker_batsman_id },
        squadIds: side.squadIds || [],
      });
      return {
        inningId: inning.inning_id,
        inningsNumber: inning.innings_number,
        teamId: inning.team_id,
        teamName: side.team ? side.team.team_name : `Team ${inning.team_id}`,
        status: inning.status,
        runs: inning.total_runs,
        wickets: inning.wickets,
        overs: ballsToOversString(inning.balls_bowled || 0),
        ...card,
      };
    }),
  };
}

module.exports = { buildInningsScorecard, getScorecard, howOut };
