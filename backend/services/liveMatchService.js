// services/liveMatchService.js
const liveScorecardModel = require("../models/liveScorecardModel");
const { withTransaction } = require("../utils/db-transaction");
const { ScoringError } = require("../utils/errors");
const squadService = require("./squadService");

// Choose the openers and the first bowler. Only possible before the first ball: once the innings is under way
// the players change through new batsman / new bowler / change striker, so a stray call cannot wipe a live innings.
exports.setInitialPlayers = async ({ matchId, inningId, strikerId, nonStrikerId, bowlerId }) => {
  return withTransaction(async (conn) => {
    const [[innings]] = await conn.execute(
      `SELECT innings_number, status, match_id FROM innings WHERE inning_id = ? LIMIT 1 FOR UPDATE`,
      [inningId]
    );
    if (!innings) throw new ScoringError("Innings not found", 404);
    if (Number(innings.match_id) !== Number(matchId)) throw new ScoringError("Innings does not belong to this match");
    if (innings.status === "completed") throw new ScoringError("Innings is already completed", 409);

    const [[match]] = await conn.execute(`SELECT status, target_score FROM matches WHERE match_id = ? LIMIT 1`, [matchId]);
    if (!match) throw new ScoringError("Match not found", 404);
    if (match.status === "completed") throw new ScoringError("Match is already completed", 409);
    if (innings.innings_number > 1 && !match.target_score) throw new ScoringError("First innings is not completed yet", 409);

    const [[bowled]] = await conn.execute(`SELECT COUNT(*) AS n FROM balls WHERE inning_id = ?`, [inningId]);
    if (Number(bowled.n) > 0) {
      throw new ScoringError("This innings has already started. Use new batsman, new bowler or change striker instead.", 409);
    }

    const [result] = await conn.execute(
      `UPDATE live_scorecards
       SET batsman1_id = ?, batsman2_id = ?, on_strike_batsman_id = ?, non_striker_batsman_id = ?, bowler_id = ?
       WHERE match_id = ? AND inning_id = ?`,
      [strikerId, nonStrikerId, strikerId, nonStrikerId, bowlerId, matchId, inningId]
    );
    if (result.affectedRows === 0) throw new ScoringError("Live scorecard not found", 404);
    return result;
  });
};

exports.setNewBatsman = async ({ matchId, inningId, newBatsmanId, end }) => {
  if (typeof end !== "string") {
    throw new ScoringError("Invalid end: Must be a string");
  }

  const normalizedEnd = end.trim().toLowerCase();
  if (normalizedEnd !== "striker" && normalizedEnd !== "nonstriker") {
    throw new ScoringError("Invalid end: Must be 'striker' or 'nonStriker'");
  }

  return withTransaction(async (conn) => {
    const [[current]] = await conn.execute(
      `SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id
       FROM live_scorecards
       WHERE inning_id = ? AND match_id = ? LIMIT 1 FOR UPDATE`,
      [inningId, matchId]
    );
    if (!current) throw new ScoringError("Live scorecard not found", 404);

    const isStriker = normalizedEnd === "striker";
    const targetEnd = isStriker ? current.on_strike_batsman_id : current.non_striker_batsman_id;
    const otherEnd = isStriker ? current.non_striker_batsman_id : current.on_strike_batsman_id;

    // Only a vacant end can take a new batsman, so a batsman at the crease is never overwritten.
    if (targetEnd) {
      throw new ScoringError(`The ${isStriker ? "striker" : "non-striker"} end is not vacant`, 409);
    }
    if (otherEnd && Number(otherEnd) === Number(newBatsmanId)) {
      throw new ScoringError("That batsman is already at the other end", 409);
    }

    // The new batsman takes the empty batsman slot (the one the dismissed player left)
    let batsman1Id = current.batsman1_id;
    let batsman2Id = current.batsman2_id;
    if (!batsman1Id) batsman1Id = newBatsmanId;
    else if (!batsman2Id) batsman2Id = newBatsmanId;
    else throw new ScoringError("Both batsman slots are already filled", 409);

    const onStrikeId = isStriker ? newBatsmanId : current.on_strike_batsman_id;
    const nonStrikeId = isStriker ? current.non_striker_batsman_id : newBatsmanId;

    const [result] = await conn.execute(
      `UPDATE live_scorecards SET
        on_strike_batsman_id = ?,
        non_striker_batsman_id = ?,
        batsman1_id = ?,
        batsman2_id = ?
      WHERE inning_id = ? AND match_id = ?`,
      [onStrikeId, nonStrikeId, batsman1Id, batsman2Id, inningId, matchId]
    );
    if (result.affectedRows === 0) throw new ScoringError("Failed to update new batsman");

    return true;
  });
};

exports.setNewBowler = async ({ matchId, inningId, newBowlerId }) => {
  return withTransaction(async (conn) => {
    if (!matchId || !inningId || !newBowlerId) {
      throw new ScoringError("Missing required parameters: matchId, inningId, and newBowlerId are required");
    }

    // 1. The bowler slot must be empty (only after an over has finished, or before the first one)
    const [[current]] = await conn.execute(
      `SELECT bowler_id, legal_over_count FROM live_scorecards WHERE inning_id = ? AND match_id = ? LIMIT 1 FOR UPDATE`,
      [inningId, matchId]
    );
    if (!current) throw new ScoringError("Live scorecard not found", 404);
    if (current.bowler_id) throw new ScoringError("Cannot set new bowler: Bowler slot is not empty", 409);

    const [[match]] = await conn.execute(`SELECT total_overs FROM matches WHERE match_id = ? LIMIT 1`, [matchId]);
    if (Math.floor(parseFloat(current.legal_over_count || 0)) >= ((match && match.total_overs) || 5)) {
      throw new ScoringError("All overs of this innings are already bowled", 409);
    }

    // 2. Next over number
    const [[{ maxOver }]] = await conn.execute(`SELECT MAX(over_number) AS maxOver FROM overs WHERE inning_id = ?`, [inningId]);
    const nextOverNumber = (maxOver || 0) + 1;

    // 3. Insert new over with new bowler
    const [result] = await conn.execute(
      `INSERT INTO overs (inning_id, match_id, over_number, bowler_id, is_complete, start_timestamp)
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      [inningId, matchId, nextOverNumber, newBowlerId]
    );
    if (result.affectedRows === 0) throw new ScoringError("Failed to create new over");

    // 4. Update live_scorecards with new bowler and reset balls_in_over
    const [updateResult] = await conn.execute(
      `UPDATE live_scorecards
       SET bowler_id = ?, legal_balls_in_over = 0
       WHERE inning_id = ? AND match_id = ? AND bowler_id IS NULL`,
      [newBowlerId, inningId, matchId]
    );
    if (updateResult.affectedRows === 0) {
      throw new ScoringError("Failed to update live scorecard with new bowler (slot not empty)", 409);
    }

    return true;
  });
};

exports.getMatchWithTeamsAndSquads = async (matchId) => {
  return withTransaction(async (conn) => {
    // 1. Fetch match details by match ID
    const [[match]] = await conn.execute(
      `SELECT tm.id, tm.match_id, tm.match_no, tm.tournament_id, tm.stage, tm.round_number, tm.group_name,
          tm.team1_id, tm.team2_id, tm.match_date, tm.match_time,
          DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date_str, DATE_FORMAT(tm.match_time, '%H:%i') AS start_time_str,
          tm.overs, tm.duration_minutes, tm.venue, tm.winner_team_id, tm.status,
          tm.dependent_match1_id, tm.dependent_match2_id, tm.created_at, tm.updated_at, t.name AS tournament_name
       FROM tournament_matches tm LEFT JOIN tournaments t ON t.id = tm.tournament_id
       WHERE tm.id = ? LIMIT 1`,
      [matchId]
    );
    if (!match) throw new Error("Match not found");

    // 2. Fetch team1 details with logo
    const [[team1]] = await conn.execute(
      `SELECT id, team_name, logo FROM teams WHERE id = ? LIMIT 1`,
      [match.team1_id]
    );

    // 3. Fetch team2 details with logo
    const [[team2]] = await conn.execute(
      `SELECT id, team_name, logo FROM teams WHERE id = ? LIMIT 1`,
      [match.team2_id]
    );

    // Helper to fetch active players (is_playing=1) in a team with player details
    async function getTeamPlayers(teamId) {
      if (!teamId) return [];
      const [players] = await conn.execute(
        `SELECT p.player_id, p.players_name, p.profile_picture
         FROM teams_squad tp
         JOIN players_core p ON p.player_id = tp.player_id
         WHERE tp.team_id = ? AND tp.is_playing = 1`,
        [teamId]
      );
      return players || [];
    }

    // 4. The squads: what each team declared (the XI can be changed per match), frozen at the toss.
    //    Matches from before squads existed keep using the old playing XI table.
    const declared = await squadService.getFixtureSquads(conn, matchId, match.tournament_id, [{ id: match.team1_id }, { id: match.team2_id }]);
    const squadOf = async (teamId) => {
      const d = declared[teamId] || { source: "none", playing: [], reserves: [] };
      if (d.source === "none") return { source: "none", squad: await getTeamPlayers(teamId), reserves: [] };
      return { source: d.source, squad: d.playing, reserves: d.reserves };
    };
    const s1 = await squadOf(match.team1_id);
    const s2 = await squadOf(match.team2_id);

    // 5. Compose full response
    return {
      match,
      team1: team1 ? { ...team1, squad: s1.squad, reserves: s1.reserves, squadSource: s1.source } : team1,
      team2: team2 ? { ...team2, squad: s2.squad, reserves: s2.reserves, squadSource: s2.source } : team2,
    };
  });
};