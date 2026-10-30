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
function getRunsRun(runsScored, extras, extraType) {
  const t = normalizeExtraType(extraType);
  if (t === "wide") return Math.max((extras || 0) - 1, 0);
  if (t === "bye" || t === "leg-bye") return extras || 0;
  return runsScored || 0;
}

/** True when an odd number of runs was run, so the batters changed ends. */
function shouldRotateStrike(runsScored, extras, extraType /* , isLegal (unused, kept for callers) */) {
  return getRunsRun(runsScored, extras, extraType) % 2 === 1;
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

module.exports = {
  normalizeExtraType,
  isLegalDelivery,
  calculateTotalRuns,
  getRunsRun,
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
};
