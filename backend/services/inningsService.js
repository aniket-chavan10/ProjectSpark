const { withTransaction } = require("../utils/db-transaction");
const liveMatchService = require("./liveMatchService");

exports.switchInnings = async ({ matchId, currentInningId, strikerId, nonStrikerId, bowlerId }) => {
  return withTransaction(async (conn) => {
    // --- 1. Mark current innings as completed ---

    // You may want to store innings status (optional)
    // Or just finalize current innings totals.
    // For now, mark a 'completed' flag or just trust your logic.
    await conn.execute(
      `UPDATE innings SET overs = (
          SELECT current_overs FROM live_scorecards WHERE inning_id = ?
        ), status = 'completed'
       WHERE inning_id = ?`,
      [currentInningId, currentInningId]
    );

    // --- 2. Create the next innings for opposing team ---

    // Find current innings info to get which innings number, teams info
    const [[currentInning]] = await conn.execute(
      `SELECT innings_number, team_id FROM innings WHERE inning_id = ?`,
      [currentInningId]
    );
    if (!currentInning) throw new Error("Current innings not found");

    // Get match teams
    const [[match]] = await conn.execute(
      `SELECT team1_id, team2_id FROM matches WHERE id = ?`,
      [matchId]
    );
    if (!match) throw new Error("Match not found");

    // Determine next innings number and batting team id (the opponent of current)
    const nextInningsNumber = currentInning.innings_number + 1;
    const nextBattingTeamId =
      currentInning.team_id === match.team1_id ? match.team2_id : match.team1_id;

    // Insert new innings
    const [result] = await conn.execute(
      `INSERT INTO innings (match_id, team_id, innings_number, total_runs, wickets, overs, extras, status)
       VALUES (?, ?, ?, 0, 0, '0.0', 0, 'in_progress')`,
      [matchId, nextBattingTeamId, nextInningsNumber]
    );
    const newInningId = result.insertId;

    // --- 3. Initialize live_scorecards for new innings ---

    await conn.execute(
      `INSERT INTO live_scorecards (inning_id, on_strike_batsman_id, batsman1_id, non_striker_batsman_id, batsman2_id, bowler_id, current_score, current_wickets, legal_balls_in_over, legal_over_count, partnership_runs)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, '0.0', 0)`,
      [newInningId, strikerId, strikerId, nonStrikerId, nonStrikerId, bowlerId]
    );

    // --- 4. Set initial players in liveMatchService for consistency (optional) ---

    await liveMatchService.setInitialPlayers({
      matchId,
      inningId: newInningId,
      strikerId,
      nonStrikerId,
      bowlerId,
    });

    // Return info about new innings id if needed
    return { newInningId };
  });
};
