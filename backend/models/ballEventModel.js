const safeGet = (data, key, fallback = null) => {
  const value = data[key];
  if (value === undefined) {
    console.error(`❌ '${key}' is undefined! Replacing with NULL.`);
    return fallback;
  }
  return value;
};

exports.insertBallEvent = async (conn, data) => {
  const values = [
    safeGet(data, 'inning_id'),
    safeGet(data, 'over_number', 0),
    safeGet(data, 'ball_number', 0),
    safeGet(data, 'batsman_id'),
    safeGet(data, 'bowler_id'),
    safeGet(data, 'runs_scored', 0),
    safeGet(data, 'is_wicket', 0),
    safeGet(data, 'wicket_type'),
    safeGet(data, 'dismissed_player_id'),
    safeGet(data, 'fielder_id'),
    safeGet(data, 'extras', 0),
    safeGet(data, 'extra_type'),
    safeGet(data, 'legal_delivery', 1),
    safeGet(data, 'is_retired_hurt', 0),
    safeGet(data, 'shot_type'),
    safeGet(data, 'ball_outcome'),
    safeGet(data, 'wagon_wheel_region')
  ];

  console.log("✅ Ball Insert Values:", values);
  console.log("✅ Total Insert Values:", values.length);

  if (values.includes(undefined)) {
    throw new Error("🚨 ERROR: Insert values contain undefined. Aborting.");
  }

  const sql = `
    INSERT INTO balls (
      inning_id,
      over_number,
      ball_number,
      batsman_id,
      bowler_id,
      runs_scored,
      is_wicket,
      wicket_type,
      dismissed_player_id,
      fielder_id,
      extras,
      extra_type,
      legal_delivery,
      is_retired_hurt,
      shot_type,
      ball_outcome,
      wagon_wheel_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [res] = await conn.execute(sql, values);
  return res.insertId;
};


