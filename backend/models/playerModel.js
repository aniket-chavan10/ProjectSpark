exports.getPlayersByIds = async (conn, playerIds = []) => {
  if (playerIds.length === 0) return [];

  const placeholders = playerIds.map(() => "?").join(",");

  const query = `
    SELECT player_id, team_id, players_name, mobile_number, email, profile_picture, is_banned, banned_until
    FROM players_core
    WHERE player_id IN (${placeholders})
  `;

  const [rows] = await conn.execute(query, playerIds);

  return rows;
};
