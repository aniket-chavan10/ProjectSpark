// services/liveMatchService.js
const liveScorecardModel = require("../models/liveScorecardModel");
const { withTransaction } = require("../utils/db-transaction");

exports.setInitialPlayers = async ({ matchId, inningId, strikerId, nonStrikerId, bowlerId }) => {
  return liveScorecardModel.updateInitialPlayers({
    matchId,
    inningId,
    strikerId,
    nonStrikerId,
    bowlerId
  });
};

exports.setNewBatsman = async ({ matchId, inningId, newBatsmanId, end }) => {
  // end: "striker" or "non-striker"
  return withTransaction(async (conn) => {
    // 1. Check current state (slot must be null)
    const [[current]] = await conn.execute(
      `SELECT on_strike_batsman_id, non_striker_batsman_id FROM live_scorecards
        WHERE inning_id = ? AND match_id = ? LIMIT 1`,
      [inningId, matchId]
    );
    if (!current)
      throw new Error("Live scorecard not found");

    const field = end === "striker" ? "on_strike_batsman_id" : "non_striker_batsman_id";
    const batsmanField = end === "striker" ? "batsman1_id" : "batsman2_id";

    const isNull = end === "striker" ? !current.on_strike_batsman_id : !current.non_striker_batsman_id;
    if (!isNull) throw new Error(`Cannot set new batsman: The ${end} slot is not empty`);

    // 2. Perform update only if slot is still null (race condition safety)
    const [result] = await conn.execute(
      `UPDATE live_scorecards
        SET ${field} = ?, ${batsmanField} = ?
        WHERE inning_id = ? AND match_id = ? AND ${field} IS NULL`,
      [newBatsmanId, newBatsmanId, inningId, matchId]
    );
    if (result.affectedRows === 0)
      throw new Error("Batsman not set (slot was not empty)");

    return true;
  });
};


exports.setNewBowler = async ({ matchId, inningId, newBowlerId }) => {
  return withTransaction(async (conn) => {
    // 1. Check if bowler_id is currently null
    const [[current]] = await conn.execute(
      `SELECT bowler_id FROM live_scorecards WHERE inning_id = ? AND match_id = ? LIMIT 1`,
      [inningId, matchId]
    );
    if (!current)
      throw new Error("Live scorecard not found");
    if (current.bowler_id)
      throw new Error("Cannot set new bowler: Bowler slot is not empty");

    // 2. Perform update, only if bowler was null
    const [result] = await conn.execute(
      `UPDATE live_scorecards
         SET bowler_id = ?
       WHERE inning_id = ? AND match_id = ? AND bowler_id IS NULL`,
      [newBowlerId, inningId, matchId]
    );
    if (result.affectedRows === 0)
      throw new Error("Bowler not set (slot was not empty)");

    return true;
  });
};
