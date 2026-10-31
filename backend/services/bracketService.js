// The knock-out bracket: when a match is decided its winner (or loser, for a third-place match) goes into the
// slots of the matches that depend on it.

// Fill the slots of the next matches with the winner (or, for a third-place match, the loser)
// of the match that just finished. Only the direct next matches are touched.
async function advanceBracket(conn, matchId, winnerTeamId, loserTeamId) {
  const [[tm]] = await conn.execute(`SELECT id FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
  if (!tm) return;
  const [dependents] = await conn.execute(
    `SELECT id, dependent_match1_id, dependent_match1_type, dependent_match2_id, dependent_match2_type
     FROM tournament_matches WHERE dependent_match1_id = ? OR dependent_match2_id = ?`,
    [tm.id, tm.id]
  );
  for (const d of dependents) {
    if (Number(d.dependent_match1_id) === Number(tm.id)) {
      await conn.execute(`UPDATE tournament_matches SET team1_id = ? WHERE id = ?`, [d.dependent_match1_type === "loser" ? loserTeamId : winnerTeamId, d.id]);
    }
    if (Number(d.dependent_match2_id) === Number(tm.id)) {
      await conn.execute(`UPDATE tournament_matches SET team2_id = ? WHERE id = ?`, [d.dependent_match2_type === "loser" ? loserTeamId : winnerTeamId, d.id]);
    }
  }
}

module.exports = { advanceBracket };
