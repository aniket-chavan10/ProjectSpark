const { withTransaction } = require("../utils/db-transaction");
const { ScoringError } = require("../utils/errors");
const squadService = require("./squadService");

exports.setToss = async (matchId, tossWinnerId, tossDecision) => {
  return withTransaction(async (conn) => {
    const decision = typeof tossDecision === "string" ? tossDecision.trim().toLowerCase() : "";
    if (decision !== "bat" && decision !== "bowl") {
      throw new ScoringError("tossDecision must be 'bat' or 'bowl'");
    }

    // 1. Fetch tournament match details (locked, so a double tap cannot create two matches)
    const [tournamentMatches] = await conn.execute(
      `SELECT id, tournament_id, match_no, team1_id, team2_id, venue, match_id, overs
       FROM tournament_matches WHERE id = ? FOR UPDATE`,
      [matchId]
    );

    const tournamentMatch = tournamentMatches[0];
    if (!tournamentMatch) throw new ScoringError("Tournament match not found", 404);

    const { team1_id, team2_id, tournament_id, match_no, venue } = tournamentMatch;
    const totalOvers = tournamentMatch.overs || 5; // the host chose the overs when scheduling

    if (tournamentMatch.match_id) throw new ScoringError("Toss has already been recorded for this match", 409);
    if (!team1_id || !team2_id) throw new ScoringError("Both teams of this match are not decided yet", 409);

    // The squads of both teams are frozen now (the team admins can no longer change them), and a team
    // with nobody to play stops the toss.
    const [teamNames] = await conn.execute(`SELECT id, team_name FROM teams WHERE id IN (?, ?)`, [team1_id, team2_id]);
    const nameOf = (id) => (teamNames.find((t) => Number(t.id) === Number(id)) || {}).team_name;
    await squadService.freezeMatchSquads(conn, matchId, tournament_id, [
      { id: team1_id, name: nameOf(team1_id) },
      { id: team2_id, name: nameOf(team2_id) },
    ]);

    // 2. Validate toss winner is one of the teams
    const winnerId = parseInt(tossWinnerId, 10);
    if (![team1_id, team2_id].includes(winnerId)) {
      throw new ScoringError("Invalid toss winner");
    }

    // 3. Determine batting and bowling team ids
    const battingTeamId = decision === "bat" ? winnerId : winnerId === team1_id ? team2_id : team1_id;
    const bowlingTeamId = battingTeamId === team1_id ? team2_id : team1_id;

    // 4. Insert new row in matches table with toss information and initial status
    const [insertResult] = await conn.execute(
      `INSERT INTO matches
       (tournament_id, match_no, team1_id, team2_id, date, venue, toss_winner_id, toss_decision, total_overs, status)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'live')`,
      [tournament_id, match_no, team1_id, team2_id, venue, winnerId, decision, totalOvers]
    );

    const newMatchId = insertResult.insertId;

    // Link the fixture to the live match
    await conn.execute(`UPDATE tournament_matches SET match_id = ?, status = 'live' WHERE id = ?`, [newMatchId, matchId]);

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
    await conn.execute(`INSERT INTO live_scorecards (team_id, inning_id, match_id) VALUES (?, ?, ?)`, [
      battingTeamId,
      battingInningId,
      newMatchId,
    ]);
    await conn.execute(`INSERT INTO live_scorecards (team_id, inning_id, match_id) VALUES (?, ?, ?)`, [
      bowlingTeamId,
      bowlingInningId,
      newMatchId,
    ]);

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
