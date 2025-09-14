// services/liveMatchService.js
const liveScorecardModel = require("../models/liveScorecardModel");
const { withTransaction } = require("../utils/db-transaction");

exports.setInitialPlayers = async ({
  matchId,
  inningId,
  strikerId,
  nonStrikerId,
  bowlerId,
}) => {
  return liveScorecardModel.updateInitialPlayers({
    matchId,
    inningId,
    strikerId,
    nonStrikerId,
    bowlerId,
  });
};

exports.setNewBatsman = async ({ matchId, inningId, newBatsmanId, end }) => {
  if (typeof end !== "string") {
    throw new Error("Invalid end: Must be a string");
  }

  const normalizedEnd = end.trim().toLowerCase();
  if (normalizedEnd !== "striker" && normalizedEnd !== "nonstriker") {
    throw new Error("Invalid end: Must be 'striker' or 'nonStriker'");
  }

  return withTransaction(async (conn) => {
    // Fetch current live scorecard state including last wicket info and awaiting_new_batsman
    const [rows] = await conn.execute(
      `SELECT scorecard_id, on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id,
              last_wicket_player_id, awaiting_new_batsman
       FROM live_scorecards
       WHERE inning_id = ? AND match_id = ? LIMIT 1`,
      [inningId, matchId]
    );

    const current = rows[0];
    if (!current) throw new Error("Live scorecard not found");

    const isStriker = normalizedEnd === "striker";

    // Get old last wicket player id once for reference
    const lastWicketPlayerId = current.last_wicket_player_id;

    // Prepare new batsman IDs for striker/non-striker and batsman1/2 replacements
    let onStrikeId = current.on_strike_batsman_id;
    let nonStrikeId = current.non_striker_batsman_id;
    let batsman1Id = current.batsman1_id;
    let batsman2Id = current.batsman2_id;

    // Replace striker or non-striker batsman IDs and batsman1/2 IDs accordingly
    if (isStriker) {
      onStrikeId = newBatsmanId;

      if (batsman1Id === current.on_strike_batsman_id) {
        batsman1Id = newBatsmanId;
      } else if (batsman2Id === current.on_strike_batsman_id) {
        batsman2Id = newBatsmanId;
      } else {
        batsman1Id = newBatsmanId;
      }
    } else {
      nonStrikeId = newBatsmanId;

      if (batsman1Id === current.non_striker_batsman_id) {
        batsman1Id = newBatsmanId;
      } else if (batsman2Id === current.non_striker_batsman_id) {
        batsman2Id = newBatsmanId;
      } else {
        batsman2Id = newBatsmanId;
      }
    }

    // Also replace batsman1Id or batsman2Id if they held the last wicket player id
    if (batsman1Id === lastWicketPlayerId) {
      batsman1Id = newBatsmanId;
    }
    if (batsman2Id === lastWicketPlayerId) {
      batsman2Id = newBatsmanId;
    }

    // Update live_scorecards row without updating last_wicket_player_id column,
    // but update striker/nonStriker and batsman1/2 as needed
    const sql = `
      UPDATE live_scorecards SET
        on_strike_batsman_id = ?,
        non_striker_batsman_id = ?,
        batsman1_id = ?,
        batsman2_id = ?,
        awaiting_new_batsman = 0
      WHERE inning_id = ? AND match_id = ?
    `;

    const [result] = await conn.execute(sql, [
      onStrikeId,
      nonStrikeId,
      batsman1Id,
      batsman2Id,
      inningId,
      matchId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("Failed to update new batsman");
    }

    return true;
  });
};

exports.setNewBowler = async ({ matchId, inningId, newBowlerId }) => {
  return withTransaction(async (conn) => {
    if (!matchId || !inningId || !newBowlerId) {
      throw new Error(
        "Missing required parameters: matchId, inningId, and newBowlerId are required"
      );
    }

    // Verify live scorecard exists
    const [[current]] = await conn.execute(
      `SELECT bowler_id FROM live_scorecards WHERE inning_id = ? AND match_id = ? LIMIT 1`,
      [inningId, matchId]
    );
    if (!current) throw new Error("Live scorecard not found");

    // Get max over number for innings
    const [[{ maxOver }]] = await conn.execute(
      `SELECT MAX(over_number) AS maxOver FROM overs WHERE inning_id = ?`,
      [inningId]
    );
    const nextOverNumber = (maxOver || 0) + 1;

    // Insert new over with new bowler
    const [result] = await conn.execute(
      `INSERT INTO overs (inning_id, match_id, over_number, bowler_id, is_complete, start_timestamp)
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      [inningId, matchId, nextOverNumber, newBowlerId]
    );
    if (result.affectedRows === 0) throw new Error("Failed to create new over");

    // Update live_scorecards with new bowler unconditionally (remove bowler_id IS NULL condition)
    const [updateResult] = await conn.execute(
      `UPDATE live_scorecards
       SET bowler_id = ?, legal_balls_in_over = 0, is_bowler_over_complete = 0, awaiting_new_bowler = 0
       WHERE inning_id = ? AND match_id = ?`,
      [newBowlerId, inningId, matchId]
    );
    if (updateResult.affectedRows === 0)
      throw new Error("Failed to update live scorecard with new bowler");

    return true;
  });
};

exports.getMatchWithTeamsAndSquads = async (matchId) => {
  return withTransaction(async (conn) => {
    // 1. Fetch match details by match ID
    const [[match]] = await conn.execute(
      `SELECT id, match_no, tournament_id, round_number, group_name, team1_id, team2_id, match_date,
          match_time, venue, winner_team_id, status, dependent_match1_id, dependent_match2_id, created_at, updated_at
       FROM tournament_matches WHERE id = ? LIMIT 1`,
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

    // 4. Fetch squads for each team (only players playing)
    const team1Squad = await getTeamPlayers(match.team1_id);
    const team2Squad = await getTeamPlayers(match.team2_id);

    // 5. Compose full response
    return {
      match,
      team1: { ...team1, squad: team1Squad },
      team2: { ...team2, squad: team2Squad },
    };
  });
};
