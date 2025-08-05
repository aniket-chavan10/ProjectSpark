const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const scorecardModel = require("../models/scorecardModel");

exports.setToss = async (matchId, tossWinnerId, tossDecision) => {
  const teams = await matchModel.getTeamsByMatchId(matchId);
  if (!teams) throw new Error("Match not found");

  const { team1_id, team2_id } = teams;
  if (![team1_id, team2_id].includes(parseInt(tossWinnerId))) {
    throw new Error("Invalid toss winner");
  }

  const battingTeamId =
    tossDecision === "bat" ? tossWinnerId : tossWinnerId == team1_id ? team2_id : team1_id;

  const bowlingTeamId = battingTeamId == team1_id ? team2_id : team1_id;

 
  await matchModel.setTossResult(matchId, tossWinnerId, tossDecision);

 const battingInningId = await inningsModel.createInning(matchId, battingTeamId, 1); // 1st innings
const bowlingInningId = await inningsModel.createInning(matchId, bowlingTeamId, 2); // 2nd innings

await scorecardModel.createScorecard({ teamId: battingTeamId, inningId: battingInningId, matchId });
await scorecardModel.createScorecard({ teamId: bowlingTeamId, inningId: bowlingInningId, matchId });


  return { battingTeamId, bowlingTeamId };
};
