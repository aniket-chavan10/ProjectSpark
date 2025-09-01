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

const safe = (val) => (val === undefined ? null : val);

exports.revertPerformanceOnBall = async (conn, lastBall) => {
  const {
    batsman_id: batsmanId,
    bowler_id: bowlerId,
    runs_scored: runsScored = 0,
    is_wicket: isWicket,
    legal_delivery: legalDelivery,
    extras = 0,
    match_id: matchId,
  } = lastBall;

  if (legalDelivery) {
    await conn.execute(
      `UPDATE player_performance SET 
         runs_scored = runs_scored - ?,
         balls_faced = GREATEST(balls_faced - 1, 0),
         fours = GREATEST(fours - ?, 0),
         sixes = GREATEST(sixes - ?, 0)
       WHERE player_id = ? AND match_id = ?`,
      [
        safe(runsScored),
        runsScored === 4 ? 1 : 0,
        runsScored === 6 ? 1 : 0,
        safe(batsmanId),
        safe(matchId),
      ]
    );

    await conn.execute(
      `UPDATE player_performance SET 
         total_runs_conceded = GREATEST(total_runs_conceded - ?, 0),
         overs_bowled = GREATEST(overs_bowled - 0.1, 0),
         wickets_taken = GREATEST(wickets_taken - ?, 0)
       WHERE player_id = ? AND match_id = ?`,
      [safe(runsScored + extras), isWicket ? 1 : 0, safe(bowlerId), safe(matchId)]
    );
  }
};







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
