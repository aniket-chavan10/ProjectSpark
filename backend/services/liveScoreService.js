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
      await ballsModel.getRecentBallsByInnings(conn, inning.inning_id, 6);
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
      addPlayerIds([w.player_out_id]);
    });
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

  team1.players = team1Players.map((p) => ({
    playerId: p.player_id,
    name: p.players_name,
    profilePicture: p.profile_picture,
    jerseyNumber: p.jersey_number || null,
    teamId: p.team_id,
  }));

  team2.players = team2Players.map((p) => ({
    playerId: p.player_id,
    name: p.players_name,
    profilePicture: p.profile_picture,
    jerseyNumber: p.jersey_number || null,
    teamId: p.team_id,
  }));

  // Helper function for current over summary
  function getCurrentOverSummary(recentBalls) {
    if (!recentBalls || recentBalls.length === 0) return [];
    const currentOverNumber = recentBalls[0].over_number;
    return recentBalls
      .filter((ball) => ball.over_number === currentOverNumber)
      .map((ball) => ({
        ballNumber: ball.ball_number,
        runs: ball.runs_scored,
        extras: ball.extra_type || null,
        wicket: ball.is_wicket === 1,
        ballOutcome: ball.ball_outcome,
        shotType: ball.shot_type,
      }));
  }

  // Build innings detailed view with overs string and run rate calculation
  const inningsDetailed = inningsList.map((inning) => {
    const ls = liveScoreMap[inning.inning_id];
    const currentBatsmen = [];

    if (ls) {
      const batsman1Id = ls.batsman1_id || null;
      const batsman2Id = ls.batsman2_id || null;
      const onStrikeId = ls.on_strike_batsman_id || null;

      const buildBatsman = (playerId, isOnStrike) => {
        if (!playerId) return null;
        const bat = playerMap[playerId] || {};
        const perf = performanceMap[playerId] || {};
        return {
          playerId,
          name: bat.name || null,
          profilePicture: bat.profilePicture || null,
          jerseyNumber: bat.jerseyNumber || null,
          runs: perf.runs_scored ?? 0,
          balls: perf.balls_faced ?? 0,
          fours: perf.fours ?? 0,
          sixes: perf.sixes ?? 0,
          strikeRate: perf.strike_rate ?? "0.00",
          isOnStrike,
        };
      };

      if (batsman1Id && batsman2Id) {
        if (batsman1Id === onStrikeId) {
          currentBatsmen.push(buildBatsman(batsman1Id, true));
          currentBatsmen.push(buildBatsman(batsman2Id, false));
        } else if (batsman2Id === onStrikeId) {
          currentBatsmen.push(buildBatsman(batsman2Id, true));
          currentBatsmen.push(buildBatsman(batsman1Id, false));
        } else {
          currentBatsmen.push(buildBatsman(batsman1Id, true));
          currentBatsmen.push(buildBatsman(batsman2Id, false));
        }
      } else {
        // Handle case when only one batsman remains
        if (batsman1Id) {
          currentBatsmen.push(
            buildBatsman(batsman1Id, batsman1Id === onStrikeId)
          );
        }
        if (batsman2Id) {
          currentBatsmen.push(
            buildBatsman(batsman2Id, batsman2Id === onStrikeId)
          );
        }
      }

      if (batsman1Id && batsman2Id) {
        if (batsman1Id === onStrikeId) {
          currentBatsmen.push(buildBatsman(batsman1Id, true));
          currentBatsmen.push(buildBatsman(batsman2Id, false));
        } else if (batsman2Id === onStrikeId) {
          currentBatsmen.push(buildBatsman(batsman2Id, true));
          currentBatsmen.push(buildBatsman(batsman1Id, false));
        } else {
          currentBatsmen.push(buildBatsman(batsman1Id, true));
          currentBatsmen.push(buildBatsman(batsman2Id, false));
        }
      } else if (batsman1Id) {
        currentBatsmen.push(
          buildBatsman(batsman1Id, batsman1Id === onStrikeId)
        );
      }
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
        economy: perf.economy_rate ?? "0.00",
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
    const extrasBreakdown = {
      wides: inning.wides || 0,
      noBalls: inning.no_balls || 0,
      byes: inning.byes || 0,
      legByes: inning.leg_byes || 0,
      penalty: inning.penalty_runs || 0,
      total: inning.extras || 0,
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
    const wicketFalls = (wicketsPerInnings[inning.inning_id] || []).map((w) => {
      const playerOut = playerMap[w.player_out_id] || {};
      return {
        playerOutId: w.player_out_id,
        playerOutName: playerOut.name || null,
        over: w.over ?? null,
        description: w.description ?? null,
      };
    });

    return {
      inningId: inning.inning_id,
      teamId: inning.team_id,
      totalRuns: inning.total_runs,
      wickets: inning.wickets,
      overs: oversString,
      ballsBowled: inning.balls_bowled,
      extrasBreakdown,
      inningsNumber: inning.innings_number,
      runRate: parseFloat(inning.run_rate) || 0,
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
