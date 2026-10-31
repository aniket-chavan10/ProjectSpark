// Final positions of a tournament (1st to 4th), saved when the final / third-place match completes,
// and the "who won" notification that goes to every team.

const { computeStandings } = require("../utils/tournamentFormat");
const notifications = require("./notificationService");

/** Work out the positions from the bracket and save them. Removes them again when they no longer hold. */
exports.settle = async (conn, tournamentId) => {
  const [matches] = await conn.query(
    `SELECT match_no, stage, status, team1_id, team2_id, winner_team_id FROM tournament_matches WHERE tournament_id = ? ORDER BY match_no`,
    [tournamentId]
  );
  const positions = computeStandings(matches);
  await conn.query(`DELETE FROM tournament_results WHERE tournament_id = ?`, [tournamentId]);
  if (!positions.length) {
    await notifications.withdraw(conn, `champion:${tournamentId}`);
    return { positions: [] };
  }
  await conn.query(`INSERT INTO tournament_results (tournament_id, position, team_id, decided_by) VALUES ?`, [
    positions.map((p) => [tournamentId, p.position, p.teamId, p.decidedBy]),
  ]);

  const champion = positions.find((p) => p.position === 1);
  if (champion) {
    const [[t]] = await conn.query(`SELECT name FROM tournaments WHERE id = ?`, [tournamentId]);
    const [[team]] = await conn.query(`SELECT team_name FROM teams WHERE id = ?`, [champion.teamId]);
    const runnerUp = positions.find((p) => p.position === 2);
    const [[second]] = runnerUp ? await conn.query(`SELECT team_name FROM teams WHERE id = ?`, [runnerUp.teamId]) : [[null]];
    // a re-decided final replaces the old announcement
    await notifications.withdraw(conn, `champion:${tournamentId}`);
    await notifications.notifyTeams(conn, await notifications.allTeamIds(conn), {
      type: "tournament_winner",
      title: `${team ? team.team_name : "A team"} won ${t ? t.name : "the tournament"}`,
      body: second ? `Runner-up: ${second.team_name}. See the full results and scorecards.` : "See the full results and scorecards.",
      link: `tournament:${tournamentId}`,
      dedupeKey: `champion:${tournamentId}`,
    });
  }
  return { positions };
};
