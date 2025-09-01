// Pass conn, always upsert rows before update

const safe = (val) => (val === undefined ? null : val);

exports.updateStatsOnBall = async (conn, data) => {
  const {
    batsmanId,
    bowlerId,
    runsScored = 0,
    isWicket,
    legalDelivery,
    extras = 0,
  } = data;

  await conn.execute(
    `INSERT IGNORE INTO players_stats (player_id, total_runs, total_balls_faced, total_fours, total_sixes, total_ducks, total_runs_conceded, total_overs_bowled, total_wickets)
     VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)`,
    [batsmanId]
  );
  await conn.execute(
    `INSERT IGNORE INTO players_stats (player_id, total_runs, total_balls_faced, total_fours, total_sixes, total_ducks, total_runs_conceded, total_overs_bowled, total_wickets)
     VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)`,
    [bowlerId]
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
        batsmanId,
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

exports.revertStatsOnBall = async (conn, lastBall) => {
  const {
    batsman_id: batsmanId,
    bowler_id: bowlerId,
    runs_scored: runsScored = 0,
    is_wicket: isWicket,
    legal_delivery: legalDelivery,
    extras = 0,
  } = lastBall;

  if (legalDelivery) {
    await conn.execute(
      `UPDATE players_stats SET 
         total_runs = total_runs - ?, 
         total_balls_faced = GREATEST(total_balls_faced - 1, 0),
         total_fours = GREATEST(total_fours - ?, 0),
         total_sixes = GREATEST(total_sixes - ?, 0),
         total_ducks = GREATEST(total_ducks - ?, 0)
       WHERE player_id = ?`,
      [
        safe(runsScored),
        runsScored === 4 ? 1 : 0,
        runsScored === 6 ? 1 : 0,
        runsScored === 0 ? 1 : 0,
        safe(batsmanId),
      ]
    );

    await conn.execute(
      `UPDATE players_stats SET 
         total_runs_conceded = GREATEST(total_runs_conceded - ?, 0),
         total_overs_bowled = GREATEST(total_overs_bowled - 0.1, 0),
         total_wickets = GREATEST(total_wickets - ?, 0)
       WHERE player_id = ?`,
      [safe(runsScored + extras), isWicket ? 1 : 0, safe(bowlerId)]
    );
  }
};
