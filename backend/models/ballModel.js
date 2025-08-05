exports.insertBall = async (conn, data) => {
  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_number, ball_number, batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.inningId, data.overNumber, data.ballNumber, data.batsmanId, data.bowlerId, data.runsScored,
      data.isWicket, data.wicketType, data.dismissedPlayerId, data.fielderId,
      data.extras, data.extraType, data.legalDelivery ? 1 : 0, data.isRetiredHurt,
      data.shotType, data.ballOutcome, data.wagonWheelRegion
    ]
  );
};

exports.getRecentBallsByInnings = async (conn, inningId, limit = 6) => {
  // Ensure limit is a safe integer and within reasonable bounds
  const safeLimit = Number(limit);
  if (isNaN(safeLimit) || safeLimit <= 0) {
    throw new Error("Invalid limit specified");
  }

  const query = `
    SELECT ball_id, inning_id, over_number, ball_number, batsman_id, bowler_id,
           runs_scored, is_wicket, wicket_type, dismissed_player_id, fielder_id, extras,
           extra_type, legal_delivery, ball_timestamp, is_retired_hurt, shot_type,
           ball_outcome, wagon_wheel_region
    FROM balls
    WHERE inning_id = ?
    ORDER BY over_number DESC, ball_number DESC
    LIMIT ${safeLimit}
  `;

  const [rows] = await conn.execute(query, [inningId]);
  return rows;
};

exports.getWicketFallByInnings = async (conn, inningId) => {
  const query = `
    SELECT over_number, ball_number, batsman_id, bowler_id, wicket_type, dismissed_player_id, fielder_id, ball_timestamp
    FROM balls
    WHERE inning_id = ? AND is_wicket = 1
    ORDER BY over_number, ball_number
  `;
  const [rows] = await conn.execute(query, [inningId]);
  return rows;
};
