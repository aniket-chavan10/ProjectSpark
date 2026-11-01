exports.insertBall = async (conn, data) => {
  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_number, ball_number, batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region, nb_runs_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.inningId, data.overNumber, data.ballNumber, data.batsmanId, data.bowlerId, data.runsScored,
      data.isWicket, data.wicketType, data.dismissedPlayerId, data.fielderId,
      data.extras, data.extraType, data.legalDelivery ? 1 : 0, data.isRetiredHurt,
      data.shotType, data.ballOutcome, data.wagonWheelRegion, data.noBallRunsType || null
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
           ball_outcome, wagon_wheel_region, nb_runs_type
    FROM balls
    WHERE inning_id = ?
    ORDER BY over_number DESC, ball_number DESC
    LIMIT ${safeLimit}
  `;

  const [rows] = await conn.execute(query, [inningId]);
  return rows;
};

// legal_balls_upto / score_at_fall are measured up to and including the wicket ball.
exports.getWicketFallByInnings = async (conn, inningId) => {
  const query = `
    SELECT ball_id, over_number, ball_number, batsman_id, bowler_id, wicket_type, dismissed_player_id, fielder_id, ball_timestamp,
      (SELECT COUNT(*) FROM balls b2
         WHERE b2.inning_id = balls.inning_id AND b2.ball_id <= balls.ball_id AND b2.legal_delivery = 1) AS legal_balls_upto,
      (SELECT COALESCE(SUM(b3.runs_scored + b3.extras), 0) FROM balls b3
         WHERE b3.inning_id = balls.inning_id AND b3.ball_id <= balls.ball_id) AS score_at_fall
    FROM balls
    WHERE inning_id = ? AND is_wicket = 1
    ORDER BY ball_id
  `;
  const [rows] = await conn.execute(query, [inningId]);
  return rows;
};

// Extras per type for an innings: [{ extra_type: 'wide', total: 4 }, ...]
exports.getExtrasBreakdownByInnings = async (conn, inningId) => {
  const [rows] = await conn.execute(
    `SELECT extra_type, COALESCE(SUM(CASE WHEN extra_type = 'no-ball' AND nb_runs_type IS NOT NULL THEN 1 ELSE extras END), 0) AS total
     FROM balls
     WHERE inning_id = ? AND extra_type IS NOT NULL
     GROUP BY extra_type
     UNION ALL
     SELECT nb_runs_type AS extra_type, COALESCE(SUM(extras - 1), 0) AS total
     FROM balls
     WHERE inning_id = ? AND extra_type = 'no-ball' AND nb_runs_type IS NOT NULL
     GROUP BY nb_runs_type`,
    [inningId, inningId]
  );
  return rows;
};

// A retirement is stored in the ball log but is not a delivery: not legal and no extra type.
// Every real delivery is either legal or a wide / no-ball.

// Id of the newest ball of an innings (0 when nothing was bowled). Clients send it back so a stale
// screen or a double tap cannot add a ball on top of a scoreboard that has moved on.
exports.getLastBallId = async (conn, inningId) => {
  const [[row]] = await conn.execute(`SELECT COALESCE(MAX(ball_id), 0) AS id FROM balls WHERE inning_id = ?`, [inningId]);
  return Number(row.id);
};

// Every ball of an innings in the order it was bowled (for the full scorecard).
exports.getAllBallsByInnings = async (conn, inningId) => {
  const [rows] = await conn.execute(`SELECT * FROM balls WHERE inning_id = ? ORDER BY ball_id`, [inningId]);
  return rows;
};

// Batters who retired hurt in this innings (not out, they may come back when a wicket falls).
exports.getRetiredHurtByInnings = async (conn, inningId) => {
  const [rows] = await conn.execute(
    `SELECT DISTINCT dismissed_player_id FROM balls WHERE inning_id = ? AND is_retired_hurt = 1 AND dismissed_player_id IS NOT NULL`,
    [inningId]
  );
  return rows.map((r) => Number(r.dismissed_player_id));
};

// Extra types of the latest deliveries, newest first (null for a normal delivery). Used for the free hit.
exports.getRecentExtraTypes = async (conn, inningId, limit = 30) => {
  const [rows] = await conn.execute(
    `SELECT extra_type FROM balls
     WHERE inning_id = ? AND NOT (legal_delivery = 0 AND extra_type IS NULL)
     ORDER BY ball_id DESC LIMIT ${Number(limit)}`,
    [inningId]
  );
  return rows.map((r) => r.extra_type);
};
