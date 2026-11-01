// utils/cricketRules/cricketRules.js
// Pure cricket rules. No DB access here so everything is unit-testable.

const { ScoringError } = require("../errors");

/* ----------------------------- extras ----------------------------- */

const EXTRA_ALIASES = {
  wide: "wide",
  wd: "wide",
  "no-ball": "no-ball",
  noball: "no-ball",
  nb: "no-ball",
  bye: "bye",
  b: "bye",
  "leg-bye": "leg-bye",
  legbye: "leg-bye",
  lb: "leg-bye",
};

/**
 * Canonical extra type: "wide" | "no-ball" | "bye" | "leg-bye" | null.
 * Accepts "No Ball", "no_ball", "NB", "leg bye" ... Throws on anything unknown.
 */
function normalizeExtraType(extraType) {
  if (extraType === null || extraType === undefined || extraType === "") return null;
  const key = String(extraType).trim().toLowerCase().replace(/[\s_]+/g, "-");
  const canonical = EXTRA_ALIASES[key];
  if (!canonical) throw new ScoringError(`Unknown extra type "${extraType}"`);
  return canonical;
}

/**
 * What the batters ran on a no-ball besides the bat: null (the runs came off the bat), "bye" or "leg-bye".
 * Only a no-ball can carry them (the other extras are already byes or leg-byes, or cannot be run).
 */
function normalizeNoBallRunsType(value, extraType) {
  if (value === null || value === undefined || value === "" || value === "bat") return null;
  const key = String(value).trim().toLowerCase().replace(/[s_]+/g, "-");
  if (key !== "bye" && key !== "leg-bye") throw new ScoringError(`Unknown kind of runs off a no-ball: "${value}"`);
  if (extraType !== "no-ball") throw new ScoringError("Byes and leg-byes off a no-ball can only be entered on a no-ball");
  return key;
}

/**
 * Runs charged to the bowler for a delivery: bat runs, plus the penalty of a wide or no-ball.
 * Byes and leg-byes are never his, also when they were run off a no-ball (only its one penalty run is).
 */
function bowlerRunsCharged(runsScored, extras, extraType, noBallRunsType) {
  const bat = runsScored || 0;
  if (extraType === "wide") return bat + (extras || 0);
  if (extraType === "no-ball") return bat + (noBallRunsType ? Math.min(extras || 0, 1) : extras || 0);
  return bat;
}

/** Wides and no-balls do not count as one of the six balls in an over. */
function isLegalDelivery(extraType) {
  const t = normalizeExtraType(extraType);
  return t !== "wide" && t !== "no-ball";
}

/** Batter runs + extras. */
function calculateTotalRuns(runsScored, extras) {
  return (runsScored || 0) + (extras || 0);
}

/**
 * Runs the batters physically ran, which is what decides whether they crossed.
 *  - wide: extras include the 1 penalty run, the rest were run
 *  - no-ball: only the bat runs were run (the penalty run is not run)
 *  - bye / leg-bye: the extras were run
 *  - otherwise: the bat runs
 */
function getRunsRun(runsScored, extras, extraType, noBallRunsType) {
  const t = normalizeExtraType(extraType);
  if (t === "wide") return Math.max((extras || 0) - 1, 0);
  // a no-ball whose runs were byes / leg-byes: everything after the penalty run was run
  if (t === "no-ball" && normalizeNoBallRunsType(noBallRunsType, t)) return Math.max((extras || 0) - 1, 0);
  if (t === "bye" || t === "leg-bye") return extras || 0;
  return runsScored || 0;
}

/** True when an odd number of runs was run, so the batters changed ends. */
function shouldRotateStrike(runsScored, extras, extraType, noBallRunsType) {
  return getRunsRun(runsScored, extras, extraType, noBallRunsType) % 2 === 1;
}

/** Partnership runs (batter runs + extras). */
function getPartnershipRuns(runsScored, extras) {
  return calculateTotalRuns(runsScored, extras);
}

/* ----------------------------- wickets ----------------------------- */

const WICKET_ALIASES = {
  bowled: "bowled",
  b: "bowled",
  caught: "caught",
  c: "caught",
  lbw: "lbw",
  "leg-before-wicket": "lbw",
  stumped: "stumped",
  st: "stumped",
  "run-out": "run out",
  runout: "run out",
  "hit-wicket": "hit wicket",
  hitwicket: "hit wicket",
  "handled-ball": "handled ball",
  "obstructing-the-field": "obstructing the field",
  "obstructing-field": "obstructing the field",
  "hit-the-ball-twice": "hit the ball twice",
  "retired-out": "retired out",
};

// Dismissals that can only ever be given to the striker.
const STRIKER_ONLY_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket", "hit the ball twice"];
// Dismissals credited to the bowler.
const BOWLER_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];
// What can still get a batter out off a wide / a no-ball.
const WICKETS_ON_WIDE = ["stumped", "run out", "hit wicket", "handled ball", "obstructing the field"];
const WICKETS_ON_NO_BALL = ["run out", "handled ball", "obstructing the field", "hit the ball twice"];

/** Canonical wicket type, e.g. "Run_Out" -> "run out". Throws when unknown. */
function normalizeWicketType(wicketType) {
  if (wicketType === null || wicketType === undefined || wicketType === "") return null;
  const key = String(wicketType).trim().toLowerCase().replace(/[\s_]+/g, "-");
  const canonical = WICKET_ALIASES[key];
  if (!canonical) throw new ScoringError(`Unsupported wicket type "${wicketType}"`);
  return canonical;
}

/** True when the dismissal is credited to the bowler (not run out, handled ball ...). */
function isBowlerWicket(wicketType) {
  return BOWLER_WICKETS.includes(wicketType);
}

/** Throws if this dismissal cannot happen on this kind of delivery. */
function assertWicketPossible(wicketType, extraType) {
  if (extraType === "wide" && !WICKETS_ON_WIDE.includes(wicketType)) {
    throw new ScoringError(`A batter cannot be out "${wicketType}" off a wide`);
  }
  if (extraType === "no-ball" && !WICKETS_ON_NO_BALL.includes(wicketType)) {
    throw new ScoringError(`A batter cannot be out "${wicketType}" off a no-ball`);
  }
}

/* ------------------------------ overs ------------------------------ */
// Overs are always derived from a legal-ball count. Never add 0.1 to a float.

/** 22 balls -> "3.4" */
function ballsToOversString(balls) {
  const b = Math.max(0, Math.trunc(balls || 0));
  return `${Math.floor(b / 6)}.${b % 6}`;
}

/** "3.4" / 3.4 -> 22 balls */
function oversToBalls(overs) {
  const value = Number(overs);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const whole = Math.floor(value + 1e-9);
  const balls = Math.round((value - whole) * 10);
  return whole * 6 + balls;
}

/** Add (or remove, with delta -1) legal balls to a cricket-style overs value such as 3.4. */
function addBallsToOvers(overs, delta) {
  const total = Math.max(0, oversToBalls(overs) + delta);
  return Number(ballsToOversString(total));
}

/** Legal balls -> { overs: completed overs, balls: balls in the current over } */
function splitBalls(totalBalls) {
  return { overs: Math.floor(totalBalls / 6), balls: totalBalls % 6 };
}

/** True when this legal ball is the 6th of the over. */
function isOverComplete(legalBallsBefore, legalDelivery) {
  return !!legalDelivery && legalBallsBefore + 1 === 6;
}

/** Innings is over on 10 wickets or when all overs are bowled. */
function isInningsOver(wickets, totalLegalBalls, maxWickets, maxOvers) {
  return wickets >= maxWickets || totalLegalBalls >= maxOvers * 6;
}

/** Runs per over, 2 decimals. */
function runRate(runs, legalBalls) {
  if (!legalBalls) return 0;
  return Number(((runs * 6) / legalBalls).toFixed(2));
}

/* --------------------------- more Laws of Cricket --------------------------- */

// The ball is dead the moment the batter is out in these ways, so no runs can follow.
const DEAD_BALL_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];

/**
 * A batter who is bowled, caught, lbw, stumped or hit wicket is out on a dead ball: no runs off the bat,
 * no byes or leg-byes. The only run that can still be added is the one-run penalty of a wide
 * (the batter can be stumped or hit wicket off a wide).
 */
function assertDeadBallDismissal(wicketType, runsScored, extras, extraType) {
  if (!DEAD_BALL_WICKETS.includes(wicketType)) return;
  if (runsScored > 0) throw new ScoringError(`No runs can be scored off the bat when the batter is out ${wicketType}`);
  if (extraType === "bye" || extraType === "leg-bye") {
    throw new ScoringError(`The ball is dead when the batter is out ${wicketType}, so no ${extraType} runs can be added`);
  }
  if (extraType === "wide" && extras !== 1) {
    throw new ScoringError(`Only the one-run wide penalty can be added when the batter is out ${wicketType}`);
  }
}

// Off a no-ball a batter can only be out in these ways, and so on the free hit that follows it.
const FREE_HIT_WICKETS = ["run out", "obstructing the field", "hit the ball twice"];

function assertFreeHitWicket(wicketType) {
  if (!FREE_HIT_WICKETS.includes(wicketType)) {
    throw new ScoringError(`This ball is a free hit: the batter can only be out run out, obstructing the field or hitting the ball twice, not ${wicketType}`);
  }
}

/**
 * Is the next delivery a free hit? Pass the extra types of the deliveries bowled so far, newest first.
 * A no-ball gives a free hit. A wide bowled on a free hit does not use it up, so the free hit carries on
 * through wides until a delivery that is not a wide.
 */
function isFreeHit(extraTypesNewestFirst) {
  for (const raw of extraTypesNewestFirst) {
    const t = raw ? String(raw).trim().toLowerCase().replace(/[\s_]+/g, "-") : null;
    if (t === "wide") continue;
    return t === "no-ball";
  }
  return false;
}

/**
 * How many wickets end the innings: one fewer than the players in the side (a side of 8 is all out after 7).
 * Squads of 2-11 are used as they are, anything else (unknown, empty, too big) falls back to 10.
 */
function maxWicketsFor(squadSize) {
  const n = Number(squadSize);
  return Number.isInteger(n) && n >= 2 && n <= 11 ? n - 1 : 10;
}

/**
 * What the score means for the innings and the match. Pure, so it can be tested on its own.
 * @returns { inningsFinished, matchCompleted, chaseWon, tie, winnerTeamId, marginType, margin }
 */
function decideOutcome({ inningsNumber, target, score, wickets, legalBalls, maxWickets, maxOvers, battingTeamId, team1Id, team2Id }) {
  const inningsOver = isInningsOver(wickets, legalBalls, maxWickets, maxOvers);
  const out = { inningsFinished: inningsOver, matchCompleted: false, chaseWon: false, tie: false, winnerTeamId: null, marginType: null, margin: null };
  if (inningsNumber < 2 || !target) return out;

  if (score >= target) {
    // the chasing side got there: it wins by the wickets it still had in hand
    return { ...out, inningsFinished: true, matchCompleted: true, chaseWon: true, winnerTeamId: battingTeamId, marginType: "wickets", margin: maxWickets - wickets };
  }
  if (inningsOver) {
    if (score === target - 1) return { ...out, matchCompleted: true, tie: true, margin: 0 };
    const other = Number(battingTeamId) === Number(team1Id) ? team2Id : team1Id;
    return { ...out, matchCompleted: true, winnerTeamId: other, marginType: "runs", margin: target - 1 - score };
  }
  return out;
}

module.exports = {
  normalizeExtraType,
  isLegalDelivery,
  calculateTotalRuns,
  getRunsRun,
  normalizeNoBallRunsType,
  bowlerRunsCharged,
  shouldRotateStrike,
  getPartnershipRuns,
  normalizeWicketType,
  isBowlerWicket,
  assertWicketPossible,
  STRIKER_ONLY_WICKETS,
  ballsToOversString,
  oversToBalls,
  addBallsToOvers,
  splitBalls,
  isOverComplete,
  isInningsOver,
  runRate,
  DEAD_BALL_WICKETS,
  FREE_HIT_WICKETS,
  assertDeadBallDismissal,
  assertFreeHitWicket,
  isFreeHit,
  maxWicketsFor,
  decideOutcome,
};
