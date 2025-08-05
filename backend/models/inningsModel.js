const db = require("../dbconfigure");
const { calculateNewOvers } = require("../utils/overUtils");

exports.createInning = async (matchId, teamId, inningsNumber) => {
  const [result] = await db.execute(
    `INSERT INTO innings (match_id, team_id, innings_number, total_runs, wickets, overs, extras)
     VALUES (?, ?, ?, 0, 0, 0.0, 0)`,
    [matchId, teamId, inningsNumber]
  );
  return result.insertId;
};

exports.getBattingTeamByInning = async (matchId, inningId) => {
  const [rows] = await db.execute(
    `SELECT team_id FROM innings WHERE match_id = ? AND inning_id = ?`,
    [matchId, inningId]
  );
  return rows[0]; // Will return undefined if not found
};


exports.updateInningsOnBall = async (data) => {
  const { inningId, runsScored = 0, extras = 0, legalDelivery, isWicket } = data;

  // Get current values
  const [[inning]] = await db.execute(`SELECT total_runs, wickets, overs, extras FROM innings WHERE inning_id = ?`, [inningId]);

  const newRuns = inning.total_runs + runsScored + extras;
  const newWickets = inning.wickets + (isWicket ? 1 : 0);
  const newExtras = inning.extras + extras;
  const newOvers = legalDelivery ? calculateNewOvers(inning.overs) : inning.overs;

  await db.execute(
    `UPDATE innings SET total_runs = ?, wickets = ?, extras = ?, overs = ? WHERE inning_id = ?`,
    [newRuns, newWickets, newExtras, newOvers, inningId]
  );
};

exports.updateInnings = async (conn, inningId, newScore, newWickets, overStr, extras) => {
  await conn.execute(
    `UPDATE innings
     SET total_runs = ?, wickets = ?, overs = ?, extras = extras + ?
     WHERE inning_id = ?`,
    [newScore, newWickets, overStr, extras, inningId]
  );
};

exports.getInningsByMatch = async (conn, matchId) => {
  const [rows] = await conn.execute(
    `SELECT inning_id, team_id, total_runs, target_score, required_run_rate, wickets, overs, extras, innings_number,
            run_rate, match_id, balls_bowled
     FROM innings WHERE match_id = ? ORDER BY innings_number`,
    [matchId]
  );
  return rows; // array of innings
};
