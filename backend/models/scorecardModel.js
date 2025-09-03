const db = require("../dbconfigure")

exports.createScorecard = async ({ teamId, inningId, matchId }) => {
  const [result] = await db.execute(
    `INSERT INTO live_scorecards (
      team_id, current_score, current_wickets, legal_over_count,
      legal_balls_in_over, batsman1_id, batsman2_id, bowler_id,
      partnership_runs, current_run_rate, inning_id, match_id,
      total_overs, target_score
    ) VALUES (?, 0, 0, 0.0, 0, NULL, NULL, NULL, 0, 0.0, ?, ?, 5, NULL)`,
    [teamId, inningId, matchId]
  );
  return result.insertId;
};
