const db = require("../dbconfigure");

exports.areBothPlayersFromTeam = async (teamId, player1Id, player2Id) => {
  const [rows] = await db.execute(
    `SELECT player_id FROM players_core WHERE team_id = ? AND player_id IN (?, ?)`,
    [teamId, player1Id, player2Id]
  );
  return rows.length === 2;
};

exports.isPlayerFromTeam = async (teamId, playerId) => {
  const [rows] = await db.execute(
    `SELECT player_id FROM players_core WHERE team_id = ? AND player_id = ?`,
    [teamId, playerId]
  );
  return rows.length > 0;
};
