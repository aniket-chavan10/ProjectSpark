
const { withTransaction } = require("../utils/db-transaction");
// Remove liveMatchService import from here

exports.switchInnings = async (conn, { matchId, currentInningId }) => {
  // 1. Mark current innings completed and finalize overs
  await conn.execute(
    `UPDATE innings 
     SET overs = (
       SELECT current_overs FROM live_scorecards WHERE inning_id = ?
     ),
     status = 'completed'
     WHERE inning_id = ?`,
    [currentInningId, currentInningId]
  );

  // 2. Get current innings number
  const [[currentInning]] = await conn.execute(
    `SELECT innings_number FROM innings WHERE inning_id = ?`,
    [currentInningId]
  );
  if (!currentInning) throw new Error("Current innings not found");

  const nextInningsNumber = currentInning.innings_number + 1;

  // 3. Get next innings by matchId and nextInningsNumber
  const [[nextInning]] = await conn.execute(
    `SELECT inning_id FROM innings WHERE match_id = ? AND innings_number = ?`,
    [matchId, nextInningsNumber]
  );
  if (!nextInning) throw new Error("Next innings not found");

  const nextInningId = nextInning.inning_id;

  // 4. -- DO NOT call setInitialPlayers here! --
  // Leave batsman and bowler unset for frontend/user input

  // 5. Return new inning ID for frontend setup
  return { newInningId: nextInningId };
};

