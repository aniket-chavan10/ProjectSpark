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

exports.getPlayersByTeam = async (conn, teamId) => {
  const query = `
    SELECT p.player_id, p.team_id, p.players_name, p.mobile_number, p.email, p.profile_picture, p.is_banned, p.banned_until
    FROM players_core p
    INNER JOIN teams_squad ts ON p.player_id = ts.player_id
    WHERE ts.team_id = ? AND ts.is_playing = 1
  `;

  const [rows] = await conn.execute(query, [teamId]);
  return rows;
};
