const matchModel = require("../models/matchModel");
const inningsModel = require("../models/inningsModel");
const liveScorecardModel = require("../models/liveScorecardModel");
const ballsModel = require("../models/ballModel");
const playerModel = require("../models/playerModel");
const teamModel = require("../models/teamModel");
const performanceModel = require("../models/playerPerformanceModel");

exports.getLiveScoreboard = async (conn, matchId) => {
  // Fetch match details and teams info
  const [matchRows] = await conn.query(
    `SELECT * FROM matches WHERE match_id = ?`,
    [matchId]
  );
  if (!matchRows.length) throw new Error("Match not found");
  const match = matchRows[0];
  const MAX_OVERS = match.total_overs || 5;

  // Fetch innings list for the match
  const [inningsList] = await conn.query(
    `SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number`,
    [matchId]
  );

  // Fetch balls for the match from balls table (only active balls)
  const [matchBalls] = await conn.query(
    `SELECT b.* FROM balls b
     INNER JOIN overs o ON b.over_id = o.over_id
     INNER JOIN innings i ON b.inning_id = i.inning_id
     WHERE i.match_id = ? AND b.is_active = 1
     ORDER BY b.inning_id, b.over_number, b.ball_number`,
    [matchId]
  );

  // Aggregate needed data structures
  const inningsStatsMap = {};
  const playerStatsMap = {}; // NOW nested by innings: playerStatsMap[inning_id][player_id]
  const playerIdsSet = new Set();

  // Helper: Add player ids
  const addPlayers = (ids) =>
    ids.filter(Boolean).forEach((id) => playerIdsSet.add(id));

  // Process balls to aggregate innings and player stats
  matchBalls.forEach((ball) => {
    const {
      inning_id,
      batsman_id,
      bowler_id,
      runs_scored,
      is_wicket,
      wicket_type,
      dismissed_player_id,
      fielder_id,
      extras,
      extra_type,
      legal_delivery,
      over_number,
      ball_number,
      shot_type,
      ball_outcome,
    } = ball;

    // Initialize innings
    if (!inningsStatsMap[inning_id]) {
      inningsStatsMap[inning_id] = {
        totalRuns: 0,
        wickets: 0,
        extrasBreakdown: {
          wides: 0,
          noBalls: 0,
          byes: 0,
          legByes: 0,
          penalty: 0,
          total: 0,
        },
        ballsBowled: 0,
        balls: [],
        lastWicket: null,
      };
    }
    const inningsStats = inningsStatsMap[inning_id];

    inningsStats.totalRuns += runs_scored + extras;
    inningsStats.extrasBreakdown.total += extras;

    if (extras > 0) {
      switch (extra_type) {
        case "wide":
          inningsStats.extrasBreakdown.wides += extras;
          break;
        case "no ball":
          inningsStats.extrasBreakdown.noBalls += extras;
          break;
        case "bye":
          inningsStats.extrasBreakdown.byes += extras;
          break;
        case "leg bye":
          inningsStats.extrasBreakdown.legByes += extras;
          break;
      }
    }

    if (is_wicket === 1) {
      inningsStats.wickets++;
      inningsStats.lastWicket = {
        playerOutId: dismissed_player_id,
        wicketType: wicket_type,
        over: over_number,
        ballNumber: ball_number,
        description: wicket_type,
      };
    }

    if (legal_delivery === 1) {
      inningsStats.ballsBowled++;
    }

    inningsStats.balls.push(ball);

    // --- IMPORTANT CHANGE: Nest playerStats by inning_id ---

    // Initialize nested map per innings id
    if (!playerStatsMap[inning_id]) playerStatsMap[inning_id] = {};

    // Batting stats aggregation
    if (!playerStatsMap[inning_id][batsman_id]) {
      playerStatsMap[inning_id][batsman_id] = {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: "0.00",
      };
    }
    const batsmanStats = playerStatsMap[inning_id][batsman_id];
    if (legal_delivery === 1) {
      batsmanStats.ballsFaced++;
      batsmanStats.runs += runs_scored;
      if (runs_scored === 4) batsmanStats.fours++;
      if (runs_scored === 6) batsmanStats.sixes++;
    }
    batsmanStats.strikeRate =
      batsmanStats.ballsFaced > 0
        ? ((batsmanStats.runs / batsmanStats.ballsFaced) * 100).toFixed(2)
        : "0.00";

    // Bowling stats aggregation
    if (!playerStatsMap[inning_id][bowler_id]) {
      playerStatsMap[inning_id][bowler_id] = {
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        maidenOvers: 0,
        oversDetails: {},
        economy: "0.00",
      };
    }
    const bowlerStats = playerStatsMap[inning_id][bowler_id];
    if (legal_delivery === 1) {
      bowlerStats.ballsBowled++;
      const runsAgainstBowler =
        runs_scored +
        (extra_type === "bye" || extra_type === "leg bye" ? 0 : extras);
      bowlerStats.runsConceded += runsAgainstBowler;
      if (!bowlerStats.oversDetails) {
        bowlerStats.oversDetails = {};
      }
      if (!bowlerStats.oversDetails[over_number]) {
        bowlerStats.oversDetails[over_number] = 0;
      }
      bowlerStats.oversDetails[over_number] += runsAgainstBowler;
    }
    if (
      is_wicket === 1 &&
      wicket_type &&
      ["bowled", "caught", "lbw", "stumped", "hit wicket"].includes(wicket_type)
    ) {
      bowlerStats.wicketsTaken++;
    }

    // Track player IDs
    addPlayers([batsman_id, bowler_id, dismissed_player_id, fielder_id]);
  });

  // Fetch live scorecards for current state (strike, bowlers etc)
  const [liveScorecards] = await conn.query(
    `SELECT l.inning_id, l.batsman1_id, l.batsman2_id, l.on_strike_batsman_id,
            l.non_striker_batsman_id, l.bowler_id, l.partnership_runs, 
            l.last_wicket_player_id, l.last_wicket_over, l.last_wicket_description,
            l.target_score
     FROM live_scorecards l
     WHERE l.match_id = ?`,
    [matchId]
  );
  const liveScoreMap = {};
  liveScorecards.forEach((l) => {
    liveScoreMap[l.inning_id] = l;
    // Add live scorecard player IDs to playerIdsSet for fetching player details
    addPlayers([
      l.batsman1_id,
      l.batsman2_id,
      l.on_strike_batsman_id,
      l.non_striker_batsman_id,
      l.bowler_id,
      l.last_wicket_player_id,
    ]);
  });

  // Calculate maidens, overs, economy for bowlers - per innings nested map  
  Object.entries(playerStatsMap).forEach(([inningId, playerStats]) => {
    Object.values(playerStats).forEach((stats) => {
      if (stats.oversDetails) {
        stats.maidenOvers = Object.values(stats.oversDetails).filter(
          (runs) => runs === 0
        ).length;
        const oversCount = Math.floor(stats.ballsBowled / 6);
        const ballsLeft = stats.ballsBowled % 6;
        stats.overs = `${oversCount}.${ballsLeft}`;
        stats.economy =
          stats.ballsBowled > 0
            ? ((stats.runsConceded * 6) / stats.ballsBowled).toFixed(2)
            : "0.00";
      }
    });
  });

  // Get recent balls - last 6 per innings
  const ballsPerInnings = {};
  for (const inning of inningsList) {
    const balls = inningsStatsMap[inning.inning_id]?.balls || [];
    ballsPerInnings[inning.inning_id] = balls.slice(-6);
  }

  // Get wickets per innings from balls
  const wicketsPerInnings = {};
  for (const inning of inningsList) {
    wicketsPerInnings[inning.inning_id] =
      inningsStatsMap[inning.inning_id]?.balls
        .filter((b) => b.is_wicket === 1)
        .map((b) => ({
          player_out_id: b.dismissed_player_id,
          over: b.over_number,
          description: b.wicket_type,
        })) || [];
  }

  // Fetch players info (names, pictures, teamId)
  const playerIdsArray = [...playerIdsSet];
  let players = [];
  if (playerIdsArray.length > 0) {
    [players] = await conn.query(
      `SELECT player_id, players_name, profile_picture, team_id FROM players_core WHERE player_id IN (?)`,
      [playerIdsArray]
    );
  } else {
    players = [];
  }

  const playerMap = {};
  players.forEach((p) => {
    playerMap[p.player_id] = {
      name: p.players_name,
      profilePicture: p.profile_picture,
      teamId: p.team_id,
    };
  });

  // Fetch teams info
  const [team1Rows] = await conn.query(`SELECT * FROM teams WHERE id = ?`, [
    match.team1_id,
  ]);
  const [team2Rows] = await conn.query(`SELECT * FROM teams WHERE id = ?`, [
    match.team2_id,
  ]);
  const team1 = team1Rows[0] || {};
  const team2 = team2Rows[0] || {};

  // Fetch players per team
  const [team1Players] = await conn.query(
    `SELECT player_id, players_name, profile_picture,  team_id FROM players_core WHERE team_id = ?`,
    [match.team1_id]
  );
  const [team2Players] = await conn.query(
    `SELECT player_id, players_name, profile_picture,  team_id FROM players_core WHERE team_id = ?`,
    [match.team2_id]
  );

  team1.players = team1Players.map((p) => ({
    playerId: p.player_id,
    name: p.players_name,
    profilePicture: p.profile_picture,
    teamId: p.team_id,
  }));
  team2.players = team2Players.map((p) => ({
    playerId: p.player_id,
    name: p.players_name,
    profilePicture: p.profile_picture,
    teamId: p.team_id,
  }));

  function getCurrentOverSummary(recentBalls) {
    if (!recentBalls || recentBalls.length === 0) return [];

    const currentOverNumber = Math.max(
      ...recentBalls.map((ball) => ball.over_number)
    );

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

  // Build innings detailed data
  const inningsDetailed = await Promise.all(
    inningsList.map(async (inning) => {
      const iStats = inningsStatsMap[inning.inning_id] || {};
      const recentBalls = ballsPerInnings[inning.inning_id] || [];

      // Extract batsmen in order from balls array
      const ballsArray = Array.isArray(iStats.balls) ? iStats.balls : [];
      const batsmenInOrder = [];
      for (
        let i = ballsArray.length - 1;
        i >= 0 && batsmenInOrder.length < 2;
        i--
      ) {
        const b = ballsArray[i];
        if (b.legal_delivery === 1 && !batsmenInOrder.includes(b.batsman_id))
          batsmenInOrder.push(b.batsman_id);
      }

      // Get live score for this inning from live_scorecards
      const liveScore = liveScoreMap[inning.inning_id] || {};

      const batsman1Id = liveScore.batsman1_id || null;
      const batsman2Id = liveScore.batsman2_id || null;
      const onStrikeId = liveScore.on_strike_batsman_id || null;
      const nonStrikeId = liveScore.non_striker_batsman_id || null;
      const bowlerId = liveScore.bowler_id || null;

      // Build batsman info helper
      const buildBatsman = (playerId, isOnStrike) => {
        if (!playerId) return null;
        const bat = playerMap[playerId] || {};
        const perf =
          (playerStatsMap[inning.inning_id] &&
            playerStatsMap[inning.inning_id][playerId]) ||
          {};
        return {
          playerId,
          name: bat.name || null,
          profilePicture: bat.profilePicture || null,
          jerseyNumber: bat.jerseyNumber || null,
          runs: perf.runs || 0,
          balls: perf.ballsFaced || 0,
          fours: perf.fours || 0,
          sixes: perf.sixes || 0,
          strikeRate: perf.strikeRate || "0.00",
          isOnStrike,
        };
      };

      // Build current batsmen array, prioritizing proper strike info from liveScore
      const currentBatsmen = [];
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
        if (batsman1Id)
          currentBatsmen.push(
            buildBatsman(batsman1Id, batsman1Id === onStrikeId)
          );
        if (batsman2Id)
          currentBatsmen.push(
            buildBatsman(batsman2Id, batsman2Id === onStrikeId)
          );
      }

      // Current bowler info
      let currentBowler = null;
      if (bowlerId) {
        const bow = playerMap[bowlerId] || {};
        const perf =
          (playerStatsMap[inning.inning_id] &&
            playerStatsMap[inning.inning_id][bowlerId]) ||
          {};
        currentBowler = {
          playerId: bowlerId,
          name: bow.name || null,
          profilePicture: bow.profilePicture || null,
          jerseyNumber: bow.jerseyNumber || null,
          overs: perf.overs || "0.0",
          maidens: perf.maidenOvers || 0,
          runsConceded: perf.runsConceded || 0,
          wickets: perf.wicketsTaken || 0,
          economy: perf.economy || "0.00",
        };
      }

      // String version of overs bowled in innings
      const completedOvers = Math.floor(iStats.ballsBowled / 6);
      const ballsInCurrentOver = iStats.ballsBowled % 6;
      const oversString = `${completedOvers}.${ballsInCurrentOver}`;

      // Extras breakdown directly from aggregated stats
      const extrasBreakdown = iStats.extrasBreakdown || {
        wides: 0,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        penalty: 0,
        total: 0,
      };

      // Calculate required run rate for innings > 1
      const targetScore = inning.target_score || match.target_score || null;
      const totalBalls = (match.total_overs || 5) * 6;
      const runsRequired = targetScore - (iStats.totalRuns || 0);
      const ballsRemaining = totalBalls - (iStats.ballsBowled || 0);

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
      const currentOverSummary = getCurrentOverSummary(recentBalls);

      // Wicket falls
      const wicketFalls = (wicketsPerInnings[inning.inning_id] || []).map(
        (w) => {
          const playerOut = playerMap[w.player_out_id] || {};
          return {
            playerOutId: w.player_out_id,
            playerOutName: playerOut.name || null,
            over: w.over ?? null,
            description: w.description ?? null,
          };
        }
      );

      return {
        inningId: inning.inning_id,
        teamId: inning.team_id,
        totalRuns: iStats.totalRuns || 0,
        wickets: iStats.wickets || 0,
        overs: oversString,
        ballsBowled: iStats.ballsBowled || 0,
        extrasBreakdown,
        inningsNumber: inning.innings_number,
        runRate: inning.run_rate ? parseFloat(inning.run_rate) : 0,
        requiredRunRate,
        targetScore,
        status: inning.status || "in_progress",
        partnershipRuns: 0, // Can be calculated if needed from balls later
        currentBatsmen,
        currentBowler,
        lastWicket: iStats.lastWicket,
        recentBalls,
        currentOverSummary,
        wicketFalls,
      };
    })
  );

  // Match status & meta flags
  const matchStatus = match.status || "live";
  const isSuperOver = !!match.is_super_over;

  // Calculate result if match completed & 2 innings present
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
          team2.id === innings2.teamId ? team2.team_name : team1.team_name,
        marginType: "wickets",
        marginValue: wicketsLeft,
      };
    } else {
      const runsMargin = (team1Runs || 0) - (team2Runs || 0);
      matchResult = {
        winnerTeamId: innings1.teamId,
        winnerTeamName:
          team1.id === innings1.teamId ? team1.team_name : team2.team_name,
        marginType: "runs",
        marginValue: runsMargin,
      };
    }
  }

  const liveScoreState = await exports.getLiveScorecardState(conn, matchId);

  // Final response aggregate
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
        id: team1.id || match.team1_id,
        name: team1.team_name || `Team_${match.team1_id}`,
        logo: team1.logo || null,
        players: team1.players || [],
      },
      team2: {
        id: team2.id || match.team2_id,
        name: team2.team_name || `Team_${match.team2_id}`,
        logo: team2.logo || null,
        players: team2.players || [],
      },
    },
    matchResult,
    liveScoreState,
  };
};


exports.getLiveScorecardState = async (conn, matchId) => {
  if (!matchId) throw new Error("matchId is required");
  console.log("[Debug] getLiveScorecardState called for matchId:", matchId);

  const [inProgressInnings] = await conn.execute(
    `SELECT * FROM innings WHERE match_id = ? AND status = 'in_progress' ORDER BY balls_bowled DESC, innings_number DESC LIMIT 1`,
    [matchId]
  );
  console.log("[Debug] inProgressInnings:", inProgressInnings);

  let inningRow = (inProgressInnings && inProgressInnings.length > 0) ? inProgressInnings[0] : null;

  if (!inningRow) {
    const [fallbackInnings] = await conn.execute(
      `SELECT * FROM innings WHERE match_id = ? AND status != 'completed' ORDER BY balls_bowled DESC, innings_number DESC LIMIT 1`,
      [matchId]
    );
    console.log("[Debug] fallbackInnings:", fallbackInnings);

    inningRow = (fallbackInnings && fallbackInnings.length > 0) ? fallbackInnings[0] : null;
  }

  if (!inningRow) {
    console.error(`No active inning found for matchId: ${matchId}`);
    // Instead of throwing, return null or a default empty response
    return null;
  }

  const inningId = inningRow.inning_id;

  const [liveRows] = await conn.execute(
    `SELECT inning_id, match_id, current_score, current_wickets, batsman1_id, batsman2_id,
      on_strike_batsman_id, non_striker_batsman_id, bowler_id, awaiting_new_batsman,
      last_wicket_player_id, last_wicket_over, last_wicket_description,
      is_bowler_over_complete, awaiting_new_bowler
    FROM live_scorecards WHERE inning_id = ? LIMIT 1`,
    [inningId]
  );
  console.log("[Debug] liveRows:", liveRows);

  if (!liveRows || liveRows.length === 0) {
    console.error(`No live scorecard found for inningId: ${inningId}`);
    return null;
  }

  const live = liveRows[0];

  return {
    inningId: live.inning_id,
    matchId: live.match_id,
    currentScore: live.current_score,
    currentWickets: live.current_wickets,
    batsman1Id: live.batsman1_id,
    batsman2Id: live.batsman2_id,
    onStrikeBatsmanId: live.on_strike_batsman_id,
    nonStrikerBatsmanId: live.non_striker_batsman_id,
    bowlerId: live.bowler_id,
    awaitingNewBatsman: live.awaiting_new_batsman === 1,
    lastWicketPlayerId: live.last_wicket_player_id,
    lastWicketOver: live.last_wicket_over,
    lastWicketDescription: live.last_wicket_description,
    isBowlerOverComplete: live.is_bowler_over_complete === 1,
    awaitingNewBowler: live.awaiting_new_bowler === 1,
  };
};
