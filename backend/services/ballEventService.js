const {
  normalizeExtraType,
  normalizeNoBallRunsType,
  isLegalDelivery,
  calculateTotalRuns,
  shouldRotateStrike,
  getPartnershipRuns,
  normalizeWicketType,
  assertWicketPossible,
  assertDeadBallDismissal,
  assertFreeHitWicket,
  isFreeHit,
  decideOutcome,
  STRIKER_ONLY_WICKETS,
  ballsToOversString,
  splitBalls,
  isOverComplete,
  isInningsOver,
  runRate,
} = require("../utils/cricketRules/cricketRules");
const { ScoringError } = require("../utils/errors");

const playerPerfModel = require("../models/playerPerformanceModel");
const playerStatsModel = require("../models/playerStatsModel");
const ballsModel = require("../models/ballModel");
const squadModel = require("../models/squadModel");
const postMatchHooks = require("./postMatchHooks");
const tieBreak = require("./tieBreakService");
const { advanceBracket } = require("./bracketService");

/* ----------------------------- helpers ----------------------------- */

const num = (v) => (v === null || v === undefined ? null : Number(v));
const same = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);
const flag = (v) => v === true || v === 1 || v === "1" || v === "true";
const given = (v) => v !== null && v !== undefined && v !== "";
const swap = (c) => {
  [c.striker, c.nonStriker] = [c.nonStriker, c.striker];
};

const toId = (v, name) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ScoringError(`${name} must be a valid id`);
  return n;
};

const toCount = (v, name, max) => {
  const n = Number(v === null || v === undefined || v === "" ? 0 : v);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new ScoringError(`${name} must be a whole number between 0 and ${max}`);
  return n;
};

// Old rows may hold values written before types were normalised, so be lenient when reading.
const lenientExtraType = (v) => {
  try {
    return normalizeExtraType(v);
  } catch (e) {
    return null;
  }
};
const lenientWicketType = (v) => {
  try {
    return normalizeWicketType(v);
  } catch (e) {
    return v ? String(v).toLowerCase() : null;
  }
};

const totalLegalBalls = (live) =>
  Math.floor(parseFloat(live.legal_over_count || 0)) * 6 + Number(live.legal_balls_in_over || 0);

const lockLiveScorecard = async (conn, inningId) => {
  const [[live]] = await conn.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id, current_score,
      current_wickets, legal_balls_in_over, legal_over_count, bowler_id, partnership_runs
    FROM live_scorecards WHERE inning_id = ? LIMIT 1 FOR UPDATE`,
    [inningId]
  );
  if (!live) throw new ScoringError("No live scorecard found for inning", 404);
  return live;
};

// Sum of runs charged to the bowler in an over (bat runs + wides + no-balls).
const overRunsConceded = async (conn, overId) => {
  const [[row]] = await conn.execute(
    `SELECT COALESCE(SUM(runs_scored + CASE WHEN extra_type = 'wide' THEN extras WHEN extra_type = 'no-ball' THEN (CASE WHEN nb_runs_type IS NULL THEN extras ELSE 1 END) ELSE 0 END), 0) AS conceded
     FROM balls WHERE over_id = ?`,
    [overId]
  );
  return Number(row.conceded);
};

// The client says which ball it last saw. If the innings has moved on (another scorer, a double tap,
// a request that was sent twice) the new ball is refused instead of being added on top of a newer state.
const assertScoreboardCurrent = async (conn, inningId, expectedLastBallId) => {
  if (!given(expectedLastBallId)) return;
  const current = await ballsModel.getLastBallId(conn, inningId);
  if (Number(expectedLastBallId) !== current) {
    throw new ScoringError("The scoreboard has changed since you loaded it. Refresh and check the last ball before scoring.", 409);
  }
};

// Match, innings and live scorecard of an innings that is being scored, with the checks every scoring action needs.
async function loadScoringContext(conn, inningId, matchId) {
  const live = await lockLiveScorecard(conn, inningId);

  const [[matchRow]] = await conn.execute(
    `SELECT total_overs, team1_id, team2_id, target_score, status FROM matches WHERE match_id = ? LIMIT 1`,
    [matchId]
  );
  if (!matchRow) throw new ScoringError("Match not found", 404);
  if (matchRow.status === "completed") throw new ScoringError("Match is already completed", 409);

  const [[inningsRow]] = await conn.execute(
    `SELECT balls_bowled, total_runs, wickets, status, innings_number, team_id, match_id FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!inningsRow) throw new ScoringError("Innings not found", 404);
  if (Number(inningsRow.match_id) !== matchId) throw new ScoringError("Innings does not belong to this match");
  if (inningsRow.status === "completed") throw new ScoringError("Innings is already completed", 409);
  if (inningsRow.innings_number > 1 && !matchRow.target_score) {
    throw new ScoringError("First innings is not completed yet", 409);
  }

  return {
    live,
    matchRow,
    inningsRow,
    maxOvers: matchRow.total_overs || 5,
    maxWickets: await squadModel.getMaxWickets(conn, inningsRow.team_id, matchId),
    target: matchRow.target_score ? Number(matchRow.target_score) : null,
  };
}

// Write what the outcome means: the target after the first innings, and the result once the match is decided.
async function applyOutcome(conn, { matchId, matchRow, inningsRow, outcome, newScore }) {
  // The target always follows the first innings total (it changes if a ball was undone and re-scored).
  if (outcome.inningsFinished && inningsRow.innings_number === 1) {
    await conn.execute(`UPDATE matches SET target_score = ? WHERE match_id = ?`, [newScore + 1, matchId]);
  }
  if (!outcome.matchCompleted) return;

  // A tie: the tournament may settle it by itself (the team that batted first wins). Otherwise the match
  // stays level until the scorer records a super over or the host picks the winner (see tieBreakService).
  if (!outcome.winnerTeamId) {
    const auto = await tieBreak.autoWinner(conn, matchId);
    if (auto) outcome = { ...outcome, winnerTeamId: auto.winnerTeamId, decidedBy: auto.decidedBy };
  }

  await conn.execute(
    `UPDATE matches SET
      winner_team_id = ?, result = 'completed',
      status = 'completed', victory_margin_type = ?, victory_margin = ?
    WHERE match_id = ?`,
    [outcome.winnerTeamId, outcome.marginType, outcome.margin, matchId]
  );
  await conn.execute(`UPDATE tournament_matches SET winner_team_id = ?, status = 'completed' WHERE match_id = ?`, [
    outcome.winnerTeamId,
    matchId,
  ]);
  // A tie has no winner, so the bracket waits until the organiser settles it.
  if (outcome.winnerTeamId) {
    const loserTeamId = same(outcome.winnerTeamId, matchRow.team1_id) ? matchRow.team2_id : matchRow.team1_id;
    await advanceBracket(conn, matchId, outcome.winnerTeamId, loserTeamId);
  }
  if (outcome.decidedBy) await tieBreak.recordAuto(conn, matchId, outcome.decidedBy, outcome.winnerTeamId);
  // player figures, ranking points, final positions, notifications (never stops the result from being saved)
  await postMatchHooks.onMatchCompleted(conn, matchId);
}

/* ---------------------------- register ball ---------------------------- */

exports.registerBallEvent = async (conn, inputData) => {
  const matchId = toId(inputData.matchId, "matchId");
  const inningId = toId(inputData.inningId, "inningId");
  if (!matchId || !inningId) throw new ScoringError("matchId and inningId are required");

  // A batter retiring is not a delivery: it is recorded on its own and does not use up a ball.
  if (flag(inputData.isRetiredHurt)) {
    const hasDelivery =
      toCount(inputData.runsScored, "runsScored", 8) > 0 || toCount(inputData.extras, "extras", 12) > 0 || given(inputData.extraType) || flag(inputData.isWicket);
    if (hasDelivery) throw new ScoringError("A retirement is not a delivery. Record it on its own, then score the ball.");
    return exports.retireBatsman(conn, {
      inningId,
      matchId,
      batsmanId: inputData.dismissedPlayerId ?? inputData.batsmanId,
      lastBallId: inputData.lastBallId,
    });
  }

  // Lock the innings first so two scorers (or a double tap) are processed one after the other.
  const { live, matchRow, inningsRow, maxOvers, maxWickets, target } = await loadScoringContext(conn, inningId, matchId);
  await assertScoreboardCurrent(conn, inningId, inputData.lastBallId);

  const strikerBefore = num(live.on_strike_batsman_id);
  const nonStrikerBefore = num(live.non_striker_batsman_id);
  if (!strikerBefore || !nonStrikerBefore) {
    throw new ScoringError("Both batsmen must be at the crease. Select the incoming batsman first.", 409);
  }
  if (!live.bowler_id) throw new ScoringError("No bowler assigned. Select the bowler first.", 409);

  const totalBefore = totalLegalBalls(live);
  if (isInningsOver(Number(live.current_wickets), totalBefore, maxWickets, maxOvers)) {
    throw new ScoringError("Innings is over. No further balls allowed.", 409);
  }

  // ----- who is playing this ball -----
  const batsmanId = toId(inputData.batsmanId, "batsmanId") ?? strikerBefore;
  if (!same(batsmanId, strikerBefore)) {
    throw new ScoringError(`Striker mismatch: player ${strikerBefore} is on strike`, 409);
  }
  const bowlerId = toId(inputData.bowlerId, "bowlerId") ?? num(live.bowler_id);
  if (!same(bowlerId, live.bowler_id)) {
    throw new ScoringError(`Bowler mismatch: player ${live.bowler_id} is bowling this over`, 409);
  }

  // ----- the delivery -----
  const runsScored = toCount(inputData.runsScored, "runsScored", 8);
  const extraType = normalizeExtraType(inputData.extraType);
  // a no-ball can carry byes or leg-byes (the batters ran them without hitting it): they are not bat runs
  const noBallRunsType = normalizeNoBallRunsType(inputData.noBallRunsAs, extraType);
  let extras = toCount(inputData.extras, "extras", 12);
  const legalDelivery = isLegalDelivery(extraType);

  if (extraType === "wide" || extraType === "no-ball") {
    if (extras === 0) extras = 1; // the penalty run
  } else if (extraType) {
    if (extras === 0) throw new ScoringError(`Enter the ${extraType} runs in "extras"`);
  } else if (extras > 0) {
    throw new ScoringError('"extras" needs an extraType');
  }
  if ((extraType === "wide" || extraType === "bye" || extraType === "leg-bye") && runsScored > 0) {
    throw new ScoringError(`Runs off the bat cannot be scored on a ${extraType}`);
  }
  if (noBallRunsType) {
    if (runsScored > 0) throw new ScoringError(`A no-ball cannot have both bat runs and ${noBallRunsType}s`);
    if (extras < 2) throw new ScoringError(`Enter the ${noBallRunsType} runs: the no-ball itself is 1, the ${noBallRunsType}s come on top`);
  }

  // ----- the wicket -----
  const fielderId = toId(inputData.fielderId, "fielderId");
  const outEvent = flag(inputData.isWicket);
  let wicketType = null;
  let dismissedPlayerId = toId(inputData.dismissedPlayerId, "dismissedPlayerId");

  if (outEvent) {
    wicketType = normalizeWicketType(inputData.wicketType);
    if (!wicketType) throw new ScoringError("wicketType is required when isWicket is true");
    if (wicketType === "retired out") throw new ScoringError("A retirement is not a delivery. Record it on its own.");
    assertWicketPossible(wicketType, extraType);
    assertDeadBallDismissal(wicketType, runsScored, extras, extraType);
    // a free hit follows a no-ball (and carries on through wides): only some dismissals are possible
    if (isFreeHit(await ballsModel.getRecentExtraTypes(conn, inningId))) assertFreeHitWicket(wicketType);

    if (STRIKER_ONLY_WICKETS.includes(wicketType)) {
      dismissedPlayerId = dismissedPlayerId ?? strikerBefore;
      if (!same(dismissedPlayerId, strikerBefore)) {
        throw new ScoringError(`Only the striker can be out ${wicketType}`);
      }
    } else {
      if (!dismissedPlayerId && wicketType !== "run out") dismissedPlayerId = strikerBefore;
      if (!dismissedPlayerId) throw new ScoringError("Dismissed player id must be provided for run out");
      if (!same(dismissedPlayerId, strikerBefore) && !same(dismissedPlayerId, nonStrikerBefore)) {
        throw new ScoringError("The dismissed player is not at the crease");
      }
      if (wicketType === "run out" && !fielderId) {
        throw new ScoringError("Fielder id must be provided for run out wicket");
      }
    }
  } else {
    dismissedPlayerId = null;
  }

  // ----- over / ball bookkeeping -----
  const currentOver = await getCurrentActiveOver(conn, inningId, matchId, bowlerId);
  if (!same(currentOver.bowler_id, bowlerId)) throw new ScoringError("Bowler mismatch for the current over", 409);
  const currentOverId = currentOver.over_id;
  const currentOverNumber = currentOver.over_number;

  const [[{ nextBallNumber }]] = await conn.execute(
    `SELECT COALESCE(MAX(ball_number), 0) + 1 AS nextBallNumber FROM balls WHERE over_id = ?`,
    [currentOverId]
  );

  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_id, over_number, ball_number,
      batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region, nb_runs_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inningId,
      currentOverId,
      currentOverNumber,
      nextBallNumber,
      batsmanId,
      bowlerId,
      runsScored,
      outEvent ? 1 : 0,
      wicketType,
      dismissedPlayerId,
      fielderId,
      extras,
      extraType,
      legalDelivery ? 1 : 0,
      0,
      inputData.shotType ?? null,
      inputData.ballOutcome ?? null,
      inputData.wagonWheelRegion ?? null,
      noBallRunsType,
    ]
  );

  // ----- running totals -----
  const totalRuns = calculateTotalRuns(runsScored, extras);
  const newScore = Number(live.current_score) + totalRuns;
  const newWickets = Number(live.current_wickets) + (outEvent ? 1 : 0);
  const totalAfter = totalBefore + (legalDelivery ? 1 : 0);
  const { overs: completedOvers, balls: ballsInOver } = splitBalls(totalAfter);
  const overIsComplete = isOverComplete(totalBefore % 6, legalDelivery);
  const oversString = ballsToOversString(totalAfter);

  // ----- who is where -----
  const crease = { striker: strikerBefore, nonStriker: nonStrikerBefore };
  let batsman1Id = num(live.batsman1_id);
  let batsman2Id = num(live.batsman2_id);
  const crossed = shouldRotateStrike(runsScored, extras, extraType, noBallRunsType);

  if (outEvent) {
    // A run out with an odd number of completed runs happened after the batters crossed.
    if (wicketType === "run out" && crossed) swap(crease);
    if (same(crease.striker, dismissedPlayerId)) crease.striker = null;
    if (same(crease.nonStriker, dismissedPlayerId)) crease.nonStriker = null;
    if (same(batsman1Id, dismissedPlayerId)) batsman1Id = null;
    if (same(batsman2Id, dismissedPlayerId)) batsman2Id = null;
  } else if (crossed) {
    swap(crease);
  }
  if (overIsComplete) swap(crease);

  const bowlerIdToUpdate = overIsComplete ? null : bowlerId;
  const partnershipRuns = outEvent ? 0 : Number(live.partnership_runs || 0) + getPartnershipRuns(runsScored, extras);

  // ----- innings / match outcome -----
  const outcome = decideOutcome({
    inningsNumber: inningsRow.innings_number,
    target,
    score: newScore,
    wickets: newWickets,
    legalBalls: totalAfter,
    maxWickets,
    maxOvers,
    battingTeamId: inningsRow.team_id,
    team1Id: matchRow.team1_id,
    team2Id: matchRow.team2_id,
  });

  await conn.execute(
    `UPDATE live_scorecards SET
      current_score = ?, current_wickets = ?, legal_balls_in_over = ?,
      legal_over_count = ?, current_overs = ?, on_strike_batsman_id = ?,
      non_striker_batsman_id = ?, batsman1_id = ?, batsman2_id = ?,
      bowler_id = ?, partnership_runs = ?, current_run_rate = ?,
      last_updated = CURRENT_TIMESTAMP
    WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      ballsInOver,
      completedOvers,
      oversString,
      crease.striker,
      crease.nonStriker,
      batsman1Id,
      batsman2Id,
      bowlerIdToUpdate,
      partnershipRuns,
      runRate(newScore, totalAfter),
      inningId,
    ]
  );

  if (outEvent) {
    await conn.execute(
      `UPDATE live_scorecards SET last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ? WHERE inning_id = ?`,
      [dismissedPlayerId, oversString, wicketType, inningId]
    );
  }

  await conn.execute(
    `UPDATE innings SET
      total_runs = ?, wickets = ?, balls_bowled = ?, overs = ?, status = ?,
      extras = COALESCE(extras, 0) + ?, run_rate = ?
    WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      totalAfter,
      oversString,
      outcome.inningsFinished ? "completed" : inningsRow.status,
      extras,
      runRate(newScore, totalAfter),
      inningId,
    ]
  );

  if (overIsComplete) {
    await conn.execute(`UPDATE overs SET is_complete = TRUE WHERE over_id = ?`, [currentOverId]);
  }

  await applyOutcome(conn, { matchId, matchRow, inningsRow, outcome, newScore });

  // ----- player figures -----
  const figures = {
    batsmanId,
    bowlerId,
    matchId,
    runsScored,
    extras,
    extraType,
    noBallRunsType,
    legalDelivery,
    isWicket: outEvent,
    wicketType,
  };
  await playerPerfModel.updatePerformanceOnBall(conn, figures);

  let dismissedRuns = null;
  if (outEvent && dismissedPlayerId) {
    await playerPerfModel.ensureRow(conn, dismissedPlayerId, matchId);
    dismissedRuns = await playerPerfModel.getMatchRuns(conn, dismissedPlayerId, matchId);
  }
  await playerStatsModel.updateStatsOnBall(conn, { ...figures, dismissedPlayerId, dismissedRuns });

  if (overIsComplete && (await overRunsConceded(conn, currentOverId)) === 0) {
    await playerPerfModel.adjustMaidens(conn, bowlerId, matchId, 1);
  }

  return { matchCompleted: outcome.matchCompleted, inningsFinished: outcome.inningsFinished, winnerTeamId: outcome.winnerTeamId };
};

/* ------------------------------ retirement ------------------------------ */

/**
 * A batter leaves the crease between deliveries: retired hurt (not out, may come back later when a
 * wicket has fallen) or retired out (counts as a wicket, never the bowler's). It is not a delivery:
 * no ball is used, no runs, the over and the bowler are untouched. The partnership ends.
 */
exports.retireBatsman = async (conn, input) => {
  const matchId = toId(input.matchId, "matchId");
  const inningId = toId(input.inningId, "inningId");
  const retiringId = toId(input.batsmanId, "batsmanId");
  if (!matchId || !inningId) throw new ScoringError("matchId and inningId are required");
  if (!retiringId) throw new ScoringError("batsmanId is required: who is retiring?");
  const retiredOut = flag(input.retiredOut);

  const { live, matchRow, inningsRow, maxOvers, maxWickets, target } = await loadScoringContext(conn, inningId, matchId);
  await assertScoreboardCurrent(conn, inningId, input.lastBallId);

  const strikerBefore = num(live.on_strike_batsman_id);
  const nonStrikerBefore = num(live.non_striker_batsman_id);
  if (!strikerBefore || !nonStrikerBefore) {
    throw new ScoringError("Both batsmen must be at the crease. Select the incoming batsman first.", 409);
  }
  if (!same(retiringId, strikerBefore) && !same(retiringId, nonStrikerBefore)) {
    throw new ScoringError("The retiring player is not at the crease");
  }
  const totalBalls = totalLegalBalls(live);

  // the retirement is written to the ball log (so it can be undone) against the latest over
  const [[lastOver]] = await conn.execute(`SELECT over_id, over_number, bowler_id FROM overs WHERE inning_id = ? ORDER BY over_number DESC LIMIT 1`, [inningId]);
  let over = lastOver;
  if (!over) {
    if (!live.bowler_id) throw new ScoringError("No bowler assigned. Select the bowler first.", 409);
    over = await getCurrentActiveOver(conn, inningId, matchId, num(live.bowler_id));
  }
  const [[{ nextBallNumber }]] = await conn.execute(
    `SELECT COALESCE(MAX(ball_number), 0) + 1 AS nextBallNumber FROM balls WHERE over_id = ?`,
    [over.over_id]
  );
  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_id, over_number, ball_number,
      batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inningId, over.over_id, over.over_number, nextBallNumber, strikerBefore, over.bowler_id, 0,
      retiredOut ? 1 : 0, retiredOut ? "retired out" : null, retiringId, null,
      0, null, 0, retiredOut ? 0 : 1,
      null, "retired", null,
    ]
  );

  const crease = { striker: strikerBefore, nonStriker: nonStrikerBefore };
  let batsman1Id = num(live.batsman1_id);
  let batsman2Id = num(live.batsman2_id);
  if (same(crease.striker, retiringId)) crease.striker = null;
  if (same(crease.nonStriker, retiringId)) crease.nonStriker = null;
  if (same(batsman1Id, retiringId)) batsman1Id = null;
  if (same(batsman2Id, retiringId)) batsman2Id = null;

  const newScore = Number(live.current_score);
  const newWickets = Number(live.current_wickets) + (retiredOut ? 1 : 0);
  const outcome = decideOutcome({
    inningsNumber: inningsRow.innings_number,
    target,
    score: newScore,
    wickets: newWickets,
    legalBalls: totalBalls,
    maxWickets,
    maxOvers,
    battingTeamId: inningsRow.team_id,
    team1Id: matchRow.team1_id,
    team2Id: matchRow.team2_id,
  });

  await conn.execute(
    `UPDATE live_scorecards SET
      current_wickets = ?, on_strike_batsman_id = ?, non_striker_batsman_id = ?,
      batsman1_id = ?, batsman2_id = ?, partnership_runs = 0, last_updated = CURRENT_TIMESTAMP
    WHERE inning_id = ?`,
    [newWickets, crease.striker, crease.nonStriker, batsman1Id, batsman2Id, inningId]
  );
  if (retiredOut) {
    await conn.execute(
      `UPDATE live_scorecards SET last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ? WHERE inning_id = ?`,
      [retiringId, ballsToOversString(totalBalls), "retired out", inningId]
    );
  }
  await conn.execute(`UPDATE innings SET wickets = ?, status = ? WHERE inning_id = ?`, [
    newWickets,
    outcome.inningsFinished ? "completed" : inningsRow.status,
    inningId,
  ]);
  await applyOutcome(conn, { matchId, matchRow, inningsRow, outcome, newScore });

  return { matchCompleted: outcome.matchCompleted, inningsFinished: outcome.inningsFinished, winnerTeamId: outcome.winnerTeamId };
};

/* -------------------------------- undo -------------------------------- */

/**
 * Take the last ball (or retirement) back and restore everything it changed.
 * @param options.lastBallId  the ball the scorer thinks is the last one; refused if the innings moved on
 * @param options.survivorId  only needed to take back a wicket of the striker after the incoming batsman was
 *                            already chosen: the batter who was at the other end before the wicket
 */
exports.undoLastBallEvent = async (conn, inningId, matchId, options = {}) => {
  inningId = toId(inningId, "inningId");
  matchId = toId(matchId, "matchId");
  if (!inningId || !matchId) throw new ScoringError("inningId and matchId are required");

  const live = await lockLiveScorecard(conn, inningId);

  const [[inningsRow]] = await conn.execute(
    `SELECT balls_bowled, total_runs, wickets, status, innings_number, team_id, match_id FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!inningsRow) throw new ScoringError("Innings not found", 404);
  if (Number(inningsRow.match_id) !== matchId) throw new ScoringError("Innings does not belong to this match");

  const [[matchRow]] = await conn.execute(
    `SELECT total_overs, team1_id, team2_id, target_score, status FROM matches WHERE match_id = ? LIMIT 1`,
    [matchId]
  );
  if (!matchRow) throw new ScoringError("Match not found", 404);
  const MAX_OVERS = matchRow.total_overs || 5;
  const maxWickets = await squadModel.getMaxWickets(conn, inningsRow.team_id, matchId);

  const [[lastBall]] = await conn.execute(`SELECT * FROM balls WHERE inning_id = ? ORDER BY ball_id DESC LIMIT 1`, [
    inningId,
  ]);
  if (!lastBall) throw new ScoringError("No ball events to undo", 409);
  if (given(options.lastBallId) && Number(options.lastBallId) !== Number(lastBall.ball_id)) {
    throw new ScoringError("The last ball is no longer the one you were looking at. Refresh before undoing.", 409);
  }

  if (inningsRow.innings_number === 1) {
    const [[later]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM balls b JOIN innings i ON i.inning_id = b.inning_id
       WHERE i.match_id = ? AND i.innings_number > 1`,
      [matchId]
    );
    if (Number(later.n) > 0) throw new ScoringError("Undo the second innings first", 409);
  }

  // ----- decode the ball being undone -----
  const extraType = lenientExtraType(lastBall.extra_type);
  const wicketType = lenientWicketType(lastBall.wicket_type);
  const legal = Number(lastBall.legal_delivery) === 1;
  const isRetired = Number(lastBall.is_retired_hurt) === 1;
  const outEvent = Number(lastBall.is_wicket) === 1 && !isRetired;
  const leavesCrease = outEvent || isRetired;
  const delivery = legal || !!extraType; // a retirement is in the log but was never a delivery
  const runsScored = Number(lastBall.runs_scored || 0);
  const extras = Number(lastBall.extras || 0);
  const dismissedId = num(lastBall.dismissed_player_id);
  const strikerBeforeBall = num(lastBall.batsman_id);

  const [[legalInOver]] = await conn.execute(`SELECT COUNT(*) AS n FROM balls WHERE over_id = ? AND legal_delivery = 1`, [
    lastBall.over_id,
  ]);
  const overWasComplete = legal && Number(legalInOver.n) === 6;

  // ----- bracket: the next round can only be taken back if it has not started -----
  let tournamentMatch = null;
  if (matchRow.status === "completed") {
    const [[tm]] = await conn.execute(`SELECT id FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
    tournamentMatch = tm || null;
    if (tournamentMatch) {
      const [dependents] = await conn.execute(
        `SELECT id, status, match_id FROM tournament_matches WHERE dependent_match1_id = ? OR dependent_match2_id = ?`,
        [tournamentMatch.id, tournamentMatch.id]
      );
      if (dependents.some((d) => d.match_id || (d.status && d.status !== "scheduled"))) {
        throw new ScoringError("Cannot undo: the next round match has already started", 409);
      }
    }
  }

  // ----- who was at the crease before the ball -----
  const crease = { striker: num(live.on_strike_batsman_id), nonStriker: num(live.non_striker_batsman_id) };
  let batsman1Id = num(live.batsman1_id);
  let batsman2Id = num(live.batsman2_id);
  const crossed = shouldRotateStrike(runsScored, extras, extraType, lastBall.nb_runs_type || null);

  if (overWasComplete) swap(crease);

  if (leavesCrease) {
    const present = [crease.striker, crease.nonStriker].filter((id) => id !== null);
    let incomingId = null;
    if (present.length === 2) {
      // The incoming batsman is already in. If the striker was not the one who left, the striker of the
      // ball is the one who stayed. Otherwise the scorer has to say who stayed.
      let survivor = same(dismissedId, strikerBeforeBall) ? num(options.survivorId) : strikerBeforeBall;
      if (survivor === null || !present.some((id) => same(id, survivor))) {
        throw new ScoringError(
          "Cannot undo this wicket: the incoming batsman has already been selected. Send survivorId (the batter who stayed at the crease) to take it back.",
          409
        );
      }
      incomingId = present.find((id) => !same(id, survivor));
    }
    if (incomingId !== null) {
      if (same(crease.striker, incomingId)) crease.striker = dismissedId;
      else crease.nonStriker = dismissedId;
      if (same(batsman1Id, incomingId)) batsman1Id = dismissedId;
      else if (same(batsman2Id, incomingId)) batsman2Id = dismissedId;
    } else {
      if (crease.striker === null) crease.striker = dismissedId;
      else crease.nonStriker = dismissedId;
      if (batsman1Id === null) batsman1Id = dismissedId;
      else if (batsman2Id === null) batsman2Id = dismissedId;
    }
    if (outEvent && wicketType === "run out" && crossed) swap(crease);
  } else if (crossed) {
    swap(crease);
  }
  // The striker of the ball is known for certain, so heal any drift (e.g. a manual striker change).
  if (strikerBeforeBall && !same(crease.striker, strikerBeforeBall)) {
    if (same(crease.nonStriker, strikerBeforeBall)) swap(crease);
  }

  // ----- player figures (read the dismissed batter's runs BEFORE taking the ball back) -----
  let dismissedRuns = null;
  if (delivery && outEvent && dismissedId) dismissedRuns = await playerPerfModel.getMatchRuns(conn, dismissedId, matchId);
  if (overWasComplete && (await overRunsConceded(conn, lastBall.over_id)) === 0) {
    await playerPerfModel.adjustMaidens(conn, lastBall.bowler_id, matchId, -1);
  }

  await conn.execute(`DELETE FROM balls WHERE ball_id = ?`, [lastBall.ball_id]);

  if (delivery) {
    await playerPerfModel.revertPerformanceOnBall(conn, lastBall, matchId);
    await playerStatsModel.revertStatsOnBall(conn, lastBall, { dismissedRuns });
  }

  // ----- totals -----
  const totalAfter = Math.max(totalLegalBalls(live) - (legal ? 1 : 0), 0);
  const { overs: completedOvers, balls: ballsInOver } = splitBalls(totalAfter);
  const oversString = ballsToOversString(totalAfter);
  const newScore = Math.max(Number(live.current_score) - calculateTotalRuns(runsScored, extras), 0);
  const newWickets = Math.max(Number(live.current_wickets) - (outEvent ? 1 : 0), 0);

  // partnership = runs since the last batter left; last wicket = the previous dismissal
  const [[partnership]] = await conn.execute(
    `SELECT COALESCE(SUM(runs_scored + extras), 0) AS runs FROM balls
     WHERE inning_id = ? AND ball_id > COALESCE((SELECT MAX(ball_id) FROM balls WHERE inning_id = ? AND (is_wicket = 1 OR is_retired_hurt = 1)), 0)`,
    [inningId, inningId]
  );
  const [[prevWicket]] = await conn.execute(
    `SELECT dismissed_player_id, wicket_type,
       (SELECT COUNT(*) FROM balls b2 WHERE b2.inning_id = balls.inning_id AND b2.ball_id <= balls.ball_id AND b2.legal_delivery = 1) AS legal_upto
     FROM balls WHERE inning_id = ? AND is_wicket = 1 ORDER BY ball_id DESC LIMIT 1`,
    [inningId]
  );

  const stillComplete = isInningsOver(newWickets, totalAfter, maxWickets, MAX_OVERS);
  const newStatus = stillComplete ? "completed" : inningsRow.status === "completed" ? "live" : inningsRow.status;

  // ----- over bookkeeping: take the bowler back if the over was closed by this ball -----
  let bowlerId = num(live.bowler_id);
  if (overWasComplete) {
    bowlerId = num(lastBall.bowler_id);
    await conn.execute(`UPDATE overs SET is_complete = FALSE WHERE over_id = ?`, [lastBall.over_id]);
    await conn.execute(
      `DELETE FROM overs WHERE inning_id = ? AND over_number > ?
         AND NOT EXISTS (SELECT 1 FROM balls WHERE balls.over_id = overs.over_id)`,
      [inningId, lastBall.over_number]
    );
  }

  await conn.execute(
    `UPDATE live_scorecards SET
      current_score = ?, current_wickets = ?, legal_balls_in_over = ?, legal_over_count = ?, current_overs = ?,
      on_strike_batsman_id = ?, non_striker_batsman_id = ?, batsman1_id = ?, batsman2_id = ?,
      bowler_id = ?, partnership_runs = ?, current_run_rate = ?,
      last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ?,
      last_updated = CURRENT_TIMESTAMP
    WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      ballsInOver,
      completedOvers,
      oversString,
      crease.striker,
      crease.nonStriker,
      batsman1Id,
      batsman2Id,
      bowlerId,
      Number(partnership.runs),
      runRate(newScore, totalAfter),
      prevWicket ? prevWicket.dismissed_player_id : null,
      prevWicket ? ballsToOversString(prevWicket.legal_upto) : null,
      prevWicket ? prevWicket.wicket_type : null,
      inningId,
    ]
  );

  await conn.execute(
    `UPDATE innings SET
      total_runs = ?, wickets = ?, balls_bowled = ?, overs = ?, status = ?,
      extras = GREATEST(COALESCE(extras, 0) - ?, 0), run_rate = ?
    WHERE inning_id = ?`,
    [newScore, newWickets, totalAfter, oversString, newStatus, extras, runRate(newScore, totalAfter), inningId]
  );

  if (inningsRow.innings_number === 1) {
    await conn.execute(`UPDATE matches SET target_score = ? WHERE match_id = ?`, [
      stillComplete ? newScore + 1 : null,
      matchId,
    ]);
  }

  // ----- reopen the match / take the winner back out of the bracket -----
  if (matchRow.status === "completed") {
    await conn.execute(
      `UPDATE matches SET winner_team_id = NULL, result = 'live', status = 'live', victory_margin_type = NULL, victory_margin = NULL WHERE match_id = ?`,
      [matchId]
    );
    await conn.execute(`UPDATE tournament_matches SET winner_team_id = NULL, status = 'live' WHERE match_id = ?`, [matchId]);
    if (tournamentMatch) {
      await conn.execute(`UPDATE tournament_matches SET team1_id = NULL WHERE dependent_match1_id = ?`, [tournamentMatch.id]);
      await conn.execute(`UPDATE tournament_matches SET team2_id = NULL WHERE dependent_match2_id = ?`, [tournamentMatch.id]);
    }
    await postMatchHooks.onMatchReopened(conn, matchId);
  }

  return true;
};

/* ----------------------------- change striker ----------------------------- */

exports.changeStriker = async (conn, inningId, newStrikerId) => {
  inningId = toId(inningId, "inningId");
  newStrikerId = toId(newStrikerId, "newStrikerId");

  const live = await lockLiveScorecard(conn, inningId);
  const currentStriker = num(live.on_strike_batsman_id);
  const currentNonStriker = num(live.non_striker_batsman_id);

  if (!same(newStrikerId, currentStriker) && !same(newStrikerId, currentNonStriker)) {
    throw new ScoringError("The new striker must be one of the two batsmen at the crease");
  }
  if (same(currentStriker, newStrikerId)) return true;

  await conn.execute(`UPDATE live_scorecards SET on_strike_batsman_id = ?, non_striker_batsman_id = ? WHERE inning_id = ?`, [
    newStrikerId,
    currentStriker,
    inningId,
  ]);
  return true;
};

/* ------------------------------ active over ------------------------------ */

async function getCurrentActiveOver(conn, inningId, matchId, bowlerId = null) {
  const [[activeOver]] = await conn.execute(
    `SELECT over_id, over_number, bowler_id, is_complete
      FROM overs
      WHERE inning_id = ? AND is_complete = FALSE
      ORDER BY over_number DESC LIMIT 1`,
    [inningId]
  );
  if (activeOver) return activeOver;

  if (!bowlerId) throw new ScoringError("No active over found and no bowler specified to start new over", 409);

  const [[{ maxOver }]] = await conn.execute(`SELECT MAX(over_number) AS maxOver FROM overs WHERE inning_id = ?`, [inningId]);
  const nextOverNumber = (maxOver || 0) + 1;
  const [insertResult] = await conn.execute(
    `INSERT INTO overs (inning_id, match_id, over_number, bowler_id, is_complete, start_timestamp)
      VALUES (?, ?, ?, ?, FALSE, NOW())`,
    [inningId, matchId, nextOverNumber, bowlerId]
  );

  return {
    over_id: insertResult.insertId,
    over_number: nextOverNumber,
    bowler_id: bowlerId,
    is_complete: false,
  };
}
