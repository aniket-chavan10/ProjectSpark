// Per-match batting / bowling figures.
// Rules: wides are not balls faced; wides and no-balls are charged to the bowler, byes and
// leg-byes are not; run outs / handled ball etc. are not bowler wickets; overs are counted in
// legal balls (3.4 = 3 overs 4 balls) and never by adding 0.1.

const { addBallsToOvers, isBowlerWicket, bowlerRunsCharged } = require("../utils/cricketRules/cricketRules");

const safe = (val) => (val === undefined ? null : val);

const ensureRow = (conn, playerId, matchId) =>
  conn.execute(
    `INSERT IGNORE INTO player_performance (player_id, match_id, runs_scored, balls_faced, fours, sixes, total_runs_conceded, overs_bowled, wickets_taken)
     VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)`,
    [playerId, matchId]
  );

const getOversBowled = async (conn, playerId, matchId) => {
  const [rows] = await conn.execute(
    `SELECT overs_bowled FROM player_performance WHERE player_id = ? AND match_id = ?`,
    [playerId, matchId]
  );
  return rows && rows[0] ? Number(rows[0].overs_bowled) || 0 : 0;
};

/** Runs a player has scored in this match so far. */
exports.getMatchRuns = async (conn, playerId, matchId) => {
  const [rows] = await conn.execute(
    `SELECT runs_scored FROM player_performance WHERE player_id = ? AND match_id = ?`,
    [playerId, matchId]
  );
  return rows && rows[0] ? Number(rows[0].runs_scored) || 0 : 0;
};

/** Runs charged to the bowler for this delivery. */
const bowlerRuns = (runsScored, extras, extraType, noBallRunsType) => bowlerRunsCharged(runsScored, extras, extraType, noBallRunsType);

exports.bowlerRuns = bowlerRuns;

exports.updatePerformanceOnBall = async (conn, data) => {
  const {
    batsmanId,
    bowlerId,
    matchId,
    runsScored = 0,
    extras = 0,
    extraType = null,
    noBallRunsType = null,
    legalDelivery,
    isWicket,
    wicketType,
  } = data;

  await ensureRow(conn, batsmanId, matchId);
  await ensureRow(conn, bowlerId, matchId);

  // Batter: bat runs always count (also off a no-ball); a wide is not a ball faced.
  await conn.execute(
    `UPDATE player_performance SET
       runs_scored = runs_scored + ?,
       balls_faced = balls_faced + ?,
       fours = fours + ?,
       sixes = sixes + ?
     WHERE player_id = ? AND match_id = ?`,
    [
      runsScored,
      extraType === "wide" ? 0 : 1,
      runsScored === 4 ? 1 : 0,
      runsScored === 6 ? 1 : 0,
      batsmanId,
      matchId,
    ]
  );

  // Bowler
  const newOvers = legalDelivery
    ? addBallsToOvers(await getOversBowled(conn, bowlerId, matchId), 1)
    : await getOversBowled(conn, bowlerId, matchId);
  await conn.execute(
    `UPDATE player_performance SET
       total_runs_conceded = total_runs_conceded + ?,
       overs_bowled = ?,
       wickets_taken = wickets_taken + ?
     WHERE player_id = ? AND match_id = ?`,
    [bowlerRuns(runsScored, extras, extraType, noBallRunsType), newOvers, isWicket && isBowlerWicket(wicketType) ? 1 : 0, bowlerId, matchId]
  );
};

exports.revertPerformanceOnBall = async (conn, lastBall, matchId) => {
  const {
    batsman_id: batsmanId,
    bowler_id: bowlerId,
    runs_scored: runsScored = 0,
    is_wicket: isWicket,
    wicket_type: wicketType,
    legal_delivery: legalDelivery,
    extra_type: extraType = null,
    nb_runs_type: noBallRunsType = null,
    extras = 0,
  } = lastBall;

  await conn.execute(
    `UPDATE player_performance SET
       runs_scored = GREATEST(runs_scored - ?, 0),
       balls_faced = GREATEST(balls_faced - ?, 0),
       fours = GREATEST(fours - ?, 0),
       sixes = GREATEST(sixes - ?, 0)
     WHERE player_id = ? AND match_id = ?`,
    [
      safe(runsScored),
      extraType === "wide" ? 0 : 1,
      runsScored === 4 ? 1 : 0,
      runsScored === 6 ? 1 : 0,
      safe(batsmanId),
      safe(matchId),
    ]
  );

  const newOvers = legalDelivery
    ? addBallsToOvers(await getOversBowled(conn, bowlerId, matchId), -1)
    : await getOversBowled(conn, bowlerId, matchId);
  await conn.execute(
    `UPDATE player_performance SET
       total_runs_conceded = GREATEST(total_runs_conceded - ?, 0),
       overs_bowled = ?,
       wickets_taken = GREATEST(wickets_taken - ?, 0)
     WHERE player_id = ? AND match_id = ?`,
    [
      bowlerRuns(runsScored, extras, extraType, noBallRunsType),
      newOvers,
      isWicket && isBowlerWicket(wicketType) ? 1 : 0,
      safe(bowlerId),
      safe(matchId),
    ]
  );
};

/** +1 / -1 maiden over for the bowler. */
exports.adjustMaidens = async (conn, bowlerId, matchId, delta) => {
  await conn.execute(
    `UPDATE player_performance SET maiden_overs = GREATEST(COALESCE(maiden_overs, 0) + ?, 0)
     WHERE player_id = ? AND match_id = ?`,
    [delta, bowlerId, matchId]
  );
};

exports.ensureRow = ensureRow;

exports.getPerformanceStatsByMatch = async (conn, matchId) => {
  const [rows] = await conn.execute(
    `SELECT
       player_id,
       runs_scored,
       balls_faced,
       fours,
       sixes,
       strike_rate,
       total_runs_conceded,
       wickets_taken,
       overs_bowled,
       maiden_overs,
       economy_rate
     FROM player_performance
     WHERE match_id = ?`,
    [matchId]
  );
  return rows;
};
