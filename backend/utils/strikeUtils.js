exports.rotateStrike = ({ runsScored, legalDelivery, ballsInCurrentOver, strikerId, nonStrikerId }) => {
  const isLastBall = legalDelivery && ballsInCurrentOver === 6; // corrected: 6 balls = end of over
  const oddRuns = runsScored % 2 !== 0;
  const shouldSwapStrike = oddRuns !== isLastBall;

  console.log(`[rotateStrike] runs: ${runsScored}, legal: ${legalDelivery}, ball# (1-based): ${ballsInCurrentOver}, isLastBall: ${isLastBall}, oddRuns: ${oddRuns}, swap: ${shouldSwapStrike}`);
  console.log(`[rotateStrike] BEFORE - striker: ${strikerId}, non-striker: ${nonStrikerId}`);
  console.log(`[rotateStrike] AFTER  - striker: ${shouldSwapStrike ? nonStrikerId : strikerId}, non-striker: ${shouldSwapStrike ? strikerId : nonStrikerId}`);

  return shouldSwapStrike
    ? { strikerId: nonStrikerId, nonStrikerId: strikerId }
    : { strikerId, nonStrikerId };
};
