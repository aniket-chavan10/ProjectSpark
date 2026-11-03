// A tied match, played off ball by ball and streamed.
//
// Laws used (the ICC super over):
//   - each team bats one over (6 legal balls); a super over ends early when its second wicket falls
//   - the team that batted second in the match bats first; the chasing team stops as soon as it passes the score
//   - a wide or no-ball adds one run and is bowled again
//   - level again: another super over, and the team that batted second in the last one bats first
//
// Nothing here touches the match score, player averages or net run rate. The scorer watches the state, and when one team is
// ahead taps "confirm": only then is the winner written (through tieBreakService, so points, the bracket and notifications follow).

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const tieBreak = require("./tieBreakService");

const OVER = 6; // legal balls in a super over
const MAX_WICKETS = 2; // the second wicket ends it
const MAX_ROUNDS = 10;
const EXTRAS = ["wide", "no-ball", "bye", "leg-bye"];

const missingTable = (err) => err && (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146);
const NEEDS_UPGRADE = "The super-over tables are missing from the database. Run `npm run db:upgrade` once in the backend folder, then try again.";

/** How a ball reads in the over strip: 0 4 W Wd Nb+2 1b 2lb 1+W */
function ballLabel(b) {
  const runs = Number(b.runs) || 0;
  const wicket = Number(b.is_wicket) === 1;
  let s;
  if (b.extra_type === "wide") s = runs ? `Wd+${runs}` : "Wd";
  else if (b.extra_type === "no-ball") s = runs ? `Nb+${runs}` : "Nb";
  else if (b.extra_type === "bye") s = `${runs}b`;
  else if (b.extra_type === "leg-bye") s = `${runs}lb`;
  else s = String(runs);
  if (wicket) s = !b.extra_type && runs === 0 ? "W" : `${s}+W`;
  return s;
}

/** Is this innings over? `firstRuns` is what the chasing team has to beat. */
const isFinished = (inn, firstRuns) =>
  Number(inn.legal_balls) >= OVER || Number(inn.wickets) >= MAX_WICKETS || (Number(inn.batting_order) === 2 && Number(inn.runs) > Number(firstRuns));

/* ------------------------------------ state ------------------------------------ */

const placeholders = (n) => Array.from({ length: n }, () => "?").join(",");

/**
 * Everything a screen needs to show the super over, or null when the match has none.
 * phase: ready (about to start) | live | break (between the two innings) | level (play another) | decided (confirm it) | settled
 */
async function getState(conn, matchId) {
  let inns;
  try {
    [inns] = await conn.query(
      `SELECT i.id, i.round_no, i.batting_order, i.team_id, t.team_name, t.logo, i.runs, i.wickets, i.legal_balls, i.status, i.batter1_id, i.batter2_id, i.bowler_id
       FROM super_over_innings i JOIN teams t ON t.id = i.team_id WHERE i.match_id = ? ORDER BY i.round_no, i.batting_order`,
      [matchId]
    );
  } catch (err) {
    if (missingTable(err)) return null; // an older database: the match carries on without a super over
    throw err;
  }
  if (!inns.length) return null;

  const [balls] = await conn.query(
    `SELECT innings_id, seq, runs, extra_type, is_wicket, total_runs, is_legal FROM super_over_balls WHERE innings_id IN (${placeholders(inns.length)}) ORDER BY innings_id, seq`,
    inns.map((i) => i.id)
  );
  const byInnings = new Map();
  balls.forEach((b) => {
    if (!byInnings.has(b.innings_id)) byInnings.set(b.innings_id, []);
    byInnings.get(b.innings_id).push({ seq: Number(b.seq), label: ballLabel(b), runs: Number(b.runs), extra: b.extra_type || null, wicket: Number(b.is_wicket) === 1, total: Number(b.total_runs), legal: Number(b.is_legal) === 1 });
  });

  const ids = [...new Set(inns.flatMap((i) => [i.batter1_id, i.batter2_id, i.bowler_id]).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    const [players] = await conn.query(`SELECT player_id, players_name, profile_picture FROM players_core WHERE player_id IN (${placeholders(ids.length)})`, ids);
    players.forEach((p) => names.set(Number(p.player_id), { id: Number(p.player_id), name: p.players_name, photo: p.profile_picture || null }));
  }
  const who = (id) => (id ? names.get(Number(id)) || { id: Number(id), name: null, photo: null } : null);

  const [[m]] = await conn.query(`SELECT winner_team_id, decided_by, team1_id, team2_id FROM matches WHERE match_id = ?`, [matchId]);
  const settled = !!(m && m.winner_team_id && m.decided_by === "tie_super_over");

  const rounds = [];
  inns.forEach((i) => {
    let r = rounds.find((x) => x.round === Number(i.round_no));
    if (!r) rounds.push((r = { round: Number(i.round_no), innings: [] }));
    r.innings.push({
      id: Number(i.id),
      order: Number(i.batting_order),
      teamId: Number(i.team_id),
      teamName: i.team_name,
      logo: i.logo || null,
      runs: Number(i.runs),
      wickets: Number(i.wickets),
      legalBalls: Number(i.legal_balls),
      ballsLeft: Math.max(OVER - Number(i.legal_balls), 0),
      status: i.status,
      balls: byInnings.get(i.id) || [],
      batters: [who(i.batter1_id), who(i.batter2_id)].filter(Boolean),
      bowler: who(i.bowler_id),
    });
  });
  rounds.forEach((r) => {
    const [a, b] = r.innings;
    r.winnerTeamId = a && b && a.status === "completed" && b.status === "completed" && a.runs !== b.runs ? (a.runs > b.runs ? a.teamId : b.teamId) : null;
  });

  const last = rounds[rounds.length - 1];
  const [first, second] = last.innings;
  let phase;
  let current = null;
  let winnerTeamId = null;
  if (settled) {
    phase = "settled";
    winnerTeamId = Number(m.winner_team_id);
  } else if (first.status !== "completed") {
    current = first;
    phase = first.balls.length === 0 ? "ready" : "live";
  } else if (second && second.status !== "completed") {
    current = second;
    phase = second.balls.length === 0 ? "break" : "live";
  } else if (last.winnerTeamId) {
    phase = "decided";
    winnerTeamId = last.winnerTeamId;
  } else {
    phase = "level";
  }

  let chase = null;
  if (current && current.order === 2) {
    const target = first.runs + 1;
    chase = { target, need: Math.max(target - current.runs, 0), ballsLeft: current.ballsLeft };
  }

  const winnerName = winnerTeamId ? (last.innings.find((i) => i.teamId === winnerTeamId) || {}).teamName || null : null;
  return {
    active: phase !== "settled",
    phase,
    round: last.round,
    rounds,
    current,
    chase,
    winnerTeamId,
    winnerName,
    ballsPerOver: OVER,
    maxWickets: MAX_WICKETS,
    summary:
      phase === "level"
        ? `Super over level at ${first.runs}. Another one is needed.`
        : winnerName
          ? `${winnerName} won the super over (${first.teamName} ${first.runs}/${first.wickets}, ${second.teamName} ${second.runs}/${second.wickets})`
          : null,
  };
}

/* ------------------------------------ doing things ------------------------------------ */

async function inTransaction(matchId, fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (missingTable(err)) throw new ScoringError(NEEDS_UPGRADE, 500);
    throw err;
  } finally {
    conn.release();
  }
}

async function lockMatch(conn, matchId) {
  const [[m]] = await conn.query(`SELECT match_id, status, winner_team_id, decided_by, team1_id, team2_id FROM matches WHERE match_id = ? FOR UPDATE`, [matchId]);
  if (!m) throw new ScoringError("Match not found", 404);
  return m;
}

/** The scorer's view. */
async function status(matchId) {
  const conn = await db.getConnection();
  try {
    return await getState(conn, matchId);
  } finally {
    conn.release();
  }
}

/** Open the super over of a tied match: round 1, the team that batted second goes first. */
async function start(matchId) {
  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    const existing = await getState(conn, matchId);
    if (existing) return existing; // pressing the button twice is harmless
    if (m.status !== "completed" || m.winner_team_id) throw new ScoringError("This match is not waiting for a tie-break", 409);

    const [[first]] = await conn.query(`SELECT team_id FROM innings WHERE match_id = ? AND innings_number = 1 LIMIT 1`, [matchId]);
    if (!first) throw new ScoringError("The first innings was not found", 409);
    const battedFirst = Number(first.team_id);
    const bat1 = battedFirst === Number(m.team1_id) ? Number(m.team2_id) : Number(m.team1_id);
    const bat2 = battedFirst;
    await conn.query(`INSERT INTO super_over_innings (match_id, round_no, batting_order, team_id, status) VALUES (?, 1, 1, ?, 'pending'), (?, 1, 2, ?, 'pending')`, [matchId, bat1, matchId, bat2]);
    await conn.query(`UPDATE matches SET is_super_over = 1 WHERE match_id = ?`, [matchId]);
    return getState(conn, matchId);
  });
}

const needCurrent = (st) => {
  if (!st) throw new ScoringError("There is no super over for this match yet. Start it first.", 409);
  if (st.current) return st.current;
  if (st.phase === "decided") throw new ScoringError(`${st.winnerName} are ahead. Confirm the result.`, 409);
  if (st.phase === "level") throw new ScoringError("The super over is level. Start the next one.", 409);
  throw new ScoringError("The super over is already settled.", 409);
};

const wholeBetween = (v, min, max, what) => {
  const n = Number(v === undefined || v === null || v === "" ? 0 : v);
  if (!Number.isInteger(n) || n < min || n > max) throw new ScoringError(`${what} must be a whole number from ${min} to ${max}`);
  return n;
};

/**
 * One delivery.
 * @param input { runs, extra: null | wide | no-ball | bye | leg-bye, wicket: boolean, lastSeq: number of balls the screen has seen }
 */
async function ball(matchId, input = {}) {
  const extra = input.extra ? String(input.extra) : null;
  if (extra && !EXTRAS.includes(extra)) throw new ScoringError("Extra must be wide, no-ball, bye or leg-bye");
  const runs = wholeBetween(input.runs, extra === "bye" || extra === "leg-bye" ? 1 : 0, 6, "Runs");
  const wicket = input.wicket === true || input.wicket === 1 || input.wicket === "1";

  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    if (m.winner_team_id) throw new ScoringError("This match already has its result.", 409);
    const st = await getState(conn, matchId);
    const cur = needCurrent(st);
    if (input.lastSeq !== undefined && input.lastSeq !== null && Number(input.lastSeq) !== cur.balls.length) {
      throw new ScoringError("The scoreboard changed on another screen. It has been refreshed, check it and score the ball again.", 409);
    }

    const legal = extra === "wide" || extra === "no-ball" ? 0 : 1;
    const total = runs + (legal ? 0 : 1);
    await conn.query(`INSERT INTO super_over_balls (innings_id, seq, runs, extra_type, is_wicket, total_runs, is_legal) VALUES (?, ?, ?, ?, ?, ?, ?)`, [cur.id, cur.balls.length + 1, runs, extra, wicket ? 1 : 0, total, legal]);

    const next = { runs: cur.runs + total, wickets: cur.wickets + (wicket ? 1 : 0), legal_balls: cur.legalBalls + legal, batting_order: cur.order };
    const firstRuns = cur.order === 2 ? st.rounds[st.rounds.length - 1].innings[0].runs : 0;
    const finished = isFinished(next, firstRuns);
    await conn.query(`UPDATE super_over_innings SET runs = ?, wickets = ?, legal_balls = ?, status = ? WHERE id = ?`, [next.runs, next.wickets, next.legal_balls, finished ? "completed" : "in_progress", cur.id]);
    return getState(conn, matchId);
  });
}

/** Take the last ball back (also reopens an innings the ball had just finished). Not possible once the result is confirmed. */
async function undo(matchId) {
  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    if (m.winner_team_id) throw new ScoringError("The result is already confirmed, so the super over can no longer be changed.", 409);
    const st = await getState(conn, matchId);
    if (!st) throw new ScoringError("There is no super over for this match yet.", 409);

    // the newest innings that has a ball
    const all = st.rounds.flatMap((r) => r.innings);
    const target = [...all].reverse().find((i) => i.balls.length > 0);
    if (!target) throw new ScoringError("There are no balls to take back.", 409);

    const lastBall = target.balls[target.balls.length - 1];
    await conn.query(`DELETE FROM super_over_balls WHERE innings_id = ? AND seq = ?`, [target.id, lastBall.seq]);
    const kept = target.balls.slice(0, -1);
    const runs = kept.reduce((n, b) => n + b.total, 0);
    const wickets = kept.filter((b) => b.wicket).length;
    const legal = kept.filter((b) => b.legal).length;
    const targetRound = st.rounds.find((r) => r.innings.some((i) => i.id === target.id));
    const firstRuns = target.order === 2 ? targetRound.innings[0].runs : 0;
    const finished = kept.length > 0 && isFinished({ runs, wickets, legal_balls: legal, batting_order: target.order }, firstRuns);
    await conn.query(`UPDATE super_over_innings SET runs = ?, wickets = ?, legal_balls = ?, status = ? WHERE id = ?`, [runs, wickets, legal, kept.length === 0 ? "pending" : finished ? "completed" : "in_progress", target.id]);

    // a later super over that nobody has batted in yet is no longer needed
    await conn.query(`DELETE FROM super_over_innings WHERE match_id = ? AND round_no > ?`, [matchId, targetRound.round]);
    return getState(conn, matchId);
  });
}

/** Choose (or change) who is batting and who is bowling in the current innings. All optional. */
async function setPlayers(matchId, input = {}) {
  const pick = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
  const batter1 = pick(input.batter1Id);
  const batter2 = pick(input.batter2Id);
  const bowler = pick(input.bowlerId);
  if ([batter1, batter2, bowler].some((v) => v !== null && !Number.isInteger(v))) throw new ScoringError("Choose players from the list");
  if (batter1 && batter1 === batter2) throw new ScoringError("The two batters must be different players");

  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    if (m.winner_team_id) throw new ScoringError("This match already has its result.", 409);
    const st = await getState(conn, matchId);
    const cur = needCurrent(st);

    const ids = [batter1, batter2, bowler].filter(Boolean);
    if (ids.length) {
      const [rows] = await conn.query(`SELECT player_id, team_id FROM players_core WHERE player_id IN (${placeholders(ids.length)})`, ids);
      const teamOf = new Map(rows.map((r) => [Number(r.player_id), Number(r.team_id)]));
      const fielding = Number(m.team1_id) === cur.teamId ? Number(m.team2_id) : Number(m.team1_id);
      if ([batter1, batter2].some((p) => p && teamOf.get(p) !== cur.teamId)) throw new ScoringError(`Batters must be from ${cur.teamName}`);
      if (bowler && teamOf.get(bowler) !== fielding) throw new ScoringError("The bowler must be from the fielding team");
    }
    await conn.query(`UPDATE super_over_innings SET batter1_id = ?, batter2_id = ?, bowler_id = ? WHERE id = ?`, [batter1, batter2, bowler, cur.id]);
    return getState(conn, matchId);
  });
}

/** Level after a round: play another. The team that batted second in the last round goes first. */
async function nextRound(matchId) {
  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    if (m.winner_team_id) throw new ScoringError("This match already has its result.", 409);
    const st = await getState(conn, matchId);
    if (!st || st.phase !== "level") throw new ScoringError("Another super over is only played when the last one ended level.", 409);
    if (st.round >= MAX_ROUNDS) throw new ScoringError("That is already the tenth super over. Settle it another way (pick the winner).", 409);

    const last = st.rounds[st.rounds.length - 1];
    const [a, b] = last.innings; // b batted second, so b bats first now
    await conn.query(`INSERT INTO super_over_innings (match_id, round_no, batting_order, team_id, status) VALUES (?, ?, 1, ?, 'pending'), (?, ?, 2, ?, 'pending')`, [matchId, st.round + 1, b.teamId, matchId, st.round + 1, a.teamId]);
    return getState(conn, matchId);
  });
}

/** One team is ahead after the last round: record it as the winner of the match. */
async function confirm(matchId, by = null) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const m = await tieBreak.lockTied(conn, matchId);
    const st = await getState(conn, matchId);
    if (!st || st.phase !== "decided") throw new ScoringError("The super over has no winner yet.", 409);

    const last = st.rounds[st.rounds.length - 1];
    const forTeam = (teamId) => last.innings.find((i) => i.teamId === Number(teamId));
    const t1 = forTeam(m.team1_id);
    const t2 = forTeam(m.team2_id);
    const note = st.round > 1 ? `Won in super over ${st.round}` : "";
    const out = await tieBreak.applyDecision(conn, m, { method: "super_over", winner: st.winnerTeamId, runs: [t1.runs, t2.runs], wkts: [t1.wickets, t2.wickets], note, by });
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/** Throw the super over away (started by mistake, or the teams chose another way). Only before the result is confirmed. */
async function reset(matchId) {
  return inTransaction(matchId, async (conn) => {
    const m = await lockMatch(conn, matchId);
    if (m.winner_team_id) throw new ScoringError("The result is already confirmed, so the super over can no longer be removed.", 409);
    await conn.query(`DELETE FROM super_over_innings WHERE match_id = ?`, [matchId]);
    await conn.query(`UPDATE matches SET is_super_over = 0 WHERE match_id = ?`, [matchId]);
    return null;
  });
}

module.exports = { OVER, MAX_WICKETS, getState, status, start, ball, undo, setPlayers, nextRound, confirm, reset, _test: { ballLabel, isFinished } };
