// Tied matches. A tournament chooses how a tie is settled, once for group matches and once for knock-outs:
//   super_over    the scorer records the super-over scores here (the higher score wins)
//   batted_first  the team that batted first wins, decided automatically when the match ends level
//   manual        the host / association picks the winner
// Until a tie is settled the match stays completed with no winner, so the bracket waits.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const { advanceBracket } = require("./bracketService");
const postMatchHooks = require("./postMatchHooks");

const RULES = ["super_over", "batted_first", "manual"];
const DECIDED = { super_over: "tie_super_over", batted_first: "tie_batted_first", manual: "tie_manual" };

/** The rule that applies to a match, from its tournament and stage. */
async function ruleFor(conn, matchId) {
  const [[row]] = await conn.query(
    `SELECT tm.id AS fixture_id, tm.stage, tm.tournament_id, t.tie_rule_group, t.tie_rule_knockout
     FROM tournament_matches tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.match_id = ? LIMIT 1`,
    [matchId]
  );
  if (!row) return null;
  const rule = row.stage === "group" ? row.tie_rule_group : row.tie_rule_knockout;
  return { fixtureId: row.fixture_id, tournamentId: row.tournament_id, stage: row.stage, rule: RULES.includes(rule) ? rule : "super_over" };
}

/** Called by the scoring engine when a match ends level. Returns { winnerTeamId, decidedBy } or null to leave it tied. */
async function autoWinner(conn, matchId) {
  try {
    const r = await ruleFor(conn, matchId);
    if (!r || r.rule !== "batted_first") return null;
    const [[first]] = await conn.query(`SELECT team_id FROM innings WHERE match_id = ? AND innings_number = 1 LIMIT 1`, [matchId]);
    return first ? { winnerTeamId: Number(first.team_id), decidedBy: DECIDED.batted_first } : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.error("[tie-break] could not apply the tournament rule:", err.message);
    return null;
  }
}

/** Keep a record of an automatic decision (never blocks the result). */
async function recordAuto(conn, matchId, decidedBy, winnerTeamId) {
  try {
    const method = Object.keys(DECIDED).find((k) => DECIDED[k] === decidedBy) || "batted_first";
    await conn.query(
      `INSERT INTO match_tiebreaks (match_id, method, winner_team_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE method = VALUES(method), winner_team_id = VALUES(winner_team_id)`,
      [matchId, method, winnerTeamId]
    );
    await conn.query(`UPDATE matches SET decided_by = ? WHERE match_id = ?`, [decidedBy, matchId]);
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.error("[tie-break] could not record the decision:", err.message);
  }
}

/** What the scorer needs to settle a tie: is there one waiting, and which rule applies. */
async function status(matchId) {
  const [[m]] = await db.query(
    `SELECT m.match_id, m.status, m.winner_team_id, m.team1_id, m.team2_id, t1.team_name AS team1_name, t2.team_name AS team2_name
     FROM matches m LEFT JOIN teams t1 ON t1.id = m.team1_id LEFT JOIN teams t2 ON t2.id = m.team2_id WHERE m.match_id = ?`,
    [matchId]
  );
  if (!m) throw new ScoringError("Match not found", 404);
  const [[first]] = await db.query(`SELECT team_id FROM innings WHERE match_id = ? AND innings_number = 1 LIMIT 1`, [matchId]);
  let r = null;
  try {
    r = await ruleFor(db, matchId);
  } catch {
    r = null;
  }
  return {
    matchId: Number(matchId),
    pending: m.status === "completed" && !m.winner_team_id,
    rule: r ? r.rule : "super_over",
    teams: [{ id: Number(m.team1_id), name: m.team1_name }, { id: Number(m.team2_id), name: m.team2_name }],
    firstBattingTeamId: first ? Number(first.team_id) : null,
  };
}

const whole = (v, max) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new ScoringError("Enter the super-over runs and wickets as whole numbers");
  return n;
};

/** Lock a match that ended level and make sure it is still waiting for its tie-break. */
async function lockTied(conn, matchId) {
  const [[m]] = await conn.query(`SELECT match_id, status, winner_team_id, team1_id, team2_id FROM matches WHERE match_id = ? FOR UPDATE`, [matchId]);
  if (!m) throw new ScoringError("Match not found", 404);
  if (m.status !== "completed" || m.winner_team_id) throw new ScoringError("This match is not waiting for a tie-break", 409);
  return m;
}

/**
 * Write the winner of a tied match (inside the caller's transaction): the match, its fixture, the tie-break record, the next round
 * of the bracket, and everything that follows from a result (points, figures, final positions, notifications).
 */
async function applyDecision(conn, m, { method, winner, runs = [null, null], wkts = [null, null], note = "", by = null }) {
  const matchId = m.match_id;
  const loser = Number(winner) === Number(m.team1_id) ? m.team2_id : m.team1_id;
  const decidedBy = DECIDED[method];

  await conn.query(`UPDATE matches SET winner_team_id = ?, decided_by = ? WHERE match_id = ?`, [winner, decidedBy, matchId]);
  await conn.query(`UPDATE tournament_matches SET winner_team_id = ?, status = 'completed' WHERE match_id = ?`, [winner, matchId]);
  await conn.query(
    `INSERT INTO match_tiebreaks (match_id, method, team1_runs, team1_wickets, team2_runs, team2_wickets, winner_team_id, note, decided_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE method = VALUES(method), team1_runs = VALUES(team1_runs), team1_wickets = VALUES(team1_wickets), team2_runs = VALUES(team2_runs),
       team2_wickets = VALUES(team2_wickets), winner_team_id = VALUES(winner_team_id), note = VALUES(note), decided_by = VALUES(decided_by)`,
    [matchId, method, runs[0], wkts[0], runs[1], wkts[1], winner, String(note || "").trim().slice(0, 300) || null, by]
  );
  await advanceBracket(conn, matchId, winner, loser);
  // the winner changed, so points, figures, final positions and notifications are worked out again
  await postMatchHooks.onMatchCompleted(conn, matchId);
  return { matchId: Number(matchId), winnerTeamId: Number(winner), decidedBy };
}

/**
 * Settle a tied match.
 * @param input { method: 'super_over' | 'batted_first' | 'manual', team1Runs, team1Wickets, team2Runs, team2Wickets, winnerTeamId, note }
 */
async function resolve(matchId, input = {}, by = null) {
  const method = input.method;
  if (!RULES.includes(method)) throw new ScoringError("Choose how the tie is settled: super over, batted first, or pick the winner");

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const m = await lockTied(conn, matchId);

    let winner;
    let runs = [null, null];
    let wkts = [null, null];
    if (method === "super_over") {
      runs = [whole(input.team1Runs, 200), whole(input.team2Runs, 200)];
      wkts = [whole(input.team1Wickets, 10), whole(input.team2Wickets, 10)];
      if (runs[0] === runs[1]) throw new ScoringError("The super over is level too. Record the next one, or choose another way to settle it.", 409);
      winner = runs[0] > runs[1] ? m.team1_id : m.team2_id;
    } else if (method === "batted_first") {
      const [[first]] = await conn.query(`SELECT team_id FROM innings WHERE match_id = ? AND innings_number = 1 LIMIT 1`, [matchId]);
      if (!first) throw new ScoringError("The first innings was not found", 409);
      winner = first.team_id;
    } else {
      winner = Number(input.winnerTeamId);
      if (![Number(m.team1_id), Number(m.team2_id)].includes(winner)) throw new ScoringError("Choose one of the two teams as the winner");
    }

    const out = await applyDecision(conn, m, { method, winner, runs, wkts, note: input.note, by });
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { RULES, DECIDED, ruleFor, autoWinner, recordAuto, status, resolve, lockTied, applyDecision };

/* ------------------------------ tournament rules ------------------------------ */

const cleanRule = (v, label) => {
  if (!RULES.includes(v)) throw new ScoringError(`${label}: choose super over, batted first or host decides`);
  return v;
};

module.exports.getRules = async (tournamentId) => {
  const [[t]] = await db.query(`SELECT id, tie_rule_group, tie_rule_knockout FROM tournaments WHERE id = ?`, [tournamentId]);
  if (!t) throw new ScoringError("Tournament not found", 404);
  return { group: t.tie_rule_group || "super_over", knockout: t.tie_rule_knockout || "super_over" };
};

module.exports.setRules = async (tournamentId, input = {}) => {
  const group = cleanRule(input.group, "Group matches");
  const knockout = cleanRule(input.knockout, "Knock-outs");
  const [res] = await db.query(`UPDATE tournaments SET tie_rule_group = ?, tie_rule_knockout = ? WHERE id = ?`, [group, knockout, tournamentId]);
  if (!res.affectedRows) throw new ScoringError("Tournament not found", 404);
  return { group, knockout };
};
