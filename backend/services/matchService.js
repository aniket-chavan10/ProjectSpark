const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const scorecardModel = require("../models/scorecardModel");
const { withTransaction } = require("../utils/db-transaction");
const db = require("../dbconfigure");

exports.setToss = async (matchId, tossWinnerId, tossDecision) => {
  return withTransaction(async (conn) => {
    // 1. Fetch tournament match details from tournament_matches by matchId
    const [tournamentMatches] = await conn.execute(
      `SELECT id, tournament_id, match_no, team1_id, team2_id, venue
       FROM tournament_matches WHERE id = ?`,
      [matchId]
    );

    const tournamentMatch = tournamentMatches[0];
    if (!tournamentMatch) throw new Error("Tournament match not found");

    const { team1_id, team2_id, tournament_id, match_no, venue } = tournamentMatch;

    // 2. Validate toss winner is one of the teams
    if (![team1_id, team2_id].includes(parseInt(tossWinnerId))) {
      throw new Error("Invalid toss winner");
    }

    // 3. Determine batting and bowling team ids
    const battingTeamId =
      tossDecision === "bat" ? tossWinnerId : tossWinnerId == team1_id ? team2_id : team1_id;
    const bowlingTeamId = battingTeamId == team1_id ? team2_id : team1_id;

    // 4. Insert new row in matches table with toss information and initial status
    const [insertResult] = await conn.execute(
      `INSERT INTO matches
       (tournament_id, match_no, team1_id, team2_id, date, venue, toss_winner_id, toss_decision, status)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, 'live')`,
      [tournament_id, match_no, team1_id, team2_id, venue, tossWinnerId, tossDecision]
    );

    const newMatchId = insertResult.insertId;

    // New step: Update tournament_matches with new match_id
    await conn.execute(
      `UPDATE tournament_matches SET match_id = ? WHERE id = ?`,
      [newMatchId, matchId]
    );

    // 5. Create innings - 1st (batting) and 2nd (bowling)
    const [battingInning] = await conn.execute(
      `INSERT INTO innings (match_id, team_id, innings_number) VALUES (?, ?, 1)`,
      [newMatchId, battingTeamId]
    );
    const [bowlingInning] = await conn.execute(
      `INSERT INTO innings (match_id, team_id, innings_number) VALUES (?, ?, 2)`,
      [newMatchId, bowlingTeamId]
    );

    const battingInningId = battingInning.insertId;
    const bowlingInningId = bowlingInning.insertId;

    // 6. Create scorecards for both teams for their innings
    await conn.execute(
      `INSERT INTO live_scorecards (team_id, inning_id, match_id) VALUES (?, ?, ?)`,
      [battingTeamId, battingInningId, newMatchId]
    );
    await conn.execute(
      `INSERT INTO live_scorecards (team_id, inning_id, match_id) VALUES (?, ?, ?)`,
      [bowlingTeamId, bowlingInningId, newMatchId]
    );

    // 7. Return relevant info to frontend
    return {
      matchId: newMatchId,
      battingTeamId,
      bowlingTeamId,
      battingInningId,
      bowlingInningId,
    };
  });
};

