exports.getNextBallPosition = async (conn, inningId) => {
  const [rows] = await conn.execute(
    `SELECT over_number, ball_number, legal_delivery
     FROM balls 
     WHERE inning_id = ?
     ORDER BY ball_id DESC 
     LIMIT 1`,
    [inningId]
  );
  if (rows.length === 0) return { overNumber: 0, ballNumber: 1 };
  const last = rows[0];
  if (last.legal_delivery === 1) {
    if (last.ball_number === 6) return { overNumber: last.over_number + 1, ballNumber: 1 };
    return { overNumber: last.over_number, ballNumber: last.ball_number + 1 };
  }
  return { overNumber: last.over_number, ballNumber: last.ball_number };
};

// Remove bowler after exactly 6th legal delivery in an over
exports.checkAndUnsetBowlerIfOverCompleted = async (conn, inningId, overNumber) => {
  const [[result]] = await conn.execute(
    `SELECT COUNT(*) AS legalBalls
       FROM balls
      WHERE inning_id = ? AND over_number = ? AND legal_delivery = 1`,
    [inningId, overNumber]
  );
  if (result.legalBalls === 6) {
    await conn.execute(
      `UPDATE live_scorecards SET bowler_id = NULL WHERE inning_id = ?`,
      [inningId]
    );
  }
};

