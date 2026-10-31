const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const squadModel = require("../models/squadModel");
const db = require("../dbconfigure");
const { ScoringError } = require("./errors");

exports.validateInitialPlayers = async ({ matchId, inningId, strikerId, nonStrikerId, bowlerId }) => {
  if (!matchId || !inningId || !strikerId || !nonStrikerId || !bowlerId) {
    throw new ScoringError("Missing required fields");
  }

  if (strikerId === nonStrikerId) {
    throw new ScoringError("Striker and non-striker cannot be the same player");
  }

  // 🎯 1. Get batting team
  const inning = await inningsModel.getBattingTeamByInning(matchId, inningId);
  if (!inning) {
    throw new ScoringError("Inning not found for given match");
  }

  const battingTeamId = inning.team_id;

  // 🎯 2. Get both match teams
  const teams = await matchModel.getTeamsByMatchId(matchId);
  if (!teams) {
    throw new ScoringError("Match not found");
  }

  const { team1_id, team2_id } = teams;
  const bowlingTeamId = battingTeamId == team1_id ? team2_id : team1_id;

  // 🎯 3. Validate both batsmen
  const strikerOk = await squadModel.isInPlayingXI(db, matchId, battingTeamId, strikerId);
  const nonStrikerOk = await squadModel.isInPlayingXI(db, matchId, battingTeamId, nonStrikerId);
  if (!strikerOk || !nonStrikerOk) {
    throw new ScoringError("One or both batsmen are not in the batting team's playing XI");
  }

  // 🎯 4. Validate bowler
  const bowlerValid = await squadModel.isInPlayingXI(db, matchId, bowlingTeamId, bowlerId);
  if (!bowlerValid) {
    throw new ScoringError("The bowler is not in the bowling team's playing XI");
  }



  return { battingTeamId, bowlingTeamId };
};

exports.validateNewBatsman = async ({ matchId, inningId, newBatsmanId, end }) => {
  if (!["striker", "nonStriker"].includes(end)) throw new ScoringError("Invalid end");
  if (!newBatsmanId) throw new ScoringError("newBatsmanId is required");

  // Must belong to the batting team
  const inning = await inningsModel.getBattingTeamByInning(matchId, inningId);
  if (!inning) throw new ScoringError("Inning not found for given match", 404);
  const onTeam = await squadModel.isInPlayingXI(db, matchId, inning.team_id, newBatsmanId);
  if (!onTeam) throw new ScoringError("The new batsman is not in the batting team's playing XI");

  // Must not be out already (a batter who retired hurt may come back)
  const [out] = await db.execute(
    `SELECT 1 FROM balls WHERE inning_id = ? AND dismissed_player_id = ? AND is_wicket = 1 LIMIT 1`,
    [inningId, newBatsmanId]
  );
  if (out.length) throw new ScoringError("This batsman is already out");

  // Must not already be batting
  const [[live]] = await db.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (live && [live.on_strike_batsman_id, live.non_striker_batsman_id].some((id) => id && Number(id) === Number(newBatsmanId))) {
    throw new ScoringError("This batsman is already at the crease");
  }
};

exports.validateNewBowler = async ({ matchId, inningId, newBowlerId }) => {
  if (!newBowlerId) throw new ScoringError("newBowlerId is required");

  // Must belong to the fielding team
  const inning = await inningsModel.getBattingTeamByInning(matchId, inningId);
  if (!inning) throw new ScoringError("Inning not found for given match", 404);
  const teams = await matchModel.getTeamsByMatchId(matchId);
  if (!teams) throw new ScoringError("Match not found", 404);
  const bowlingTeamId = Number(inning.team_id) === Number(teams.team1_id) ? teams.team2_id : teams.team1_id;
  const onTeam = await squadModel.isInPlayingXI(db, matchId, bowlingTeamId, newBowlerId);
  if (!onTeam) throw new ScoringError("The bowler is not in the bowling team's playing XI");

  // Not two overs in a row
  const [lastOvers] = await db.execute(
    `SELECT bowler_id FROM overs WHERE inning_id = ? ORDER BY over_number DESC LIMIT 1`,
    [inningId]
  );
  const lastOver = lastOvers[0];
  if (lastOver && Number(lastOver.bowler_id) === Number(newBowlerId)) {
    throw new ScoringError("The same bowler cannot bowl two overs in a row");
  }

  // Over quota: one fifth of the match overs, rounded up (5 overs -> 1 each, 20 -> 4 each)
  const [[match]] = await db.execute(`SELECT total_overs FROM matches WHERE match_id = ? LIMIT 1`, [matchId]);
  const maxOvers = Math.ceil(((match && match.total_overs) || 5) / 5);
  const [[bowled]] = await db.execute(
    `SELECT COUNT(*) AS balls FROM balls WHERE inning_id = ? AND bowler_id = ? AND legal_delivery = 1`,
    [inningId, newBowlerId]
  );
  if (Number(bowled.balls) >= maxOvers * 6) {
    throw new ScoringError(`This bowler has already bowled the maximum ${maxOvers} over(s)`);
  }
};
