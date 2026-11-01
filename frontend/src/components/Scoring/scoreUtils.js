// Helpers shared by the scoring dashboard and the broadcast overlay. They only read the scoreboard the
// backend sends (see liveScoreService.getLiveScoreboard) and do the cricket arithmetic around it.

/* ------------------------------ the scoreboard ------------------------------ */

/** The innings being played: the first that is not completed (the last one once the match is over). */
export const currentInnings = (sb) => {
  if (!sb || !sb.innings || !sb.innings.length) return null;
  return sb.innings.find((i) => i.status !== "completed") || sb.innings[sb.innings.length - 1];
};

export const teamOf = (sb, teamId) => {
  const { team1, team2 } = sb.teams;
  return Number(team1.id) === Number(teamId) ? team1 : team2;
};

export const sides = (sb, inning) => {
  const batting = teamOf(sb, inning.teamId);
  const bowling = Number(sb.teams.team1.id) === Number(batting.id) ? sb.teams.team2 : sb.teams.team1;
  return { batting, bowling };
};

export const ballsLeft = (sb, inning) => Math.max((sb.maxOvers || 0) * 6 - (inning.ballsBowled || 0), 0);

/** Runs still needed in the chase (null in the first innings). */
export const runsNeeded = (inning) => (inning.inningsNumber > 1 && inning.targetScore ? Math.max(inning.targetScore - inning.totalRuns, 0) : null);

/** The score the batting side is heading for at the current run rate. */
export const projectedScore = (sb, inning) => (inning.ballsBowled > 0 ? Math.round((inning.totalRuns / inning.ballsBowled) * (sb.maxOvers || 0) * 6) : null);

export const oversText = (inning) => inning.overs;

/** Has this innings started: somebody has batted, or the openers are chosen. */
export const inningsStarted = (inning) => (inning.ballsBowled || 0) > 0 || inning.lastBallId > 0 || inning.currentBatsmen.length > 0 || !!inning.currentBowler;

export const striker = (inning) => inning.currentBatsmen.find((b) => b.isOnStrike) || null;
export const nonStriker = (inning) => inning.currentBatsmen.find((b) => !b.isOnStrike) || null;

/* ------------------------------ team look ------------------------------ */

/** "Alpha Strikers" -> "ALS", "Mumbai" -> "MUM", "Royal Challengers Bangalore" -> "RCB" */
export const teamCode = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TBD";
  if (words.length >= 3) return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  return words[0].slice(0, 3).toUpperCase();
};

const PALETTE = ["#9a4a55", "#3f6296", "#4a7a66", "#9a7340", "#6a5b96", "#3f7585", "#9a5a3f", "#8a4a72"];
export const teamColor = (id) => PALETTE[Math.abs(Number(id) || 0) % PALETTE.length];

/* ------------------------------ balls ------------------------------ */

/**
 * One ball of the current over as a small chip: text and a kind for the colour.
 * Input is an entry of inning.currentOverSummary.
 */
export const ballChip = (b) => {
  if (b.wicket) return { text: "W", kind: "wicket" };
  if (b.extras === "wide") return { text: b.extraRuns > 1 ? `Wd+${b.extraRuns - 1}` : "Wd", kind: "extra" };
  if (b.extras === "no-ball" && b.noBallRunsType) return { text: `Nb+${b.extraRuns - 1}${b.noBallRunsType === "bye" ? "b" : "lb"}`, kind: "extra" };
  if (b.extras === "no-ball") return { text: b.runs > 0 ? `Nb+${b.runs}` : "Nb", kind: "extra" };
  if (b.extras === "bye") return { text: `${b.extraRuns}b`, kind: "extra" };
  if (b.extras === "leg-bye") return { text: `${b.extraRuns}lb`, kind: "extra" };
  if (b.runs === 4) return { text: "4", kind: "four" };
  if (b.runs === 6) return { text: "6", kind: "six" };
  if (b.runs === 0) return { text: "•", kind: "dot" };
  return { text: String(b.runs), kind: "run" };
};

/** The balls of the over in progress (or the one just finished), without retirements. */
export const overChips = (inning) => (inning.currentOverSummary || []).filter((b) => b.ballOutcome !== "retired").map(ballChip);

/** A ball row of the log (recentBalls) as plain text: "Rohan hit 4", "WIDE +1", "WICKET: caught". */
export const ballText = (ball, nameOf) => {
  const who = nameOf(ball.batsman_id);
  const extra = ball.extra_type;
  if (ball.ball_outcome === "retired" && !ball.extra_type) return `${nameOf(ball.dismissed_player_id)} retired${ball.is_wicket ? " (out)" : " hurt"}`;
  if (ball.is_wicket) return `WICKET ${nameOf(ball.dismissed_player_id)} ${ball.wicket_type}${ball.runs_scored ? ` (${ball.runs_scored} run${ball.runs_scored > 1 ? "s" : ""})` : ""}`;
  if (extra === "wide") return `Wide${ball.extras > 1 ? ` +${ball.extras - 1}` : ""}`;
  if (extra === "no-ball" && ball.nb_runs_type) return `No-ball, ${ball.extras - 1} ${ball.nb_runs_type === "bye" ? "bye" : "leg-bye"}${ball.extras - 1 > 1 ? "s" : ""}`;
  if (extra === "no-ball") return `No-ball${ball.runs_scored ? `, ${who} hits ${ball.runs_scored}` : ""}`;
  if (extra === "bye" || extra === "leg-bye") return `${ball.extras} ${extra === "bye" ? "bye" : "leg-bye"}${ball.extras > 1 ? "s" : ""}`;
  if (ball.runs_scored === 0) return `${who}: no run`;
  if (ball.runs_scored === 4) return `${who} hits FOUR`;
  if (ball.runs_scored === 6) return `${who} hits SIX`;
  return `${who}: ${ball.runs_scored} run${ball.runs_scored > 1 ? "s" : ""}`;
};

/** The ball (log row) as the delivery the scorer entered it, so it can be entered again (redo). */
export const ballToRedo = (row) => {
  const isRetirement = Number(row.legal_delivery) === 0 && !row.extra_type;
  if (isRetirement) return { type: "retire", batsmanId: row.dismissed_player_id, retiredOut: Number(row.is_wicket) === 1 };
  const out = Number(row.is_wicket) === 1;
  return {
    type: "ball",
    delivery: {
      runsScored: row.runs_scored,
      extraType: row.extra_type || null,
      extras: row.extra_type ? row.extras : 0,
      ...(row.nb_runs_type ? { noBallRunsAs: row.nb_runs_type } : {}),
      ...(out ? { isWicket: 1, wicketType: row.wicket_type, dismissedPlayerId: row.dismissed_player_id, fielderId: row.fielder_id || null } : {}),
    },
  };
};

/* ------------------------------ dismissals ------------------------------ */

// Mirrors backend/utils/cricketRules so the scorer is stopped before the server has to refuse.
export const DISMISSALS = [
  { id: "bowled", label: "Bowled", who: "striker", dead: true, fielder: "none" },
  { id: "caught", label: "Caught", who: "striker", dead: true, fielder: "optional" },
  { id: "lbw", label: "LBW", who: "striker", dead: true, fielder: "none" },
  { id: "stumped", label: "Stumped", who: "striker", dead: true, fielder: "optional" },
  { id: "hit wicket", label: "Hit wicket", who: "striker", dead: true, fielder: "none" },
  { id: "run out", label: "Run out", who: "either", dead: false, fielder: "required" },
  { id: "obstructing the field", label: "Obstructing the field", who: "either", dead: false, fielder: "none" },
  { id: "hit the ball twice", label: "Hit the ball twice", who: "striker", dead: false, fielder: "none" },
];

export const DELIVERIES = [
  { id: "normal", label: "Normal" },
  { id: "wide", label: "Wide" },
  { id: "no-ball", label: "No-ball" },
  { id: "bye", label: "Bye" },
  { id: "leg-bye", label: "Leg-bye" },
];

/** Why this dismissal cannot happen (null when it can). */
export const dismissalBlocked = (d, { freeHit, delivery }) => {
  const free = ["run out", "obstructing the field"];
  if (freeHit && !free.includes(d.id)) return "Free hit: only a run out or obstructing the field";
  if (delivery === "wide" && !["stumped", "run out", "hit wicket", "obstructing the field"].includes(d.id)) return "Not possible off a wide";
  if (delivery === "no-ball" && !free.includes(d.id)) return "Not possible off a no-ball";
  if ((delivery === "bye" || delivery === "leg-bye") && d.dead) return "The ball is dead: no byes";
  return null;
};

/** The runs the scorer entered for a dismissal, as the fields the server wants. */
export const wicketDelivery = ({ delivery, runs }) => {
  switch (delivery) {
    case "wide":
      return { extraType: "wide", extras: 1 + runs, runsScored: 0 };
    case "no-ball":
      return { extraType: "no-ball", extras: 1, runsScored: runs };
    case "bye":
    case "leg-bye":
      return { extraType: delivery, extras: Math.max(runs, 1), runsScored: 0 };
    default:
      return { extraType: null, extras: 0, runsScored: runs };
  }
};

/* ------------------------------ bowlers ------------------------------ */

/** Overs one bowler may bowl: a fifth of the match, rounded up. */
export const bowlerQuota = (maxOvers) => Math.ceil((maxOvers || 5) / 5);

/** Why this bowler cannot bowl the next over (null when he can). */
export const bowlerBlocked = ({ bowler, lastOverBowlerId, maxOvers }) => {
  if (lastOverBowlerId && Number(lastOverBowlerId) === Number(bowler.playerId)) return "Bowled the last over";
  const quota = bowlerQuota(maxOvers);
  if (bowler.legalBalls >= quota * 6) return `Has bowled his ${quota} over${quota > 1 ? "s" : ""}`;
  return null;
};

/** Short figures: "2.1-0-14-1". */
export const figures = (b) => `${b.overs}-${b.maidens}-${b.runs}-${b.wickets}`;

/* ------------------------------ for the overlay ------------------------------ */

/** "c Smith b Jones" from a fall-of-wickets entry of the scoreboard. */
export const dismissalText = (w) => {
  const t = String(w.wicketType || "").toLowerCase();
  const b = w.bowlerName;
  const f = w.fielderName;
  if (t === "bowled") return `b ${b}`;
  if (t === "caught") return f && f !== b ? `c ${f} b ${b}` : `c & b ${b}`;
  if (t === "lbw") return `lbw b ${b}`;
  if (t === "stumped") return `st ${f || "wk"} b ${b}`;
  if (t === "hit wicket") return `hit wicket b ${b}`;
  if (t === "run out") return f ? `run out (${f})` : "run out";
  return t || "out";
};

/** What just happened, from two scoreboards: the new newest ball, or null (also null after an undo). */
export const detectEvent = (prev, next) => {
  if (!prev || !next) return null;
  const a = currentInnings(prev);
  const b = currentInnings(next);
  if (!a || !b || a.inningId !== b.inningId || b.lastBallId <= a.lastBallId) return null;
  const ball = b.recentBalls && b.recentBalls[0];
  if (!ball) return null;
  const batter = (id) => b.currentBatsmen.find((x) => x.playerId === id);

  if (Number(ball.is_wicket) === 1 && ball.ball_outcome !== "retired") {
    const w = b.wicketFalls[b.wicketFalls.length - 1];
    return w ? { kind: "wicket", title: "WICKET", name: w.playerOutName, detail: dismissalText(w), playerId: w.playerOutId, key: b.lastBallId } : null;
  }
  // a batter reaching 50 or 100
  const now = batter(ball.batsman_id);
  const before = a.currentBatsmen.find((x) => x.playerId === ball.batsman_id);
  if (now && before) {
    for (const mark of [100, 50]) {
      if (before.runs < mark && now.runs >= mark) return { kind: "milestone", title: mark === 100 ? "HUNDRED" : "FIFTY", name: now.name, detail: `${now.runs} off ${now.balls} balls`, playerId: now.playerId, key: b.lastBallId };
    }
  }
  const runs = Number(ball.runs_scored);
  if (runs === 6) return { kind: "six", title: "SIX", name: now ? now.name : "", detail: now ? `${now.runs} (${now.balls})` : "", playerId: now && now.playerId, key: b.lastBallId };
  if (runs === 4) return { kind: "four", title: "FOUR", name: now ? now.name : "", detail: now ? `${now.runs} (${now.balls})` : "", playerId: now && now.playerId, key: b.lastBallId };
  return null;
};
