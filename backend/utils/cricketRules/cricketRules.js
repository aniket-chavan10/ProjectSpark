// utils/cricketRules.js

/**
 * Check if a delivery is legal (not wide or no-ball).
 * @param {string|null} extraType 
 * @returns {boolean}
 */
function isLegalDelivery(extraType) {
  if (!extraType) return true;
  const lowerExtra = extraType.toLowerCase();
  return !(lowerExtra === "wide" || lowerExtra === "no-ball");
}

/**
 * Calculate total runs for a ball (batsman runs + extras).
 * @param {number} runsScored 
 * @param {number} extras 
 * @returns {number}
 */
function calculateTotalRuns(runsScored, extras) {
  return (runsScored || 0) + (extras || 0);
}

/**
 * Determine if strike rotation should occur based on runs, extras and delivery type.
 * @param {number} runsScored 
 * @param {number} extras 
 * @param {string|null} extraType 
 * @param {boolean} isLegal 
 * @returns {boolean}
 */
function shouldRotateStrike(runsScored, extras, extraType, isLegal) {
  const lowerExtra = extraType ? extraType.toLowerCase() : null;
  const rotateOnRuns = ((runsScored % 2) === 1) && (isLegal || lowerExtra === "no-ball");
  const rotateOnExtras = ((extras % 2) === 1) && (lowerExtra === "bye" || lowerExtra === "leg-bye");
  return rotateOnRuns || rotateOnExtras;
}

/**
 * Update legal balls in over and overs count based on current values and legality of delivery.
 * @param {number} currentBallsInOver 
 * @param {number} currentOvers 
 * @param {boolean} isLegalDelivery 
 * @returns {object} { newBallsInOver: number, newOvers: number }
 */
function updateBallAndOverCount(currentBallsInOver, currentOvers, isLegalDelivery) {
  let newBalls = currentBallsInOver;
  let newOvers = currentOvers;

  if (isLegalDelivery) {
    newBalls = (currentBallsInOver + 1) % 6;
    newOvers += 0.1;
    if (newBalls === 0) {
      // Round overs e.g. 4.6 → 5.0
      newOvers = Math.round((newOvers + 0.4) * 10) / 10;
    }
  }

  return { newBallsInOver: newBalls, newOvers };
}

/**
 * Check if innings is over based on wickets and overs completed.
 * @param {number} wickets 
 * @param {number} legalOversCount 
 * @param {number} maxWickets 
 * @param {number} maxOvers 
 * @returns {boolean}
 */
function isInningsOver(wickets, legalOversCount, maxWickets, maxOvers) {
  return wickets >= maxWickets || Math.floor(legalOversCount) >= maxOvers;
}

/**
 * Determine if over is complete based on legal balls bowled.
 * @param {number} legalBallsInOver 
 * @returns {boolean}
 */
function isOverComplete(legalBallsInOver) {
  return legalBallsInOver === 0;
}

/**
 * Calculate partnership runs (batsman runs + extras).
 * @param {number} runsScored 
 * @param {number} extras 
 * @returns {number}
 */
function getPartnershipRuns(runsScored, extras) {
  return calculateTotalRuns(runsScored, extras);
}

module.exports = {
  isLegalDelivery,
  calculateTotalRuns,
  shouldRotateStrike,
  updateBallAndOverCount,
  isInningsOver,
  isOverComplete,
  getPartnershipRuns,
};
