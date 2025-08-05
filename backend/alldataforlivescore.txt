const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const liveScorecardModel = require("../models/liveScorecardModel");
const ballsModel = require("../models/ballModel");
const playerModel = require("../models/playerModel");
const teamModel = require("../models/teamModel");

/**
 * Fetch and build live scoreboard data for a given matchId enhanced with more details
 */
exports.getLiveScoreboard = async (conn, matchId) => {
  // Fetch match data
  const match = await matchModel.getMatchDetails(conn, matchId);
  if (!match) throw new Error("Match not found");

  const MAX_OVERS = match.total_overs || 5;

  // Fetch all innings for this match, sorted by innings_number
  const inningsList = await inningsModel.getInningsByMatch(conn, matchId);

  // Fetch live scorecards for all innings
  const liveScorecards = await liveScorecardModel.getLiveScorecardsByMatch(conn, matchId);

  // Map innings id to live scorecard for fast access
  const liveScoreMap = {};
  liveScorecards.forEach((ls) => {
    liveScoreMap[ls.inning_id] = ls;
  });

  // Collect all relevant player IDs for batch lookup
  const playerIdsSet = new Set();

  const addPlayerIds = (ids) => {
    ids.filter(Boolean).forEach((id) => playerIdsSet.add(id));
  };

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

  // Fetch recent balls (last 6 balls) for each innings
  const ballsPerInnings = {};
  for (const inning of inningsList) {
    ballsPerInnings[inning.inning_id] = await ballsModel.getRecentBallsByInnings(conn, inning.inning_id, 6);

    // Add player IDs from recent balls for batsman, bowler, dismissed, fielder
    ballsPerInnings[inning.inning_id].forEach((ball) => {
      addPlayerIds([ball.batsman_id, ball.bowler_id, ball.dismissed_player_id, ball.fielder_id]);
    });
  }

  // Fetch wicket fall history per innings (assuming ballsModel has a method)
  const wicketsPerInnings = {};
  for (const inning of inningsList) {
    wicketsPerInnings[inning.inning_id] = await ballsModel.getWicketFallByInnings(conn, inning.inning_id);
    // Add dismissed players from wicket falls to playerIdsSet for names
    wicketsPerInnings[inning.inning_id].forEach((w) => {
      addPlayerIds([w.player_out_id]);
    });
  }

  // Fetch all relevant players' details (name, profile_picture, jersey number if available)
  const players = await playerModel.getPlayersByIds(conn, Array.from(playerIdsSet));
  const playerMap = {};
  players.forEach((p) => {
    playerMap[p.player_id] = {
      name: p.players_name,
      profilePicture: p.profile_picture,
      jerseyNumber: p.jersey_number || null,  // Add field if your db has it; else null
      teamId: p.team_id,
    };
  });

  // Fetch teams info properly from DB
  const team1 = await teamModel.getTeamById(conn, match.team1_id);
  const team2 = await teamModel.getTeamById(conn, match.team2_id);

  // Helper to build current over summary from recent balls
  function getCurrentOverSummary(recentBalls) {
    if (!recentBalls || recentBalls.length === 0) return [];
    const currentOverNumber = recentBalls[0].over_number;
    return recentBalls
      .filter(ball => ball.over_number === currentOverNumber)
      .map(ball => ({
        ballNumber: ball.ball_number,
        runs: ball.runs_scored,
        extras: ball.extra_type || null,
        wicket: ball.is_wicket === 1,
        ballOutcome: ball.ball_outcome,
        shotType: ball.shot_type,
      }));
  }

  // Build detailed innings array
  const inningsDetailed = inningsList.map((inning) => {
    const ls = liveScoreMap[inning.inning_id];

    // Current batsmen detailed with enriched stats
    const currentBatsmen = [];
    if (ls) {
      if (ls.on_strike_batsman_id) {
        const bat = playerMap[ls.on_strike_batsman_id] || {};
        currentBatsmen.push({
          playerId: ls.on_strike_batsman_id,
          name: bat.name || null,
          profilePicture: bat.profilePicture || null,
          jerseyNumber: bat.jerseyNumber || null,
          runs: ls.on_strike_runs ?? null,
          balls: ls.on_strike_balls ?? null,
          fours: ls.on_strike_fours ?? null,
          sixes: ls.on_strike_sixes ?? null,
          strikeRate: ls.on_strike_strike_rate ?? null,
          isOnStrike: true,
        });
      }
      if (ls.non_striker_batsman_id) {
        const bat = playerMap[ls.non_striker_batsman_id] || {};
        currentBatsmen.push({
          playerId: ls.non_striker_batsman_id,
          name: bat.name || null,
          profilePicture: bat.profilePicture || null,
          jerseyNumber: bat.jerseyNumber || null,
          runs: ls.non_striker_runs ?? null,
          balls: ls.non_striker_balls ?? null,
          fours: ls.non_striker_fours ?? null,
          sixes: ls.non_striker_sixes ?? null,
          strikeRate: ls.non_striker_strike_rate ?? null,
          isOnStrike: false,
        });
      }
    }

    // Current bowler detailed stats
    let currentBowler = null;
    if (ls && ls.bowler_id) {
      const bow = playerMap[ls.bowler_id] || {};
      currentBowler = {
        playerId: ls.bowler_id,
        name: bow.name || null,
        profilePicture: bow.profilePicture || null,
        jerseyNumber: bow.jerseyNumber || null,
        overs: ls.bowler_overs ?? null,
        maidens: ls.bowler_maidens ?? null,
        runsConceded: ls.bowler_runs_conceded ?? null,
        wickets: ls.bowler_wickets ?? null,
        economy: ls.bowler_economy ?? null,
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

    // Extras breakdown (extend innings model to include these fields or aggregate)
    const extrasBreakdown = {
      wides: inning.wides || 0,
      noBalls: inning.no_balls || 0,
      byes: inning.byes || 0,
      legByes: inning.leg_byes || 0,
      penalty: inning.penalty_runs || 0,
      total: inning.extras || 0,
    };

    // Target and required run rate calculations
    // Assuming your DB or business logic has functions to calculate or fields for these
    // If needed, compute here based on score, balls left, etc.
    const targetScore = inning.target_score || match.target_score || null;
    const requiredRunRate = parseFloat(inning.required_run_rate) || null;

    // Current over summary from recent balls
    const currentOverSummary = getCurrentOverSummary(ballsPerInnings[inning.inning_id]);

    // Wicket fall history array, mapped with player names
    const wicketFalls = (wicketsPerInnings[inning.inning_id] || []).map(w => {
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
      overs: inning.overs,
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

  // Additional match status flags you can add or compute here
  const matchStatus = match.status || "live"; // e.g. 'live', 'completed', 'delayed'
  const isSuperOver = !!match.is_super_over;

  // Compose final scoreboard object
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
      },
      team2: {
        id: team2?.id || match.team2_id,
        name: team2?.team_name || `Team_${match.team2_id}`,
        logo: team2?.logo || null,
      },
    },
  };
};
