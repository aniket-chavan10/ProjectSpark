// Everything that follows from a match being completed (or re-opened by an undo):
// player figures, ranking points, the tournament's final positions and the notifications.
//
// These run inside the scorer's transaction but each step is isolated: if one fails (for example the
// migration has not been run yet) the result of the match is still saved, the problem is logged, and
// `rebuildAll` / the association's "recalculate" can fill the gap later. All steps are idempotent.

const playerStats = require("./playerStatsService");
const points = require("./pointsService");
const results = require("./tournamentResultsService");
const notifications = require("./notificationService");
const fixtureNotifier = require("./fixtureNotifier");
const { resultText, stageLabel } = require("../utils/resultText");

const quiet = process.env.NODE_ENV === "test";
async function step(name, fn) {
  try {
    await fn();
  } catch (err) {
    if (!quiet) console.error(`[post-match] ${name} failed:`, err.message);
  }
}

async function notifyResult(conn, matchId) {
  const [[m]] = await conn.query(
    `SELECT m.match_id, m.status, m.team1_id, m.team2_id, m.winner_team_id, m.victory_margin_type, m.victory_margin, m.decided_by, m.tournament_id,
            t1.team_name AS team1_name, t2.team_name AS team2_name, tr.name AS tournament_name, tm.stage, tm.group_name, tm.round_number
     FROM matches m LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id
     LEFT JOIN tournaments tr ON tr.id = m.tournament_id LEFT JOIN tournament_matches tm ON tm.match_id = m.match_id
     WHERE m.match_id = ?`,
    [matchId]
  );
  if (!m) return;
  const names = { [m.team1_id]: m.team1_name, [m.team2_id]: m.team2_name };
  await notifications.withdraw(conn, `result:${matchId}`);
  await notifications.notifyTeams(conn, [m.team1_id, m.team2_id], {
    type: "match_result",
    title: `${m.team1_name} vs ${m.team2_name}: ${resultText(m, names) || "result"}`,
    body: `${m.tournament_name || "Tournament"} · ${stageLabel(m.stage, m.group_name, m.round_number)}. Open Results for the scorecard.`,
    link: `match:${matchId}`,
    dedupeKey: `result:${matchId}`,
  });
}

exports.onMatchCompleted = async (conn, matchId) => {
  await step("player stats", () => playerStats.snapshotMatch(conn, matchId));
  await step("ranking points", () => points.awardForMatch(conn, matchId));
  await step("tournament results", async () => {
    const [[tm]] = await conn.query(`SELECT tournament_id, stage FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
    if (tm && (tm.stage === "final" || tm.stage === "third_place")) await results.settle(conn, tm.tournament_id);
  });
  await step("result notification", () => notifyResult(conn, matchId));
  await step("next match notification", () => fixtureNotifier.nextMatchesKnown(conn, matchId));
};

exports.onMatchReopened = async (conn, matchId) => {
  // a tie that had been settled is a tie again
  await step("tie-break", async () => {
    await conn.query(`DELETE FROM match_tiebreaks WHERE match_id = ?`, [matchId]);
    await conn.query(`UPDATE matches SET decided_by = NULL WHERE match_id = ?`, [matchId]);
  });
  await step("player stats", () => playerStats.removeMatch(conn, matchId));
  await step("ranking points", () => points.revokeForMatch(conn, matchId));
  await step("tournament results", async () => {
    const [[tm]] = await conn.query(`SELECT tournament_id, stage FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
    if (tm && (tm.stage === "final" || tm.stage === "third_place")) await results.settle(conn, tm.tournament_id);
  });
  await step("result notification", () => notifications.withdraw(conn, `result:${matchId}`));
  await step("next match notification", () => fixtureNotifier.nextMatchesWithdrawn(conn, matchId));
};

/** Fill in everything for matches that were completed before this feature existed (or while a step failed). */
exports.rebuildAll = async (conn) => {
  const [done] = await conn.query(`SELECT match_id FROM matches WHERE status = 'completed' ORDER BY match_id`);
  let rebuilt = 0;
  for (const m of done) {
    await playerStats.snapshotMatch(conn, m.match_id);
    rebuilt += 1;
  }
  await points.recalculateAll(conn);
  const [finals] = await conn.query(`SELECT DISTINCT tournament_id FROM tournament_matches WHERE stage IN ('final', 'third_place') AND status = 'completed'`);
  for (const f of finals) await results.settle(conn, f.tournament_id);
  return { matches: rebuilt, tournaments: finals.length };
};
