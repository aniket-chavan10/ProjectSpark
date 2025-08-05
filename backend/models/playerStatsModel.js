// Pass conn, always upsert rows before update
exports.updateStatsOnBall = async (conn, data) => {
  const { batsmanId, bowlerId, runsScored = 0, isWicket, legalDelivery, extras = 0 } = data;

  await conn.execute(
    `INSERT IGNORE INTO players_stats (player_id, total_runs, total_balls_faced, total_fours, total_sixes, total_ducks, total_runs_conceded, total_overs_bowled, total_wickets)
     VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)`, [batsmanId]
  );
  await conn.execute(
    `INSERT IGNORE INTO players_stats (player_id, total_runs, total_balls_faced, total_fours, total_sixes, total_ducks, total_runs_conceded, total_overs_bowled, total_wickets)
     VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)`, [bowlerId]
  );

  if (legalDelivery) {
    await conn.execute(
      `UPDATE players_stats SET 
         total_runs = total_runs + ?, 
         total_balls_faced = total_balls_faced + 1,
         total_fours = total_fours + ?,
         total_sixes = total_sixes + ?,
         total_ducks = total_ducks + ?
       WHERE player_id = ?`,
      [
        runsScored,
        runsScored === 4 ? 1 : 0,
        runsScored === 6 ? 1 : 0,
        runsScored === 0 ? 1 : 0, // Duck if run==0 (maybe refine per wicket)
        batsmanId
      ]
    );
    await conn.execute(
      `UPDATE players_stats SET 
         total_runs_conceded = total_runs_conceded + ?,
         total_overs_bowled = total_overs_bowled + 0.1,
         total_wickets = total_wickets + ?
       WHERE player_id = ?`,
      [runsScored + extras, isWicket ? 1 : 0, bowlerId]
    );
  }
};
