// Career counters. Same rules as playerPerformanceModel (see the header there).
// A duck is counted when a batter is OUT for 0 in a match, not on every dot ball.

const { addBallsToOvers, isBowlerWicket } = require("../utils/cricketRules/cricketRules");
const { bowlerRuns } = require("./playerPerformanceModel");

const safe = (val) => (val === undefined ? null : val);

const ensureRow = (conn, playerId) =>
  conn.execute(
    `INSERT IGNORE INTO players_stats (player_id, total_runs, total_balls_faced, total_fours, total_sixes, total_ducks, total_runs_conceded, total_overs_bowled, total_wickets)
     VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)`,
    [playerId]
  );

const getOversBowled = async (conn, playerId) => {
  const [rows] = await conn.execute(`SELECT total_overs_bowled FROM players_stats WHERE player_id = ?`, [playerId]);
  return rows && rows[0] ? Number(rows[0].total_overs_bowled) || 0 : 0;
};

/**
 * @param data.dismissedRuns runs the dismissed batter has in this match INCLUDING this ball
 *                           (null when nobody was dismissed)
 */
exports.updateStatsOnBall = async (conn, data) => {
  const {
    batsmanId,
    bowlerId,
    runsScored = 0,
    extras = 0,
    extraType = null,
    legalDelivery,
    isWicket,
    wicketType,
    dismissedPlayerId = null,
    dismissedRuns = null,
  } = data;

  await ensureRow(conn, batsmanId);
  await ensureRow(conn, bowlerId);

  await conn.execute(
    `UPDATE players_stats SET
       total_runs = total_runs + ?,
       total_balls_faced = total_balls_faced + ?,
       total_fours = total_fours + ?,
       total_sixes = total_sixes + ?
     WHERE player_id = ?`,
    [runsScored, extraType === "wide" ? 0 : 1, runsScored === 4 ? 1 : 0, runsScored === 6 ? 1 : 0, batsmanId]
  );

  if (isWicket && dismissedPlayerId && dismissedRuns === 0) {
    await ensureRow(conn, dismissedPlayerId);
    await conn.execute(`UPDATE players_stats SET total_ducks = total_ducks + 1 WHERE player_id = ?`, [dismissedPlayerId]);
  }

  const newOvers = legalDelivery ? addBallsToOvers(await getOversBowled(conn, bowlerId), 1) : await getOversBowled(conn, bowlerId);
  await conn.execute(
    `UPDATE players_stats SET
       total_runs_conceded = total_runs_conceded + ?,
       total_overs_bowled = ?,
       total_wickets = total_wickets + ?
     WHERE player_id = ?`,
    [bowlerRuns(runsScored, extras, extraType), newOvers, isWicket && isBowlerWicket(wicketType) ? 1 : 0, bowlerId]
  );
};

/** Mirror of updateStatsOnBall for an undone ball (`dismissedRuns` read BEFORE the undo). */
exports.revertStatsOnBall = async (conn, lastBall, { dismissedRuns = null } = {}) => {
  const {
    batsman_id: batsmanId,
    bowler_id: bowlerId,
    runs_scored: runsScored = 0,
    is_wicket: isWicket,
    wicket_type: wicketType,
    dismissed_player_id: dismissedPlayerId,
    legal_delivery: legalDelivery,
    extra_type: extraType = null,
    extras = 0,
  } = lastBall;

  await conn.execute(
    `UPDATE players_stats SET
       total_runs = GREATEST(total_runs - ?, 0),
       total_balls_faced = GREATEST(total_balls_faced - ?, 0),
       total_fours = GREATEST(total_fours - ?, 0),
       total_sixes = GREATEST(total_sixes - ?, 0)
     WHERE player_id = ?`,
    [safe(runsScored), extraType === "wide" ? 0 : 1, runsScored === 4 ? 1 : 0, runsScored === 6 ? 1 : 0, safe(batsmanId)]
  );

  if (isWicket && dismissedPlayerId && dismissedRuns === 0) {
    await conn.execute(`UPDATE players_stats SET total_ducks = GREATEST(total_ducks - 1, 0) WHERE player_id = ?`, [
      dismissedPlayerId,
    ]);
  }

  const newOvers = legalDelivery ? addBallsToOvers(await getOversBowled(conn, bowlerId), -1) : await getOversBowled(conn, bowlerId);
  await conn.execute(
    `UPDATE players_stats SET
       total_runs_conceded = GREATEST(total_runs_conceded - ?, 0),
       total_overs_bowled = ?,
       total_wickets = GREATEST(total_wickets - ?, 0)
     WHERE player_id = ?`,
    [bowlerRuns(runsScored, extras, extraType), newOvers, isWicket && isBowlerWicket(wicketType) ? 1 : 0, safe(bowlerId)]
  );
};
