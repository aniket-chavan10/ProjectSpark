const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const playersModel = require("../models/playersModel");

exports.validateInitialPlayers = async ({ matchId, inningId, strikerId, nonStrikerId, bowlerId }) => {
  if (!matchId || !inningId || !strikerId || !nonStrikerId || !bowlerId) {
    throw new Error("Missing required fields");
  }

  if (strikerId === nonStrikerId) {
    throw new Error("Striker and non-striker cannot be the same player");
  }

  // 🎯 1. Get batting team
  const inning = await inningsModel.getBattingTeamByInning(matchId, inningId);
  if (!inning) {
    throw new Error("Inning not found for given match");
  }

  const battingTeamId = inning.team_id;

  // 🎯 2. Get both match teams
  const teams = await matchModel.getTeamsByMatchId(matchId);
  if (!teams) {
    throw new Error("Match not found");
  }

  const { team1_id, team2_id } = teams;
  const bowlingTeamId = battingTeamId == team1_id ? team2_id : team1_id;

  // 🎯 3. Validate both batsmen
  const batsmenValid = await playersModel.areBothPlayersFromTeam(battingTeamId, strikerId, nonStrikerId);
  if (!batsmenValid) {
    throw new Error("One or both batsmen do not belong to the batting team");
  }

  // 🎯 4. Validate bowler
  const bowlerValid = await playersModel.isPlayerFromTeam(bowlingTeamId, bowlerId);
  if (!bowlerValid) {
    throw new Error("Bowler does not belong to the bowling team");
  }



  return { battingTeamId, bowlingTeamId };
};

exports.validateNewBatsman = async ({ matchId, inningId, newBatsmanId, end }) => {
  // Add DB checks as needed (e.g., player part of playing XI, not already out, etc)
  if (!["striker", "nonStriker"].includes(end)) throw new Error("Invalid end");
  // ... other validation logic
};

exports.validateNewBowler = async ({ matchId, inningId, newBowlerId }) => {
  // Check if bowler is not the one who bowled the previous over, not exceeded max quota, etc.
};
