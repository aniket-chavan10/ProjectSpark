const db = require("../dbconfigure");

exports.updateInitialPlayers = async ({ matchId, inningId, strikerId, nonStrikerId, bowlerId }) => {
  const [result] = await db.execute(
    `UPDATE live_scorecards
     SET batsman1_id = ?, batsman2_id = ?, on_strike_batsman_id = ?, bowler_id = ?
     WHERE match_id = ? AND inning_id = ?`,
    [strikerId, nonStrikerId, strikerId, bowlerId, matchId, inningId]
  );
  return result;
};

exports.updateScorecardOnBall = async (data) => {
  const {
    matchId,
    inningId,
    runsScored = 0,
    extras = 0,
    legalDelivery,
    isWicket,
    dismissedPlayerId,
    overNumber,
    ballNumber
  } = data;

  // ✅ Use match_id in SELECT
  const [[scorecard]] = await db.execute(
    `SELECT current_score, current_wickets, legal_over_count
     FROM live_scorecards
     WHERE match_id = ? AND inning_id = ?`,
    [matchId, inningId]
  );

  const newScore = scorecard.current_score + runsScored + extras;
  const newWickets = scorecard.current_wickets + (isWicket ? 1 : 0);
  const newOvers = legalDelivery ? calculateNewOvers(scorecard.legal_over_count) : scorecard.legal_over_count;

  // ✅ Use match_id in UPDATE
  await db.execute(
    `UPDATE live_scorecards
     SET current_score = ?, current_wickets = ?, legal_over_count = ?, last_updated = CURRENT_TIMESTAMP
     WHERE match_id = ? AND inning_id = ?`,
    [newScore, newWickets, newOvers, matchId, inningId]
  );

  // ✅ If wicket: also update last wicket info
  if (isWicket && dismissedPlayerId) {
    await db.execute(
      `UPDATE live_scorecards
       SET last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ?
       WHERE match_id = ? AND inning_id = ?`,
      [dismissedPlayerId, `${overNumber}.${ballNumber}`, "Wicket!", matchId, inningId]
    );
  }
};

exports.updateStriker = async (matchId, inningId, newStrikerId) => {
  await db.execute(
    `UPDATE live_scorecards
     SET on_strike_batsman_id = ?
     WHERE match_id = ? AND inning_id = ?`,
    [newStrikerId, matchId, inningId]
  );
};

exports.updateLiveScorecard = async (conn, updateObj) => {
  const {
    inningId, newScore, newWickets, newLegalBalls, legalOvers,
    strikerId, nonStrikerId, runsScored, overNumber, ballNumber
  } = updateObj;

  await conn.execute(
    `UPDATE live_scorecards
     SET current_score = ?, current_wickets = ?, legal_balls_in_over = ?,
         legal_over_count = ?, current_overs = ?,
         on_strike_batsman_id = ?, non_striker_batsman_id = ?,
         partnership_runs = partnership_runs + ?, last_updated = CURRENT_TIMESTAMP
     WHERE inning_id = ?`,
    [
      newScore, newWickets, newLegalBalls,
      legalOvers.toFixed(1), `${overNumber}.${ballNumber}`,
      strikerId, nonStrikerId, runsScored, inningId
    ]
  );
};

exports.unsetDismissedBatsman = async (conn, inningId, dismissedPlayerId) => {
  await conn.execute(
    `UPDATE live_scorecards
     SET 
       on_strike_batsman_id = CASE WHEN on_strike_batsman_id = ? THEN NULL ELSE on_strike_batsman_id END,
       non_striker_batsman_id = CASE WHEN non_striker_batsman_id = ? THEN NULL ELSE non_striker_batsman_id END,
       batsman1_id = CASE WHEN batsman1_id = ? THEN NULL ELSE batsman1_id END,
       batsman2_id = CASE WHEN batsman2_id = ? THEN NULL ELSE batsman2_id END
     WHERE inning_id = ?`,
    [dismissedPlayerId, dismissedPlayerId, dismissedPlayerId, dismissedPlayerId, inningId]
  );
};


exports.getLiveScorecard = async (conn, inningId) => {
  const [rows] = await conn.execute(
    `SELECT *
     FROM live_scorecards
     WHERE inning_id = ?
     LIMIT 1`,
    [inningId]
  );
  return rows[0] || null;
};

exports.getLiveScorecardsByMatch = async (conn, matchId) => {
  const [rows] = await conn.execute(
    `SELECT l.scorecard_id, l.team_id, l.current_score, l.current_wickets, l.legal_over_count, l.legal_balls_in_over,
            l.batsman1_id, l.batsman2_id, l.bowler_id, l.partnership_runs, l.last_wicket_player_id,
            l.last_wicket_over, l.last_wicket_description, l.current_run_rate, l.required_run_rate, l.last_updated,
            l.inning_id, l.total_overs, l.match_id, l.on_strike_batsman_id, l.current_overs, l.target_score,
            l.non_striker_batsman_id,
            t.team_name as team_name
     FROM live_scorecards l
     JOIN teams t ON l.team_id = t.id
     WHERE l.match_id = ?`,
    [matchId]
  );
  return rows;
};
