// Pass conn, always upsert rows before update
exports.updatePerformanceOnBall = async (conn, data) => {
  const { batsmanId, bowlerId, matchId, runsScored = 0, isWicket, legalDelivery, extras = 0 } = data;

  await conn.execute(
    `INSERT IGNORE INTO player_performance (player_id, match_id, runs_scored, balls_faced, fours, sixes, total_runs_conceded, overs_bowled, wickets_taken)
     VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)`, [batsmanId, matchId]
  );
  await conn.execute(
    `INSERT IGNORE INTO player_performance (player_id, match_id, runs_scored, balls_faced, fours, sixes, total_runs_conceded, overs_bowled, wickets_taken)
     VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)`, [bowlerId, matchId]
  );

  if (legalDelivery) {
    // Batsman update
    await conn.execute(
      `UPDATE player_performance SET 
         runs_scored = runs_scored + ?, 
         balls_faced = balls_faced + 1,
         fours = fours + ?,
         sixes = sixes + ?
       WHERE player_id = ? AND match_id = ?`,
      [
        runsScored,
        runsScored === 4 ? 1 : 0,
        runsScored === 6 ? 1 : 0,
        batsmanId, matchId
      ]
    );
    // Bowler update
    await conn.execute(
      `UPDATE player_performance SET 
         total_runs_conceded = total_runs_conceded + ?,
         overs_bowled = overs_bowled + 0.1,
         wickets_taken = wickets_taken + ?
       WHERE player_id = ? AND match_id = ?`,
      [runsScored + extras, isWicket ? 1 : 0, bowlerId, matchId]
    );
  }
};
