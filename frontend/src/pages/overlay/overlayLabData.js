// Made-up match for the overlay test lab (/overlay-lab): two teams of eleven, a scoreboard shaped exactly like the one the
// server sends, the overlay data (squads, career figures) and the moves that change it - a six, a four, a wicket, a new
// batter ... Each move returns the NEXT scoreboard, so the lab runs the same detectEvent / detectIntro the live overlay runs.

const SKIN = ["#f1c9a5", "#e0ac86", "#c68863", "#a8704c", "#8d5a3b"];
const HAIR = ["#1b1b1f", "#2c1d12", "#101010", "#3a2a1c"];

/** A head-and-shoulders portrait as an inline image, so the lab needs no uploaded pictures. */
const avatar = (seed, shirt) => {
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[seed % HAIR.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 360'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${shirt}' stop-opacity='.1'/><stop offset='1' stop-color='${shirt}' stop-opacity='.5'/></linearGradient></defs>` +
    `<rect width='300' height='360' fill='url(#g)'/>` +
    `<path d='M14 360c6-84 54-116 136-116s130 32 136 116z' fill='${shirt}'/>` +
    `<path d='M118 244h64l-10 36h-44z' fill='#fff' opacity='.9'/>` +
    `<rect x='128' y='196' width='44' height='58' rx='16' fill='${skin}'/>` +
    `<ellipse cx='150' cy='148' rx='54' ry='64' fill='${skin}'/>` +
    `<path d='M95 140c0-52 30-74 57-74 31 0 55 22 55 74-9-25-29-40-57-40s-46 15-55 40z' fill='${hair}'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SHIRTS = { 1: "#1f6feb", 2: "#0e9f6e" };

// [name, captain, keeper, kind] - kind picks the career figures: bat | ball | all | wk | none (a debutant)
const ROSTER = {
  1: [
    ["Rohan Patil", true, false, "bat"],
    ["Ishaan Kulkarni", false, false, "bat"],
    ["Aarav Deshmukh", false, false, "bat"],
    ["Vikram Shinde", false, true, "wk"],
    ["Siddharth Joshi", false, false, "all"],
    ["Kabir More", false, false, "bat"],
    ["Tanmay Gaikwad", false, false, "all"],
    ["Yash Pawar", false, false, "ball"],
    ["Omkar Jadhav", false, false, "ball"],
    ["Rahul Bhosale", false, false, "ball"],
    ["Dev Sawant", false, false, "none"],
  ],
  2: [
    ["Arjun Malhotra", true, false, "bat"],
    ["Karan Sethi", false, false, "bat"],
    ["Rishabh Chopra", false, true, "wk"],
    ["Vivek Arora", false, false, "bat"],
    ["Nikhil Bhatia", false, false, "all"],
    ["Harsh Khanna", false, false, "all"],
    ["Aman Verma", false, false, "ball"],
    ["Pranav Kapoor", false, false, "ball"],
    ["Sahil Mehra", false, false, "ball"],
    ["Tushar Grover", false, false, "ball"],
    ["Mohit Dhawan", false, false, "ball"],
  ],
};

const TEAMS = [
  { id: 1, name: "Mumbai Mavericks", logo: null },
  { id: 2, name: "Delhi Dynamos", logo: null },
];

const idOf = (teamId, index) => teamId * 100 + index + 1; // 101 .. 111, 201 .. 211

const players = (teamId) =>
  ROSTER[teamId].map(([name, captain, keeper], i) => ({
    playerId: idOf(teamId, i),
    name,
    profilePicture: avatar(teamId * 31 + i * 7, SHIRTS[teamId]),
    jerseyNumber: [18, 7, 45, 12, 33, 9, 21, 55, 64, 3, 99][i],
    isCaptain: captain,
    isKeeper: keeper,
    teamId,
  }));

/** Career figures in the shape backend/services/playerRankingService.careerCards returns. */
function careerFor(kind, i) {
  const bat = { matches: 24 + i, innings: 22, runs: 780 - i * 41, average: +(38.4 - i * 1.7).toFixed(1), strikeRate: +(142.6 - i * 3.1).toFixed(1), highest: 96 - i * 3, wickets: 0, economy: null, best: null };
  const ball = { matches: 20 + i, innings: 9, runs: 64 + i * 3, average: 9.2, strikeRate: 108.4, highest: 21, wickets: 31 - i, economy: +(7.4 + (i % 4) * 0.35).toFixed(2), best: `${4 - (i % 2)}/${19 + i}` };
  if (kind === "bat") return { ...bat, role: "Batter" };
  if (kind === "wk") return { ...bat, role: "Wicket-keeper" };
  if (kind === "ball") return { ...ball, role: "Bowler" };
  if (kind === "all") return { ...bat, runs: 412 + i * 9, average: 27.6, strikeRate: 131.2, wickets: 17, economy: 8.1, best: "3/22", role: "All-rounder" };
  return null; // a debutant: no figures yet
}

const squadsOf = (teamId) => ({
  playing: players(teamId).map((p) => ({ player_id: p.playerId, players_name: p.name, profile_picture: p.profilePicture, jersey_number: p.jerseyNumber, is_captain: p.isCaptain, is_keeper: p.isKeeper })),
  reserves: [],
});

/** The overlay data the page loads once (/overlay/:matchId). */
export function labData() {
  const career = {};
  [1, 2].forEach((t) =>
    ROSTER[t].forEach(([, , , kind], i) => {
      const c = careerFor(kind, i);
      if (c) career[idOf(t, i)] = c;
    })
  );
  return { matchId: 1, status: "live", tournament: { id: 1, name: "Spark Premier Cup" }, stage: "group", group: "A", teams: TEAMS, squads: { 1: squadsOf(1), 2: squadsOf(2) }, career, playerOfMatch: null, suggestedPlayerOfMatch: null, state: { scene: "none", payload: {} } };
}

/* ------------------------------------ the scoreboard ------------------------------------ */

const oversText = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const strikeRate = (runs, balls) => (balls > 0 ? ((runs * 100) / balls).toFixed(2) : "0.00");
const nameOf = (id) => {
  const team = Math.floor(id / 100);
  return ROSTER[team][(id % 100) - 1][0];
};
const photoOf = (id) => players(Math.floor(id / 100))[(id % 100) - 1].profilePicture;

const batter = (id, runs, balls, fours, sixes, onStrike) => ({ playerId: id, name: nameOf(id), profilePicture: photoOf(id), jerseyNumber: null, runs, balls, fours, sixes, strikeRate: strikeRate(runs, balls), isOnStrike: onStrike });

const bowlerOf = (id, ballsBowled, conceded, wickets, maidens = 0) => ({
  playerId: id,
  name: nameOf(id),
  profilePicture: photoOf(id),
  jerseyNumber: null,
  overs: oversText(ballsBowled),
  maidens,
  runsConceded: conceded,
  wickets,
  economy: ballsBowled ? ((conceded * 6) / ballsBowled).toFixed(2) : "0.00",
});

const OVER = [
  { ballNumber: 1, runs: 1, extras: null, extraRuns: 0, wicket: false, ballOutcome: "normal" },
  { ballNumber: 2, runs: 0, extras: null, extraRuns: 0, wicket: false, ballOutcome: "normal" },
];

/** A match part-way through: Mumbai 128/3 after 15.2 overs (or the chase of 169 when `chase`). */
export function freshMatch({ chase = false } = {}) {
  const t1 = { id: 1, name: TEAMS[0].name, logo: null, players: players(1) };
  const t2 = { id: 2, name: TEAMS[1].name, logo: null, players: players(2) };
  const balls = 92;
  const inning = {
    inningId: 101,
    teamId: 1,
    totalRuns: 128,
    wickets: 3,
    maxWickets: 10,
    wicketsLeft: 7,
    lastBallId: 5000,
    freeHit: false,
    awaiting: { batsmanEnd: null, bowler: false },
    retiredHurt: [],
    overs: oversText(balls),
    ballsBowled: balls,
    extrasBreakdown: { wides: 3, noBalls: 1, byes: 0, legByes: 2, penalty: 0, total: 6 },
    inningsNumber: chase ? 2 : 1,
    runRate: +((128 * 6) / balls).toFixed(2),
    requiredRunRate: chase ? 8.57 : null,
    targetScore: chase ? 169 : null,
    status: "in_progress",
    partnershipRuns: 38,
    currentBatsmen: [batter(104, 31, 19, 3, 2, true), batter(105, 14, 11, 1, 0, false)],
    currentBowler: bowlerOf(210, 14, 22, 1),
    lastWicket: null,
    recentBalls: [{ ball_id: 5000, batsman_id: 104, runs_scored: 1, is_wicket: 0, ball_outcome: "normal", over_number: 16, ball_number: 2 }],
    currentOverSummary: OVER,
    wicketFalls: [
      { wicketNumber: 1, playerOutId: 101, playerOutName: nameOf(101), scoreAtFall: 41, over: "4.3", wicketType: "caught", bowlerId: 207, bowlerName: nameOf(207), fielderId: 203, fielderName: nameOf(203), description: "caught" },
      { wicketNumber: 2, playerOutId: 102, playerOutName: nameOf(102), scoreAtFall: 77, over: "9.1", wicketType: "bowled", bowlerId: 208, bowlerName: nameOf(208), fielderId: null, fielderName: null, description: "bowled" },
      { wicketNumber: 3, playerOutId: 103, playerOutName: nameOf(103), scoreAtFall: 90, over: "11.4", wicketType: "lbw", bowlerId: 209, bowlerName: nameOf(209), fielderId: null, fielderName: null, description: "lbw" },
    ],
  };
  const first = { ...inning, inningId: 100, teamId: 2, totalRuns: 168, wickets: 6, overs: "20.0", ballsBowled: 120, inningsNumber: 1, status: "completed", targetScore: null, requiredRunRate: null, currentBatsmen: [], currentBowler: null, currentOverSummary: [], recentBalls: [], wicketFalls: [] };
  return {
    matchId: 1,
    matchNo: 14,
    status: "live",
    maxOvers: 20,
    tossWinnerId: 2,
    tossDecision: "bowl",
    teams: { team1: t1, team2: t2 },
    innings: chase ? [first, inning] : [inning],
    matchResult: null,
    superOver: null,
  };
}

const live = (sb) => sb.innings[sb.innings.length - 1];
const withInning = (sb, change) => {
  const idx = sb.innings.length - 1;
  const innings = sb.innings.map((i, n) => (n === idx ? { ...i, ...change } : i));
  return { ...sb, innings };
};

const bump = (sb, ball, extra = {}) => {
  const i = live(sb);
  const balls = i.ballsBowled + 1;
  const id = i.lastBallId + 1;
  const entry = { ball_id: id, over_number: Math.floor(i.ballsBowled / 6) + 1, ball_number: (i.ballsBowled % 6) + 1, ball_outcome: "normal", is_wicket: 0, ...ball };
  return withInning(sb, {
    ballsBowled: balls,
    overs: oversText(balls),
    lastBallId: id,
    recentBalls: [entry, ...i.recentBalls].slice(0, 12),
    currentOverSummary: [...(balls % 6 === 1 ? [] : i.currentOverSummary), { ballNumber: (i.ballsBowled % 6) + 1, runs: ball.runs_scored || 0, extras: null, extraRuns: 0, wicket: !!ball.is_wicket, ballOutcome: "normal" }],
    runRate: +((((i.totalRuns + (ball.runs_scored || 0)) * 6) / balls)).toFixed(2),
    ...extra,
  });
};

/** The striker hits a boundary: 4 or 6. */
export function hit(sb, runs) {
  const i = live(sb);
  const s = i.currentBatsmen.find((b) => b.isOnStrike) || i.currentBatsmen[0];
  if (!s) return sb; // nobody at the crease: bring a batter in first
  const batters = i.currentBatsmen.map((b) => (b.playerId === s.playerId ? batter(b.playerId, b.runs + runs, b.balls + 1, b.fours + (runs === 4 ? 1 : 0), b.sixes + (runs === 6 ? 1 : 0), b.isOnStrike) : b));
  return bump(sb, { batsman_id: s.playerId, runs_scored: runs }, { totalRuns: i.totalRuns + runs, currentBatsmen: batters, partnershipRuns: i.partnershipRuns + runs, currentBowler: i.currentBowler ? { ...i.currentBowler, runsConceded: i.currentBowler.runsConceded + runs } : i.currentBowler });
}

/** The striker is two short of a milestone (50 or 100) and runs two to reach it. Returns [before, after]. */
export function fifty(sb, mark = 50) {
  const hundred = mark === 100;
  const i = live(sb);
  const s = i.currentBatsmen.find((b) => b.isOnStrike) || i.currentBatsmen[0];
  const before = withInning(sb, { currentBatsmen: i.currentBatsmen.map((b) => (b.playerId === s.playerId ? (hundred ? batter(b.playerId, 98, 58, 9, 5, true) : batter(b.playerId, 48, 33, 5, 2, true)) : b)) });
  const bi = live(before);
  const after = bump(before, { batsman_id: s.playerId, runs_scored: 2 }, { totalRuns: bi.totalRuns + 2, currentBatsmen: bi.currentBatsmen.map((b) => (b.playerId === s.playerId ? (hundred ? batter(b.playerId, 100, 59, 9, 5, true) : batter(b.playerId, 50, 34, 5, 2, true)) : b)) });
  return [before, after];
}

/** The striker is caught off the bowler: he leaves the crease, the next batter is awaited. */
export function wicket(sb) {
  const i = live(sb);
  const out = i.currentBatsmen.find((b) => b.isOnStrike) || i.currentBatsmen[0];
  if (!out) return sb;
  const stay = i.currentBatsmen.filter((b) => b.playerId !== out.playerId).map((b) => ({ ...b, isOnStrike: true }));
  const bowler = i.currentBowler || bowlerOf(210, 14, 22, 1);
  const fall = { wicketNumber: i.wickets + 1, playerOutId: out.playerId, playerOutName: out.name, scoreAtFall: i.totalRuns, over: oversText(i.ballsBowled + 1), wicketType: "caught", bowlerId: bowler.playerId, bowlerName: bowler.name, fielderId: 203, fielderName: nameOf(203), description: "caught" };
  return bump(sb, { batsman_id: out.playerId, runs_scored: 0, is_wicket: 1, dismissed_player_id: out.playerId, wicket_type: "caught" }, { wickets: i.wickets + 1, wicketsLeft: i.wicketsLeft - 1, currentBatsmen: stay, wicketFalls: [...i.wicketFalls, fall], currentBowler: { ...bowler, wickets: bowler.wickets + 1 }, awaiting: { batsmanEnd: "nonStriker", bowler: false } });
}

/** The next batter in the order walks in (after a wicket). */
export function newBatter(sb) {
  const i = live(sb);
  const used = new Set([...i.currentBatsmen.map((b) => b.playerId), ...i.wicketFalls.map((w) => w.playerOutId)]);
  const next = players(i.teamId).find((p) => !used.has(p.playerId));
  if (!next) return sb;
  return withInning(sb, { currentBatsmen: [...i.currentBatsmen, batter(next.playerId, 0, 0, 0, 0, false)], awaiting: { batsmanEnd: null, bowler: false } });
}

/** One batter alone at the crease, so that newBatter has somebody to bring in. */
export function afterWicket(sb) {
  const i = live(sb);
  if (i.currentBatsmen.length < 2) return sb;
  const s = i.currentBatsmen.find((b) => b.isOnStrike) || i.currentBatsmen[0];
  return withInning(sb, { currentBatsmen: i.currentBatsmen.filter((b) => b.playerId !== s.playerId).map((b) => ({ ...b, isOnStrike: true })), wickets: i.wickets + 1 });
}

/** The innings has not started: no batters, no bowler, nothing bowled. */
export function beforeInnings(sb) {
  return withInning(sb, { totalRuns: 0, wickets: 0, wicketsLeft: 10, ballsBowled: 0, overs: "0.0", runRate: 0, partnershipRuns: 0, currentBatsmen: [], currentBowler: null, currentOverSummary: [], recentBalls: [], wicketFalls: [], lastBallId: 0, inningId: live(sb).inningId + 10 });
}

/** The openers walk out and the opening bowler is given the ball. */
export function openers(sb) {
  return withInning(sb, { currentBatsmen: [batter(101, 0, 0, 0, 0, true), batter(102, 0, 0, 0, 0, false)], currentBowler: bowlerOf(209, 0, 0, 0) });
}

/** A bowler who has not bowled yet takes over for the next over. */
export function newBowler(sb) {
  const i = live(sb);
  const gone = new Set([i.currentBowler && i.currentBowler.playerId]);
  const pick = [207, 208, 209, 211].find((id) => !gone.has(id) && id !== 210);
  return withInning(sb, { currentBowler: bowlerOf(pick, 0, 0, 0), currentOverSummary: [] });
}

/** Between overs: the bowler has gone and the next one has not been chosen yet. */
export function betweenOvers(sb) {
  return withInning(sb, { currentBowler: null });
}

export const setFreeHit = (sb, on) => withInning(sb, { freeHit: on });
export const nextBatterName = (sb) => {
  const i = live(sb);
  const used = new Set([...i.currentBatsmen.map((b) => b.playerId), ...i.wicketFalls.map((w) => w.playerOutId)]);
  const next = players(i.teamId).find((p) => !used.has(p.playerId));
  return next ? next.name : null;
};
