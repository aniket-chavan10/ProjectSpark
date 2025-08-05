const db = require("../dbconfigure");
exports.getTeamsByMatchId = async (matchId) => {
  const [rows] = await db.execute(
    `SELECT team1_id, team2_id FROM matches WHERE match_id = ?`,
    [matchId]
  );
  return rows[0];
};

exports.setTossResult = async (matchId, tossWinnerId, tossDecision) => {
  const [result] = await db.execute(
    `UPDATE matches
     SET toss_winner_id = ?, toss_decision = ?
     WHERE match_id = ?`,
    [tossWinnerId, tossDecision, matchId]
  );
  return result;
};

exports.getMatchDetails = async (conn, matchId) => {
  const [rows] = await conn.execute(
    `SELECT match_id, tournament_id, match_no, team1_id, team2_id, date, venue, toss_winner_id,
            toss_decision, total_overs, winner_team_id, result, status, is_super_over, target_score
     FROM matches WHERE match_id = ?`,
    [matchId]
  );
  return rows[0] || null;
};
