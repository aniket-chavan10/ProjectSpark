const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const liveScorecardModel = require("../models/liveScorecardModel");
const ballsModel = require("../models/ballModel");
const playerModel = require("../models/playerModel");
const teamModel = require("../models/teamModel");
const performanceModel = require("../models/playerPerformanceModel");

exports.getLiveScoreboard = async (conn, matchId) => {
  // Fetch match data
  const match = await matchModel.getMatchDetails(conn, matchId);
  if (!match) throw new Error("Match not found");

  const MAX_OVERS = match.total_overs || 5;

  // Fetch all innings
  const inningsList = await inningsModel.getInningsByMatch(conn, matchId);

  // Fetch live scorecards
  const liveScorecards = await liveScorecardModel.getLiveScorecardsByMatch(
    conn,
    matchId
  );
  const liveScoreMap = {};
  liveScorecards.forEach((ls) => {
    liveScoreMap[ls.inning_id] = ls;
  });

  // Fetch performance stats for batsmen and bowlers
  const performanceStats = await performanceModel.getPerformanceStatsByMatch(
    conn,
    matchId
  );
  const performanceMap = {};
  performanceStats.forEach((stat) => {
    performanceMap[stat.player_id] = stat;
  });

  // Collect relevant player IDs
  const playerIdsSet = new Set();
  const addPlayerIds = (ids) =>
    ids.filter(Boolean).forEach((id) => playerIdsSet.add(id));

  inningsList.forEach(({ inning_id }) => {
    const ls = liveScoreMap[inning_id];
    if (ls) {
      addPlayerIds([
        ls.on_strike_batsman_id,
        ls.non_striker_batsman_id,
        ls.batsman1_id,
        ls.batsman2_id,
        ls.bowler_id,
        ls.last_wicket_player_id,
      ]);
    }
  });

  // Recent balls per innings
  const ballsPerInnings = {};
  for (const inning of inningsList) {
    ballsPerInnings[inning.inning_id] =
      await ballsModel.getRecentBallsByInnings(conn, inning.inning_id, 12);
    ballsPerInnings[inning.inning_id].forEach((ball) => {
      addPlayerIds([
        ball.batsman_id,
        ball.bowler_id,
        ball.dismissed_player_id,
        ball.fielder_id,
      ]);
    });
  }

  // Wicket falls per innings
  const wicketsPerInnings = {};
  for (const inning of inningsList) {
    wicketsPerInnings[inning.inning_id] =
      await ballsModel.getWicketFallByInnings(conn, inning.inning_id);
    wicketsPerInnings[inning.inning_id].forEach((w) => {
      addPlayerIds([w.dismissed_player_id, w.bowler_id, w.fielder_id]);
    });
  }

  // Extras per type, taken from the ball log (the single source of truth)
  const extrasPerInnings = {};
  for (const inning of inningsList) {
    const rows = await ballsModel.getExtrasBreakdownByInnings(conn, inning.inning_id);
    const byType = {};
    rows.forEach((r) => {
      byType[r.extra_type] = Number(r.total) || 0;
    });
    extrasPerInnings[inning.inning_id] = byType;
  }

  // Players map
  const players = await playerModel.getPlayersByIds(
    conn,
    Array.from(playerIdsSet)
  );
  const playerMap = {};
  players.forEach((p) => {
    playerMap[p.player_id] = {
      name: p.players_name,
      profilePicture: p.profile_picture,
      jerseyNumber: p.jersey_number || null,
      teamId: p.team_id,
    };
  });

  // Teams
  const team1 = await teamModel.getTeamById(conn, match.team1_id);
  const team2 = await teamModel.getTeamById(conn, match.team2_id);

  // Get players of each team
  const team1Players = await playerModel.getPlayersByTeam(conn, match.team1_id);
  const team2Players = await playerModel.getPlayersByTeam(conn, match.team2_id);

  // A knockout match can still be waiting for its teams (team ids are null)
  const toPlayerList = (list) =>
    list.map((p) => ({
      playerId: p.player_id,
      name: p.players_name,
      profilePicture: p.profile_picture,
      jerseyNumber: p.jersey_number || null,
      teamId: p.team_id,
    }));
  if (team1) team1.players = toPlayerList(team1Players);
  if (team2) team2.players = toPlayerList(team2Players);

  // Helper function for current over summary (oldest ball first)
  function getCurrentOverSummary(recentBalls) {
    if (!recentBalls || recentBalls.length === 0) return [];
    const currentOverNumber = recentBalls[0].over_number;
    return recentBalls
      .filter((ball) => ball.over_number === currentOverNumber)
      .sort((a, b) => a.ball_number - b.ball_number)
      .map((ball) => ({
        ballNumber: ball.ball_number,
        runs: ball.runs_scored,
        extras: ball.extra_type || null,
        extraRuns: ball.extras || 0,
        wicket: Number(ball.is_wicket) === 1,
        ballOutcome: ball.ball_outcome,
        shotType: ball.shot_type,
      }));
  }

  // Strike rate and economy are derived here from raw figures instead of trusting stored columns
  const strikeRateOf = (runs, balls) => (balls > 0 ? ((runs * 100) / balls).toFixed(2) : "0.00");
  const economyOf = (conceded, overs) => {
    const whole = Math.floor(Number(overs) || 0);
    const balls = whole * 6 + Math.round(((Number(overs) || 0) - whole) * 10);
    return balls > 0 ? ((conceded * 6) / balls).toFixed(2) : "0.00";
  };

  // Build innings detailed view with overs string and run rate calculation
  const inningsDetailed = inningsList.map((inning) => {
    const ls = liveScoreMap[inning.inning_id];
    const currentBatsmen = [];

    if (ls) {
      const onStrikeId = ls.on_strike_batsman_id || null;
      const nonStrikerId = ls.non_striker_batsman_id || null;

      const buildBatsman = (playerId, isOnStrike) => {
        if (!playerId) return null;
        const bat = playerMap[playerId] || {};
        const perf = performanceMap[playerId] || {};
        const runs = perf.runs_scored ?? 0;
        const balls = perf.balls_faced ?? 0;
        return {
          playerId,
          name: bat.name || null,
          profilePicture: bat.profilePicture || null,
          jerseyNumber: bat.jerseyNumber || null,
          runs,
          balls,
          fours: perf.fours ?? 0,
          sixes: perf.sixes ?? 0,
          strikeRate: strikeRateOf(runs, balls),
          isOnStrike,
        };
      };

      // Striker first, then the non-striker. A batsman who is out (null slot) is simply left out.
      [buildBatsman(onStrikeId, true), buildBatsman(nonStrikerId, false)]
        .filter(Boolean)
        .forEach((b) => currentBatsmen.push(b));
    }

    const completedOvers = Math.floor(inning.balls_bowled / 6);
    const ballsInCurrentOver = inning.balls_bowled % 6;
    const oversString = `${completedOvers}.${ballsInCurrentOver}`;

    // Bowler info
    let currentBowler = null;
    if (ls && ls.bowler_id) {
      const bow = playerMap[ls.bowler_id] || {};
      const perf = performanceMap[ls.bowler_id] || {};
      currentBowler = {
        playerId: ls.bowler_id,
        name: bow.name || null,
        profilePicture: bow.profilePicture || null,
        jerseyNumber: bow.jerseyNumber || null,
        overs: perf.overs_bowled ?? "0.0",
        maidens: perf.maiden_overs ?? 0,
        runsConceded: perf.total_runs_conceded ?? 0,
        wickets: perf.wickets_taken ?? 0,
        economy: economyOf(perf.total_runs_conceded ?? 0, perf.overs_bowled ?? 0),
      };
    }

    // Last wicket info
    let lastWicket = null;
    if (ls && ls.last_wicket_player_id) {
      const lastWicketPlayer = playerMap[ls.last_wicket_player_id] || {};
      lastWicket = {
        playerOutId: ls.last_wicket_player_id,
        playerOutName: lastWicketPlayer.name || null,
        over: ls.last_wicket_over ?? null,
        description: ls.last_wicket_description ?? null,
      };
    }

    // Extras breakdown
    const extrasByType = extrasPerInnings[inning.inning_id] || {};
    const extrasBreakdown = {
      wides: extrasByType["wide"] || 0,
      noBalls: extrasByType["no-ball"] || 0,
      byes: extrasByType["bye"] || 0,
      legByes: extrasByType["leg-bye"] || 0,
      penalty: 0,
      total: Object.values(extrasByType).reduce((a, b) => a + b, 0),
    };

    // Target score
    const targetScore = inning.target_score || match.target_score || null;

    // Required Run Rate calculation
    const totalBalls = (match.total_overs || 5) * 6;
    const ballsBowled = inning.balls_bowled || 0;
    const runsRequired =
      (inning.target_score || match.target_score || 0) -
      (inning.total_runs || 0);
    const ballsRemaining = totalBalls - ballsBowled;

    let requiredRunRate = null;
    if ((inning.innings_number || 1) > 1) {
      if (targetScore && ballsRemaining > 0 && runsRequired > 0) {
        requiredRunRate = parseFloat(
          (runsRequired / (ballsRemaining / 6)).toFixed(2)
        );
      } else if (targetScore) {
        requiredRunRate = 0;
      }
    }

    // Current over summary
    const currentOverSummary = getCurrentOverSummary(
      ballsPerInnings[inning.inning_id]
    );

    // Wicket falls
    const wicketFalls = (wicketsPerInnings[inning.inning_id] || []).map((w, idx) => {
      const playerOut = playerMap[w.dismissed_player_id] || {};
      const bowler = playerMap[w.bowler_id] || {};
      const fielder = playerMap[w.fielder_id] || {};
      return {
        wicketNumber: idx + 1,
        playerOutId: w.dismissed_player_id,
        playerOutName: playerOut.name || null,
        scoreAtFall: Number(w.score_at_fall) || 0,
        over: `${Math.floor(w.legal_balls_upto / 6)}.${w.legal_balls_upto % 6}`,
        wicketType: w.wicket_type || null,
        bowlerId: w.bowler_id || null,
        bowlerName: bowler.name || null,
        fielderId: w.fielder_id || null,
        fielderName: fielder.name || null,
        description: w.wicket_type || null,
      };
    });

    const currentRunRate = ballsBowled > 0 ? parseFloat(((inning.total_runs || 0) * 6 / ballsBowled).toFixed(2)) : 0;

    return {
      inningId: inning.inning_id,
      teamId: inning.team_id,
      totalRuns: inning.total_runs,
      wickets: inning.wickets,
      overs: oversString,
      ballsBowled: inning.balls_bowled,
      extrasBreakdown,
      inningsNumber: inning.innings_number,
      runRate: currentRunRate,
      requiredRunRate,
      targetScore,
      status: inning.status || "in_progress",
      partnershipRuns: ls?.partnership_runs || 0,
      currentBatsmen,
      currentBowler,
      lastWicket,
      recentBalls: ballsPerInnings[inning.inning_id] || [],
      currentOverSummary,
      wicketFalls,
    };
  });

  // Match status and meta flags
  const matchStatus = match.status || "live";
  const isSuperOver = !!match.is_super_over;

  // Winner & Margin calculation
  let matchResult = null;
  const innings1 = inningsDetailed.find((i) => i.inningsNumber === 1);
  const innings2 = inningsDetailed.find((i) => i.inningsNumber === 2);

  if (
    matchStatus === "completed" &&
    innings1 &&
    innings2 &&
    typeof innings2.targetScore === "number"
  ) {
    const team1Runs = innings1.totalRuns || 0;
    const team2Runs = innings2.totalRuns || 0;
    const team2Wkts = innings2.wickets ?? 0;
    const target = innings2.targetScore;
    const wicketsLeft = 10 - (team2Wkts || 0);
    if (team2Runs >= target) {
      matchResult = {
        winnerTeamId: innings2.teamId,
        winnerTeamName:
          team2?.id === innings2.teamId ? team2?.team_name : team1?.team_name,
        marginType: "wickets",
        marginValue: wicketsLeft,
      };
    } else if (team2Runs === team1Runs) {
      // Scores level: a tie has no winner
      matchResult = {
        winnerTeamId: null,
        winnerTeamName: null,
        marginType: "tie",
        marginValue: 0,
      };
    } else {
      const runsMargin = (team1Runs || 0) - (team2Runs || 0); // Calculate runs margin here
      matchResult = {
        winnerTeamId: innings1.teamId,
        winnerTeamName:
          team1?.id === innings1.teamId ? team1?.team_name : team2?.team_name,
        marginType: "runs",
        marginValue: runsMargin,
      };
    }
  }

  // Final aggregated response
  return {
    matchId: match.match_id,
    tournamentId: match.tournament_id,
    matchNo: match.match_no,
    date: match.date,
    venue: match.venue,
    tossWinnerId: match.toss_winner_id,
    tossDecision: match.toss_decision,
    maxOvers: MAX_OVERS,
    targetScore: match.target_score,
    status: matchStatus,
    isSuperOver,
    innings: inningsDetailed,
    teams: {
      team1: {
        id: team1?.id || match.team1_id,
        name: team1?.team_name || `Team_${match.team1_id}`,
        logo: team1?.logo || null,
        players: team1?.players || [],
      },
      team2: {
        id: team2?.id || match.team2_id,
        name: team2?.team_name || `Team_${match.team2_id}`,
        logo: team2?.logo || null,
        players: team2?.players || [],
      },
    },
    matchResult, // Winner, margin etc.
  };
};
