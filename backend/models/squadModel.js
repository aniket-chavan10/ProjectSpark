// Who plays in a match. After the toss the squad of each team is frozen in match_squads. Matches that began
// before squads existed fall back to the old teams_squad table (is_playing = 1), so nothing breaks.

const { maxWicketsFor } = require("../utils/cricketRules/cricketRules");
const playerModel = require("./playerModel");

/** The playing XI of a team in a live match, in batting order. */
exports.getPlayingXI = async (conn, matchId, teamId) => {
  const [rows] = await conn.execute(
    `SELECT p.player_id, p.team_id, p.players_name, p.profile_picture, ms.jersey_number, ms.is_captain, ms.is_keeper
     FROM match_squads ms
     JOIN tournament_matches tm ON tm.id = ms.tournament_match_id
     JOIN players_core p ON p.player_id = ms.player_id
     WHERE tm.match_id = ? AND ms.team_id = ? AND ms.role = 'playing'
     ORDER BY ms.batting_order, p.player_id`,
    [matchId, teamId]
  );
  return rows.length ? rows : playerModel.getPlayersByTeam(conn, teamId);
};

/** Wickets that end an innings: one fewer than the players in the XI (10 when no XI is recorded). */
exports.getMaxWickets = async (conn, teamId, matchId) => {
  if (matchId) {
    const [[row]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id
       WHERE tm.match_id = ? AND ms.team_id = ? AND ms.role = 'playing'`,
      [matchId, teamId]
    );
    if (row && Number(row.n) > 0) return maxWicketsFor(Number(row.n));
  }
  const [[legacy]] = await conn.execute(`SELECT COUNT(*) AS n FROM teams_squad WHERE team_id = ? AND is_playing = 1`, [teamId]);
  return maxWicketsFor(legacy ? Number(legacy.n) : 0);
};

/** Is this player in the playing XI of the team for this match? (Reserves and other players are not.) */
exports.isInPlayingXI = async (conn, matchId, teamId, playerId) => {
  const [[xi]] = await conn.execute(
    `SELECT COUNT(*) AS n FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id
     WHERE tm.match_id = ? AND ms.team_id = ? AND ms.role = 'playing'`,
    [matchId, teamId]
  );
  if (xi && Number(xi.n) > 0) {
    const [rows] = await conn.execute(
      `SELECT ms.player_id FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id
       WHERE tm.match_id = ? AND ms.team_id = ? AND ms.role = 'playing' AND ms.player_id = ?`,
      [matchId, teamId, playerId]
    );
    return rows.length > 0;
  }
  // an older match without a frozen squad: any player of the team
  const [rows] = await conn.execute(`SELECT player_id FROM players_core WHERE team_id = ? AND player_id = ?`, [teamId, playerId]);
  return rows.length > 0;
};
