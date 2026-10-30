const { ScoringError } = require("../utils/errors");
const { ballsToOversString, isInningsOver } = require("../utils/cricketRules/cricketRules");

const MAX_WICKETS = 10;

/**
 * Close the current innings and hand over to the next one.
 * The innings must really be finished (all out or all overs bowled) unless the scorer
 * ends it early on purpose with `forceEnd` (declaration, rain, not enough players ...).
 */
exports.switchInnings = async (conn, { matchId, currentInningId, forceEnd = false }) => {
  const [[current]] = await conn.execute(
    `SELECT inning_id, match_id, innings_number, total_runs, wickets, balls_bowled, status
     FROM innings WHERE inning_id = ? LIMIT 1 FOR UPDATE`,
    [currentInningId]
  );
  if (!current) throw new ScoringError("Current innings not found", 404);
  if (Number(current.match_id) !== Number(matchId)) throw new ScoringError("Innings does not belong to this match");

  const [[match]] = await conn.execute(`SELECT total_overs, status FROM matches WHERE match_id = ? LIMIT 1`, [matchId]);
  if (!match) throw new ScoringError("Match not found", 404);
  if (match.status === "completed") throw new ScoringError("Match is already completed", 409);

  const ballsBowled = Number(current.balls_bowled || 0);
  const finished = isInningsOver(Number(current.wickets), ballsBowled, MAX_WICKETS, match.total_overs || 5);
  if (!finished && !forceEnd) {
    throw new ScoringError("Innings is not finished yet (send forceEnd: true to end it early)", 409);
  }

  const nextInningsNumber = current.innings_number + 1;
  const [[nextInning]] = await conn.execute(`SELECT inning_id FROM innings WHERE match_id = ? AND innings_number = ?`, [
    matchId,
    nextInningsNumber,
  ]);
  if (!nextInning) throw new ScoringError("Next innings not found", 404);

  // Final figures come from the ball count, not from a display string
  await conn.execute(`UPDATE innings SET overs = ?, status = 'completed' WHERE inning_id = ?`, [
    ballsToOversString(ballsBowled),
    currentInningId,
  ]);

  // The chase target follows the first innings total however the innings ended
  if (current.innings_number === 1) {
    await conn.execute(`UPDATE matches SET target_score = ? WHERE match_id = ?`, [Number(current.total_runs) + 1, matchId]);
  }

  // Batsmen and bowler of the next innings are left unset for the scorer to choose
  return { newInningId: nextInning.inning_id };
};
