const {
  isLegalDelivery,
  calculateTotalRuns,
  shouldRotateStrike,
  getPartnershipRuns,
} = require("../utils/cricketRules/cricketRules");

const playerPerfModel = require("../models/playerPerformanceModel");
const playerStatsModel = require("../models/playerStatsModel");

// Helper updates for ball and over count
function updateBallAndOverCount(prevBallsInOver, prevOvers, legalDelivery) {
  let newBalls = prevBallsInOver;
  let newOvers = parseFloat(prevOvers || 0);
  if (legalDelivery) {
    newBalls += 1;
    // If 6th legal ball bowled, increment over count and reset ballsInOver
    if (newBalls === 6) {
      newOvers += 1;
      newBalls = 0;
    }
  }
  return { newBallsInOver: newBalls, newOvers };
}

// Correct over completion logic: over is complete when ballsInOver === 0 right after incrementing from 6
function isOverComplete(prevBallsInOver, legalDelivery) {
  // Over becomes complete when legal delivery is bowled and balls reach 6
  return legalDelivery && prevBallsInOver + 1 === 6;
}


async function updateDependentMatchesCascading(conn, matchRowId, winnerTeamId) {
  const queue = [{ matchRowId, winnerTeamId }];

  while (queue.length > 0) {
    const { matchRowId: currentId, winnerTeamId: currentWinner } = queue.shift();

    // Update immediate dependents with current winner_team_id in the correct side (team1_id or team2_id)
    await conn.execute(
      `UPDATE tournament_matches SET team1_id = ? WHERE dependent_match1_id = ?`,
      [currentWinner, currentId]
    );
    await conn.execute(
      `UPDATE tournament_matches SET team2_id = ? WHERE dependent_match2_id = ?`,
      [currentWinner, currentId]
    );

    // Fetch all immediate dependents by matching on dependent_match1_id or dependent_match2_id equals current row id
    const [dependentMatches] = await conn.execute(
      `SELECT id, match_id, winner_team_id, status FROM tournament_matches
       WHERE dependent_match1_id = ? OR dependent_match2_id = ?`,
      [currentId, currentId]
    );

    // Enqueue all dependents to cascade further updates
    for (const dm of dependentMatches) {
      queue.push({ matchRowId: dm.id, winnerTeamId: currentWinner });
    }
  }
}

exports.registerBallEvent = async (conn, inputData) => {
  const {
    inningId,
    matchId,
    batsmanId,
    bowlerId,
    runsScored = 0,
    isWicket = 0,
    wicketType = null,
    dismissedPlayerId = null,
    fielderId = null,
    extras = 0,
    extraType = null,
    isRetiredHurt = 0,
    shotType = null,
    ballOutcome = null,
    wagonWheelRegion = null,
    newBatsmanId = null, // No use here, separate method handles new batsman
  } = inputData;

  const MAX_WICKETS = 10;
  const strikerDismissalTypes = ["bowled", "caught", "lbw", "stumped"];
  const normalizedWicketType = wicketType ? wicketType.toLowerCase() : null;

  // Fetch match details, including overs and target
  const [[matchRow]] = await conn.execute(
    `SELECT total_overs, team1_id, team2_id, target_score, status FROM matches WHERE match_id = ? LIMIT 1`,
    [matchId]
  );
  if (!matchRow) throw new Error("Match not found");
  const MAX_OVERS = matchRow.total_overs || 5;
  const matchTargetScore = matchRow.target_score; // May be null for first innings
  const matchStatus = matchRow.status; // e.g. 'live', 'completed'

  // Fetch live scorecard for the inning
  const [[live]] = await conn.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id, current_score,
      current_wickets, legal_balls_in_over, legal_over_count, bowler_id,
      last_wicket_player_id, last_wicket_over, last_wicket_description, awaiting_new_batsman
    FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!live) throw new Error("No live scorecard found for inning");
  if (!live.bowler_id) throw new Error("No bowler assigned");

  // Validate wicket & striker consistency
  if (
    isWicket &&
    !isRetiredHurt &&
    strikerDismissalTypes.includes(normalizedWicketType) &&
    live.on_strike_batsman_id !== batsmanId
  ) {
    throw new Error("Striker mismatch for dismissal type " + wicketType);
  }
  if (isWicket && normalizedWicketType === "run out") {
    if (!dismissedPlayerId) throw new Error("Dismissed player id must be provided for run out");
    if (!fielderId) throw new Error("Fielder id must be provided for run out wicket");
  }
  if (
    isWicket &&
    !isRetiredHurt &&
    strikerDismissalTypes.includes(normalizedWicketType) &&
    dismissedPlayerId !== batsmanId
  ) {
    throw new Error(`Dismissed player must be striker (batsmanId) for wicket type ${wicketType}`);
  }

  // Prevent balls after innings completed
  if (
    live.current_wickets >= MAX_WICKETS ||
    parseFloat(live.legal_over_count || 0) >= MAX_OVERS
  ) {
    throw new Error("Innings is over. No further balls allowed.");
  }

  // Get or create the current active over
  const currentOver = await getCurrentActiveOver(conn, inningId, matchId, bowlerId);
  if (currentOver.bowler_id !== bowlerId) throw new Error("Bowler ID mismatch for current active over");

  const currentOverId = currentOver.over_id;
  const currentOverNumber = currentOver.over_number;

  // Next ball number and legal delivery
  const [[{ nextBallNumber }]] = await conn.execute(
    `SELECT COALESCE(MAX(ball_number), 0) + 1 AS nextBallNumber FROM balls WHERE over_id = ?`,
    [currentOverId]
  );
  const ballNumber = nextBallNumber;
  const legalDelivery = isLegalDelivery(extraType);

  // Adjust extras
  let actualExtras = extras;
  if (extraType) {
    const lowerExtra = extraType.toLowerCase();
    if ((lowerExtra === "wide" || lowerExtra === "no-ball") && extras === 0) {
      actualExtras = 1;
    }
  }

  // Total runs this ball
  const totalRunsThisBall = calculateTotalRuns(runsScored, actualExtras);

  // Insert ball
  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_id, over_number, ball_number,
      batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inningId,
      currentOverId,
      currentOverNumber,
      ballNumber,
      batsmanId,
      bowlerId,
      runsScored,
      isWicket,
      wicketType,
      dismissedPlayerId,
      fielderId,
      actualExtras,
      extraType,
      legalDelivery ? 1 : 0,
      isRetiredHurt,
      shotType,
      ballOutcome,
      wagonWheelRegion,
    ]
  );

  // Update running totals
  const newScore = live.current_score + totalRunsThisBall;
  const newWickets = isWicket && !isRetiredHurt ? live.current_wickets + 1 : live.current_wickets;
  const overIsComplete = isOverComplete(live.legal_balls_in_over, legalDelivery);

  const awaitingNewBatsmanFlag = isWicket && !isRetiredHurt ? 1 : 0;

  const { newBallsInOver, newOvers } = updateBallAndOverCount(
    live.legal_balls_in_over,
    live.legal_over_count,
    legalDelivery
  );

  // Fetch innings for balls bowled and status
  const [[inningsRow]] = await conn.execute(
    `SELECT balls_bowled, total_runs, wickets, status, innings_number, team_id FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!inningsRow) throw new Error("Innings not found");

  let newBallsBowled = inningsRow.balls_bowled || 0;
  if (legalDelivery) newBallsBowled += 1;

  // Update batsman positions - no null assignments here for dismissed batsman
  let strikerId = live.on_strike_batsman_id;
  let nonStrikerId = live.non_striker_batsman_id;
  let batsman1Id = live.batsman1_id;
  let batsman2Id = live.batsman2_id;

  // Remove null assignment for dismissed batsman here - let separate method handle new batsman set
  if (!isWicket || isRetiredHurt) {
    // Handle strike rotation only when no wicket or retired hurt
    if (shouldRotateStrike(runsScored, actualExtras, extraType, legalDelivery)) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    }
  }

  if (overIsComplete) {
    [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
  }

  const bowlerIdToUpdate = overIsComplete ? null : live.bowler_id;

  // Determine innings completion
  const inningsCompleted =
    newWickets >= MAX_WICKETS || parseFloat(newOvers) >= MAX_OVERS;

  // Determine if chasing team reached target (for innings > 1)
  let matchCompleted = false;
  let winnerTeamId = null;
  let victoryMarginType = null;
  let victoryMargin = null;

  if (
    inningsRow.innings_number > 1 &&
    matchTargetScore !== null &&
    newScore >= matchTargetScore
  ) {
    // Chasing team won by wickets remaining
    matchCompleted = true;
    winnerTeamId = inningsRow.team_id;
    victoryMarginType = "wickets";
    victoryMargin = MAX_WICKETS - newWickets;
  }

  // If innings completed by overs or wickets and not chasing team win, match might be over by runs
  if (!matchCompleted && inningsCompleted && inningsRow.innings_number === 2) {
    if (newScore < matchTargetScore) {
      // Chasing team lost by runs
      matchCompleted = true;
      winnerTeamId =
        inningsRow.team_id === matchRow.team1_id ? matchRow.team2_id : matchRow.team1_id;
      victoryMarginType = "runs";
      victoryMargin = matchTargetScore - newScore - 1; // runs needed minus one scored
    }
  }

  // Update innings status when completed
  if (inningsCompleted && inningsRow.status !== "completed") {
    await conn.execute(
      `UPDATE innings SET status = 'completed' WHERE inning_id = ?`,
      [inningId]
    );
  }

  // Set target score for next innings (if not set and innings just completed first innings)
  if (
    inningsCompleted &&
    inningsRow.innings_number === 1 &&
    (!matchTargetScore || matchTargetScore === 0)
  ) {
    await conn.execute(
      `UPDATE matches SET target_score = ? WHERE match_id = ?`,
      [newScore + 1, matchId]
    );
  }

  // Prepare last wicket info for live scorecard update
  const lastWicketPlayerId = isWicket && !isRetiredHurt && dismissedPlayerId ? dismissedPlayerId : live.last_wicket_player_id;
  const lastWicketOver = isWicket && !isRetiredHurt ? `${currentOverNumber}.${ballNumber}` : live.last_wicket_over;
  const lastWicketDescription = isWicket && !isRetiredHurt ? wicketType : live.last_wicket_description;

  // Ensure safe values to avoid undefined in update query
  const safeLastWicketPlayerId = lastWicketPlayerId === undefined ? null : lastWicketPlayerId;
  const safeLastWicketOver = lastWicketOver === undefined ? null : lastWicketOver;
  const safeLastWicketDescription = lastWicketDescription === undefined ? null : lastWicketDescription;

  const safeStrikerId = strikerId === undefined ? null : strikerId;
  const safeNonStrikerId = nonStrikerId === undefined ? null : nonStrikerId;
  const safeBatsman1Id = batsman1Id === undefined ? null : batsman1Id;
  const safeBatsman2Id = batsman2Id === undefined ? null : batsman2Id;
  const safeBowlerId = bowlerIdToUpdate === undefined ? null : bowlerIdToUpdate;

  // Update live_scorecards table
await conn.execute(
  `UPDATE live_scorecards SET
    current_score = ?, current_wickets = ?, legal_balls_in_over = ?,
    legal_over_count = ?, current_overs = ?, on_strike_batsman_id = ?,
    non_striker_batsman_id = ?, batsman1_id = ?, batsman2_id = ?,
    bowler_id = ?, partnership_runs = partnership_runs + ?,
    last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ?,
    awaiting_new_batsman = ?, is_bowler_over_complete = ?, awaiting_new_bowler = ?,
    last_updated = CURRENT_TIMESTAMP
  WHERE inning_id = ?`,
  [
    newScore,
    newWickets,
    newBallsInOver,
    newOvers.toFixed(1),
    `${currentOverNumber}.${ballNumber}`,
    safeStrikerId,
    safeNonStrikerId,
    safeBatsman1Id,
    safeBatsman2Id,
    bowlerIdToUpdate,
    getPartnershipRuns(runsScored, actualExtras),
    safeLastWicketPlayerId,
    safeLastWicketOver,
    safeLastWicketDescription,
    awaitingNewBatsmanFlag,
    overIsComplete ? 1 : 0,      // is_bowler_over_complete flag
    overIsComplete ? 1 : 0,      // awaiting_new_bowler flag
    inningId,
  ]
);

  // Update innings summary with status and stats
  await conn.execute(
    `UPDATE innings SET
      total_runs = ?, wickets = ?, balls_bowled = ?, overs = ?, status = ?
    WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      newBallsBowled,
      newOvers.toFixed(1),
      inningsCompleted ? "completed" : inningsRow.status,
      inningId,
    ]
  );

  // If match completed update matches table with winner and margin
  if (matchCompleted && matchStatus !== "completed") {
    await conn.execute(
      `UPDATE matches SET
        winner_team_id = ?, result = 'completed',
        status = 'completed', victory_margin_type = ?, victory_margin = ?
      WHERE match_id = ?`,
      [winnerTeamId, victoryMarginType, victoryMargin, matchId]
    );

    // Update tournament_matches for the completed match itself
    await conn.execute(
      `UPDATE tournament_matches SET winner_team_id = ?, status = 'completed' WHERE match_id = ?`,
      [winnerTeamId, matchId]
    );

    // Cascading update dependent matches recursively/iteratively
    await updateDependentMatchesCascading(conn, matchId, winnerTeamId);
  }

  // Update performance and stats models
  await playerPerfModel.updatePerformanceOnBall(conn, {
    batsmanId,
    bowlerId,
    matchId,
    runsScored,
    isWicket,
    wicketType: normalizedWicketType,
    dismissedPlayerId,
    fielderId,
    legalDelivery,
    extras: actualExtras,
  });

  await playerStatsModel.updateStatsOnBall(conn, {
    batsmanId,
    bowlerId,
    matchId,
    runsScored,
    isWicket,
    wicketType: normalizedWicketType,
    dismissedPlayerId,
    fielderId,
    legalDelivery,
    extras: actualExtras,
  });

  return true;
};


exports.undoLastBallEvent = async (conn, inningId, matchId) => {
  const safe = (val) => (val === undefined ? null : val);

  // Step 1: Get the last ball for the inning (latest by over number and ball number)
  const [[lastBall]] = await conn.execute(
    `SELECT * FROM balls WHERE inning_id = ? ORDER BY over_number DESC, ball_number DESC LIMIT 1`,
    [safe(inningId)]
  );
  if (!lastBall) throw new Error("No ball events to undo");

  // Step 1.1: Fetch match_id for the inning if not present in lastBall
  if (!lastBall.match_id) {
    const [[inningRow]] = await conn.execute(
      `SELECT match_id FROM innings WHERE inning_id = ? LIMIT 1`,
      [safe(inningId)]
    );
    if (!inningRow) throw new Error("Innings not found to get match_id");
    lastBall.match_id = inningRow.match_id;
  }

  const {
    ball_id: ballId,
    runs_scored: runsScored,
    is_wicket: isWicket,
    wicket_type: wicketType,
    dismissed_player_id: dismissedPlayerId,
    extras,
    extra_type: extraType,
    legal_delivery: legalDelivery,
    over_number: overNumber,
    ball_number: ballNumber,
    batsman_id: batsmanId,
    bowler_id: bowlerId,
  } = lastBall;

  // Step 2: Delete this last ball record
  await conn.execute(`DELETE FROM balls WHERE ball_id = ?`, [safe(ballId)]);

  // Step 3: Fetch live scorecard for inning
  const [[live]] = await conn.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id, current_score,
    current_wickets, legal_balls_in_over, legal_over_count, bowler_id, partnership_runs
    FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [safe(inningId)]
  );
  if (!live) throw new Error("No live scorecard found for inning");

  // Calculate total runs including extras to revert
  const totalRunsThisBall = (runsScored || 0) + (extras || 0);

  // Step 4: Revert live scorecard totals
  const newScore = (live.current_score || 0) - totalRunsThisBall;
  const newWickets = (live.current_wickets || 0) - (isWicket ? 1 : 0);

  // Adjust balls and overs
  let newBallsInOver = safe(live.legal_balls_in_over);
  let newOvers = parseFloat(safe(live.legal_over_count)) || 0.0;

  if (legalDelivery) {
    if (newBallsInOver > 0) {
      newBallsInOver -= 1;
    } else if (newBallsInOver === 0 && newOvers > 0) {
      newOvers -= 1;
      newBallsInOver = 5; // Assuming standard 6-ball over
    }
  }

  // Step 5: Fetch innings summary
  const [[inningsRow]] = await conn.execute(
    `SELECT balls_bowled, total_runs, wickets, status, innings_number, team_id FROM innings WHERE inning_id = ? LIMIT 1`,
    [safe(inningId)]
  );
  if (!inningsRow) throw new Error("Innings not found");

  let newBallsBowled = safe(inningsRow.balls_bowled);
  if (legalDelivery && newBallsBowled > 0) {
    newBallsBowled -= 1;
  }

  const newOversStr = newOvers.toFixed(1);
  // If innings was marked completed but now rolling back, revert to live if needed
  const newStatus = inningsRow.status === "completed" ? "live" : inningsRow.status;

  // Step 6: Update live_scorecards
  await conn.execute(
    `UPDATE live_scorecards SET
      current_score = ?, current_wickets = ?, legal_balls_in_over = ?, legal_over_count = ?,
      current_overs = ? WHERE inning_id = ?`,
    [
      safe(newScore),
      safe(newWickets),
      safe(newBallsInOver),
      safe(newOvers),
      safe(`${overNumber}.${ballNumber - 1}`),
      safe(inningId),
    ]
  );

  // Step 7: Update innings table
  await conn.execute(
    `UPDATE innings SET
      total_runs = ?, wickets = ?, balls_bowled = ?, overs = ?, status = ?
      WHERE inning_id = ?`,
    [safe(newScore), safe(newWickets), safe(newBallsBowled), safe(newOversStr), safe(newStatus), safe(inningId)]
  );

  // Step 8: Handle match completion rollback if needed
  const [[matchRow]] = await conn.execute(
    `SELECT target_score, status, winner_team_id FROM matches WHERE match_id = ? LIMIT 1`,
    [safe(matchId)]
  );
  if (!matchRow) throw new Error("Match not found");

  if (matchRow.status === "completed") {
    // Roll back match status if applicable
    await conn.execute(
      `UPDATE matches SET winner_team_id = NULL, result = 'live', status = 'live', victory_margin_type = NULL, victory_margin = NULL WHERE match_id = ?`,
      [safe(matchId)]
    );
    await conn.execute(
      `UPDATE tournament_matches SET winner_team_id = NULL, status = 'live' WHERE match_id = ?`,
      [safe(matchId)]
    );
  }

  // TODO: revert batsman positions, partnerships, bowler stats if stored over last ball (requires history tracking)

  // Step 9: Revert player performance and stats for this ball
  await playerPerfModel.revertPerformanceOnBall(conn, lastBall);
  await playerStatsModel.revertStatsOnBall(conn, lastBall);

  return true;
};

exports.changeStriker = async (conn, inningId, newStrikerId) => {
  // Fetch current live scorecard for the inning
  const [[live]] = await conn.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!live) throw new Error("Live scorecard not found for inning");

  const currentStriker = live.on_strike_batsman_id;
  const currentNonStriker = live.non_striker_batsman_id;

  // If new striker is already on strike, do nothing
  if (currentStriker === newStrikerId) return;

  // Determine new non-striker (the old striker becomes non-striker)
  let newNonStrikerId = currentNonStriker;
  // If the new striker was the current non-striker, swap them
  if (newStrikerId === currentNonStriker) {
    newNonStrikerId = currentStriker;
  }

  await conn.execute(
    `UPDATE live_scorecards SET on_strike_batsman_id = ?, non_striker_batsman_id = ? WHERE inning_id = ?`,
    [newStrikerId, newNonStrikerId, inningId]
  );

  return true;
};


// Helper function
async function getCurrentActiveOver(conn, inningId, matchId, bowlerId = null) {
  const [[activeOver]] = await conn.execute(
    `SELECT over_id, over_number, bowler_id, is_complete
      FROM overs
      WHERE inning_id = ? AND is_complete = FALSE
      ORDER BY over_number DESC LIMIT 1`,
    [inningId]
  );
  if (activeOver) return activeOver;

  if (!bowlerId) throw new Error("No active over found and no bowler specified to start new over");

  const [[{ maxOver }]] = await conn.execute(
    `SELECT MAX(over_number) AS maxOver FROM overs WHERE inning_id = ?`,
    [inningId]
  );
  const nextOverNumber = (maxOver || 0) + 1;
  const [insertResult] = await conn.execute(
    `INSERT INTO overs (inning_id, match_id, over_number, bowler_id, is_complete, start_timestamp)
      VALUES (?, ?, ?, ?, FALSE, NOW())`,
    [inningId, matchId, nextOverNumber, bowlerId]
  );

  return {
    over_id: insertResult.insertId,
    over_number: nextOverNumber,
    bowler_id: bowlerId,
    is_complete: false,
  };
}

