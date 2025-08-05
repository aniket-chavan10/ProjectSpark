const { rotateStrike } = require("../utils/strikeUtils");
const {
  getNextBallPosition,
  checkAndUnsetBowlerIfOverCompleted,
} = require("../utils/overUtils");
const playerPerfModel = require("../models/playerPerformanceModel");
const playerStatsModel = require("../models/playerStatsModel");

exports.registerBallEvent = async (conn, inputData) => {
  // Gracefully handle transaction, wrap this code in your own withTransaction if needed

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
    legalDelivery = true,
    isRetiredHurt = 0,
    shotType = null,
    ballOutcome = null,
    wagonWheelRegion = null,
    newBatsmanId = null,
  } = inputData;

  const MAX_WICKETS = 10;

  // Fetch match info
  const [[matchRow]] = await conn.execute(
    `SELECT total_overs, target_score FROM matches WHERE match_id = ? LIMIT 1`,
    [matchId]
  );
  if (!matchRow) throw new Error("Match not found");
  const MAX_OVERS = matchRow.total_overs || 5;

  // Fetch live scorecard
  const [[live]] = await conn.execute(
    `SELECT on_strike_batsman_id, non_striker_batsman_id, current_score,
            current_wickets, legal_balls_in_over, legal_over_count, bowler_id,
            batsman1_id, batsman2_id
      FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!live) throw new Error("No live scorecard found for inning");
  if (!live.bowler_id) throw new Error("No bowler assigned");
  if (live.on_strike_batsman_id !== batsmanId)
    throw new Error("Striker mismatch: on_strike_batsman_id !== batsmanId");

  // Check innings end status before processing ball
  const oversCompleted = Math.floor(parseFloat(live.legal_over_count || 0));
  if (live.current_wickets >= MAX_WICKETS || oversCompleted >= MAX_OVERS) {
    throw new Error("Innings is over. No further balls allowed.");
  }

  // Get next ball position
  const { overNumber, ballNumber } = await getNextBallPosition(conn, inningId);

  // Fetch innings info for this match to determine innings number
  const [[currentInning]] = await conn.execute(
    `SELECT innings_number FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!currentInning) throw new Error("Inning not found");
  const currentInningsNumber = currentInning.innings_number;

  // Fetch first innings total_runs (to set target score when first innings ends)
  const [[firstInnings]] = await conn.execute(
    `SELECT inning_id, total_runs, wickets FROM innings WHERE match_id = ? AND innings_number = 1 LIMIT 1`,
    [matchId]
  );
  if (!firstInnings) throw new Error("First innings not found");

  // Check if first innings already ended (either wickets = MAX_WICKETS or overs bowled)
  const [[firstInningsBalls]] = await conn.execute(
    `SELECT balls_bowled FROM innings WHERE inning_id = ? LIMIT 1`,
    [firstInnings.inning_id]
  );
  if (!firstInningsBalls) throw new Error("First innings balls bowled info missing");

  const firstInningsOversCompleted = Math.floor(firstInningsBalls.balls_bowled / 6);
  const firstInningsBallsThisOver = firstInningsBalls.balls_bowled % 6;
  const firstInningsFullOvers = firstInningsOversCompleted + (firstInningsBallsThisOver > 0 ? 1 : 0);
  const firstInningsIsEnded = firstInnings.wickets >= MAX_WICKETS || firstInningsFullOvers >= MAX_OVERS;

  // If first innings ended and target_score not set for either innings, set target score for both innings records (first innings target_score = null, second innings target_score = first innings total + 1)
  if (firstInningsIsEnded) {
    // Fetch second innings record for this match (if exists)
    const [[secondInnings]] = await conn.execute(
      `SELECT inning_id, target_score FROM innings WHERE match_id = ? AND innings_number = 2 LIMIT 1`,
      [matchId]
    );

    // Update first innings target_score to null explicitly if not set (good for clarity)
    if (firstInnings.total_runs !== null) {
      await conn.execute(
        `UPDATE innings SET target_score = NULL WHERE inning_id = ? AND (target_score IS NULL OR target_score != NULL)`,
        [firstInnings.inning_id]
      );
    }

    // Update second innings target_score if not set or different
    const calculatedTarget = firstInnings.total_runs + 1;
    if (secondInnings) {
      if (secondInnings.target_score !== calculatedTarget) {
        await conn.execute(
          `UPDATE innings SET target_score = ? WHERE inning_id = ?`,
          [calculatedTarget, secondInnings.inning_id]
        );
      }
    } else {
      // Optional: If second innings record not created yet, no action here; it should be created before play starts
    }
  }

  // Insert the current ball record with inputData fields
  await conn.execute(
    `INSERT INTO balls (
      inning_id, over_number, ball_number, batsman_id, bowler_id, runs_scored,
      is_wicket, wicket_type, dismissed_player_id, fielder_id,
      extras, extra_type, legal_delivery, is_retired_hurt,
      shot_type, ball_outcome, wagon_wheel_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inningId,
      overNumber,
      ballNumber,
      batsmanId,
      bowlerId,
      runsScored,
      isWicket,
      wicketType ?? null,
      dismissedPlayerId ?? null,
      fielderId ?? null,
      extras ?? 0,
      extraType ?? null,
      legalDelivery ? 1 : 0,
      isRetiredHurt ?? 0,
      shotType ?? null,
      ballOutcome ?? null,
      wagonWheelRegion ?? null,
    ]
  );

  // Calculate updated scores and wickets
  const newScore = live.current_score + runsScored + extras;
  const newWickets = isWicket && !isRetiredHurt ? live.current_wickets + 1 : live.current_wickets;

  // Calculate ball and over increments accurately
  let newLegalBalls = live.legal_balls_in_over;
  let legalOvers = parseFloat(live.legal_over_count || 0);
  if (legalDelivery) {
    newLegalBalls = (live.legal_balls_in_over + 1) % 6;
    legalOvers += 0.1;
    if (newLegalBalls === 0) legalOvers = Math.round((legalOvers + 0.4) * 10) / 10;
  }

  // Fetch current balls_bowled from innings to keep count accurate
  const [[inningsRow]] = await conn.execute(
    `SELECT balls_bowled FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  if (!inningsRow) throw new Error("Innings not found");
  let newBallsBowled = inningsRow.balls_bowled || 0;
  if (legalDelivery) newBallsBowled += 1;

  // Current strike holders IDs
  let strikerId = live.on_strike_batsman_id;
  let nonStrikerId = live.non_striker_batsman_id;

  const strikerOut = isWicket && !isRetiredHurt && dismissedPlayerId === strikerId;
  const nonStrikerOut = isWicket && !isRetiredHurt && dismissedPlayerId === nonStrikerId;
  const retiredHurtStriker = isRetiredHurt && dismissedPlayerId === strikerId;
  const retiredHurtNonStriker = isRetiredHurt && dismissedPlayerId === nonStrikerId;

  const isLastBall = legalDelivery && newLegalBalls === 0;

  // Handle wicket & assign new batsman if available
  if (isWicket && !isRetiredHurt) {
    if (strikerOut) strikerId = null;
    if (nonStrikerOut) nonStrikerId = null;

    if (newBatsmanId) {
      if (strikerOut) {
        strikerId = newBatsmanId;
      } else if (nonStrikerOut) {
        nonStrikerId = newBatsmanId;
      } else {
        if (!strikerId) strikerId = newBatsmanId;
        else if (!nonStrikerId) nonStrikerId = newBatsmanId;
      }
    } else {
      throw new Error("New batsman ID must be provided on a wicket ball to assign incoming batsman");
    }
  }
  if (retiredHurtStriker) strikerId = null;
  if (retiredHurtNonStriker) nonStrikerId = null;

  // Strike rotation logic
  if (legalDelivery && !strikerOut && !retiredHurtStriker) {
    ({ strikerId, nonStrikerId } = rotateStrike({
      runsScored,
      legalDelivery,
      ballsInCurrentOver: ballNumber,
      strikerId,
      nonStrikerId,
    }));
  } else if (legalDelivery && (strikerOut || retiredHurtStriker)) {
    const wicketTypeLower = (wicketType || "").toLowerCase();
    const nonStrikerDismissalTypes = ["run out", "obstructing the field"];
    let shouldRotate = false;

    if (nonStrikerDismissalTypes.includes(wicketTypeLower) && dismissedPlayerId === nonStrikerId) {
      shouldRotate = runsScored % 2 !== 0;
    } else if (["caught", "stumped", "run out", "hit wicket"].includes(wicketTypeLower)) {
      shouldRotate = isLastBall;
    }

    if (shouldRotate) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId === null ? null : nonStrikerId];
    } else {
      if (!strikerId && newBatsmanId) {
        strikerId = newBatsmanId;
      } else if (!strikerId) {
        strikerId = null;
      }
    }
  }

  // Calculate current run rate
  const currentRunRate = newBallsBowled > 0 ? newScore / (newBallsBowled / 6) : 0;

  // Determine target score (from innings table) for use in required run rate calculation
  // Fetch current inning target score in case it was set earlier by innings-end process
  const [[thisInningData]] = await conn.execute(
    `SELECT target_score FROM innings WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  const targetScore = thisInningData ? thisInningData.target_score : null;

  // Calculate required run rate if target score is set and applicable
  let requiredRunRate = null;
  if (targetScore !== null && targetScore > newScore && newBallsBowled > 0) {
    const ballsRemaining = MAX_OVERS * 6 - newBallsBowled;
    if (ballsRemaining > 0) {
      requiredRunRate = ((targetScore - newScore) * 6) / ballsRemaining;
    }
  }

  // Update live_scorecards with latest scores and strike info
  await conn.execute(
    `UPDATE live_scorecards
       SET current_score = ?, current_wickets = ?, legal_balls_in_over = ?,
           legal_over_count = ?, current_overs = ?, on_strike_batsman_id = ?,
           non_striker_batsman_id = ?, partnership_runs = partnership_runs + ?,
           last_updated = CURRENT_TIMESTAMP
       WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      newLegalBalls,
      legalOvers.toFixed(1),
      `${overNumber}.${ballNumber}`,
      strikerId,
      nonStrikerId,
      runsScored,
      inningId,
    ]
  );

  // Reset bowler if over completed
  if (legalDelivery) {
    await checkAndUnsetBowlerIfOverCompleted(conn, inningId, overNumber);
  }

  // Update last wicket info and clean out dismissed player from live scorecards if wicket happened
  if (isWicket && !isRetiredHurt && dismissedPlayerId) {
    await conn.execute(
      `UPDATE live_scorecards
         SET 
           on_strike_batsman_id = CASE WHEN on_strike_batsman_id = ? THEN NULL ELSE on_strike_batsman_id END,
           non_striker_batsman_id = CASE WHEN non_striker_batsman_id = ? THEN NULL ELSE non_striker_batsman_id END,
           batsman1_id = CASE WHEN batsman1_id = ? THEN NULL ELSE batsman1_id END,
           batsman2_id = CASE WHEN batsman2_id = ? THEN NULL ELSE batsman2_id END,
           last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ?
         WHERE inning_id = ?`,
      [
        dismissedPlayerId,
        dismissedPlayerId,
        dismissedPlayerId,
        dismissedPlayerId,
        dismissedPlayerId,
        `${overNumber}.${ballNumber}`,
        wicketType || null,
        inningId,
      ]
    );
  }

  // Update innings table totals, extras, balls, and calculated rates (run_rate is not handled here because presumed updated elsewhere)
  await conn.execute(
    `UPDATE innings
       SET total_runs = ?, wickets = ?, overs = ?, extras = extras + ?, balls_bowled = ?,
           target_score = ?, required_run_rate = ?
       WHERE inning_id = ?`,
    [
      newScore,
      newWickets,
      `${overNumber}.${ballNumber}`,
      extras,
      newBallsBowled,
      targetScore,
      requiredRunRate !== null ? requiredRunRate.toFixed(2) : null,
      inningId,
    ]
  );

  // Update player performances and stats for this ball delivery
  await playerPerfModel.updatePerformanceOnBall(conn, {
    matchId,
    batsmanId,
    bowlerId,
    runsScored,
    extras,
    isWicket,
    dismissedPlayerId,
    legalDelivery,
    wicketType,
    fielderId,
  });

  await playerStatsModel.updateStatsOnBall(conn, {
    batsmanId,
    bowlerId,
    runsScored,
    extras,
    isWicket,
    legalDelivery,
    wicketType,
    fielderId,
  });

  // Clear strike and bowler info on live_scorecards if innings ended (all wickets or overs)
  const oversFloor = Math.floor(parseFloat(legalOvers.toFixed(1)));
  if (newWickets >= MAX_WICKETS || oversFloor >= MAX_OVERS) {
    await conn.execute(
      `UPDATE live_scorecards
         SET on_strike_batsman_id = NULL,
             non_striker_batsman_id = NULL,
             batsman1_id = NULL,
             batsman2_id = NULL,
             bowler_id = NULL
         WHERE inning_id = ?`,
      [inningId]
    );
  }

  return true;
};
