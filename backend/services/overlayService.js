// The overlay desk: the operator decides what the broadcast screen shows for a match (squads, openers,
// bowler, scorecard ...). The choice is stored per match so a reloaded OBS page comes back to the same scene,
// and pushed to every viewer of the match over the socket.
//
// The scenes only need to know WHICH scene and a few options; the figures come from the live scoreboard,
// the scorecard and the squads, so they are always the real numbers.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const squadService = require("./squadService");
const playerStats = require("./playerStatsService");

const SCENES = [
  "none", // only the score bar
  "preview", // the two teams, the match and the tournament (before the toss)
  "over_summary", // the over just bowled: balls, runs, the bowler
  "squads", // playing XI of one or both teams        { teamId?: id | null for both }
  "toss", // who won the toss and what they chose
  "openers", // opening batters + opening bowler
  "batters", // the batters at the crease                { which?: "both" | "striker" | "nonStriker" }
  "bowler", // the bowler and this over
  "player", // one player's card                        { playerId } or { role: "striker" | "nonStriker" | "bowler" }
  "partnership", // current partnership
  "last_wicket", // fall of the last wicket
  "scorecard", // an innings scorecard                  { innings: 1 | 2 }
  "target", // target / runs needed
  "summary", // top performers of the match
  "result", // match result
  "potm", // player of the match
  "rankings", // team ranking table
  "message", // free text lower third                   { text, subtext? }
];

const clean = (v, max) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/**
 * What the always-on score bar shows. The operator switches the parts on and off; it stays until changed,
 * through scene changes and reloads. It is kept inside the stored payload (key "bar") so no table changes.
 */
const BATTER_MODES = ["both", "striker", "nonStriker", "none"];
const EVENT_STYLES = ["bar", "banner"];
const BAR_DEFAULTS = {
  visible: true, // the whole bar
  batters: "both", // both | striker | nonStriker | none
  bowler: true,
  thisOver: true, // the balls of the over
  info: true, // the block on the right: target / need, or run rate and projection
  photos: true, // player photos in the bar
  corner: true, // the tournament / LIVE tag in the top-left corner
  events: true, // the four / six / wicket / fifty animations
  eventStyle: "bar", // bar: they play inside the score bar itself | banner: a photo banner above it
};

function cleanBar(input = {}, base = BAR_DEFAULTS) {
  const out = { ...BAR_DEFAULTS, ...base };
  for (const key of Object.keys(BAR_DEFAULTS)) {
    if (input[key] === undefined) continue;
    if (key === "batters") {
      if (!BATTER_MODES.includes(input[key])) throw new ScoringError(`Batters: choose ${BATTER_MODES.join(", ")}`);
      out[key] = input[key];
    } else if (key === "eventStyle") {
      if (!EVENT_STYLES.includes(input[key])) throw new ScoringError(`Show four / six / wicket: choose ${EVENT_STYLES.join(" or ")}`);
      out[key] = input[key];
    } else {
      out[key] = !!input[key];
    }
  }
  return out;
}

const WHICH = ["both", "striker", "nonStriker"];
const ROLES = ["striker", "nonStriker", "bowler"];

function cleanPayload(scene, payload = {}) {
  const out = {};
  if (scene === "squads") out.teamId = payload.teamId ? Number(payload.teamId) : null;
  if (scene === "scorecard") out.innings = Number(payload.innings) === 2 ? 2 : 1;
  if (scene === "batters") out.which = WHICH.includes(payload.which) ? payload.which : "both";
  if (scene === "player") {
    out.role = ROLES.includes(payload.role) ? payload.role : null;
    out.playerId = payload.playerId ? Number(payload.playerId) : null;
    if (!out.role && !out.playerId) throw new ScoringError("Choose the player to show");
  }
  if (scene === "message") {
    out.text = clean(payload.text, 140);
    out.subtext = clean(payload.subtext, 200);
    if (!out.text) throw new ScoringError("Type the message to show");
  }
  return out;
}

const shape = (r) => {
  const stored = r && r.payload ? safeJson(r.payload) : {};
  const { bar, ...payload } = stored;
  return {
    scene: r ? r.scene : "none",
    payload,
    bar: cleanBar({}, bar && typeof bar === "object" ? bar : {}),
    autoHide: r && r.auto_hide ? Number(r.auto_hide) : null,
    shownAt: r && r.shown_at ? new Date(r.shown_at).toISOString() : null,
    updatedAt: r && r.updated_at ? new Date(r.updated_at).toISOString() : null,
  };
};

function safeJson(text) {
  try {
    return JSON.parse(text) || {};
  } catch {
    return {};
  }
}

async function assertMatch(conn, matchId) {
  const [[m]] = await conn.query(`SELECT match_id, tournament_id, team1_id, team2_id, status, winner_team_id, player_of_match_id FROM matches WHERE match_id = ?`, [matchId]);
  if (!m) throw new ScoringError("Match not found", 404);
  return m;
}

exports.SCENES = SCENES;

exports.assertMatchExists = (matchId) => assertMatch(db, matchId);

exports.getState = async (matchId, conn = db) => {
  const [[row]] = await conn.query(`SELECT scene, payload, auto_hide, shown_at, updated_at FROM match_overlay WHERE match_id = ?`, [matchId]);
  return shape(row);
};

/** @param input { scene, payload?, autoHide? (seconds, 2 to 120) } */
exports.setState = async (matchId, input = {}) => {
  await assertMatch(db, matchId);
  const scene = String(input.scene || "");
  if (!SCENES.includes(scene)) throw new ScoringError(`Unknown scene: ${scene}`);
  const payload = cleanPayload(scene, input.payload);
  let autoHide = null;
  if (input.autoHide !== undefined && input.autoHide !== null && input.autoHide !== "") {
    autoHide = Number(input.autoHide);
    if (!Number.isInteger(autoHide) || autoHide < 2 || autoHide > 120) throw new ScoringError("Hide after: choose 2 to 120 seconds");
  }
  if (scene === "none") autoHide = null;
  // the score-bar settings belong to the match, not to a scene: carry them over
  const { bar } = await exports.getState(matchId);
  await db.query(
    `INSERT INTO match_overlay (match_id, scene, payload, auto_hide, shown_at) VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE scene = VALUES(scene), payload = VALUES(payload), auto_hide = VALUES(auto_hide), shown_at = NOW()`,
    [matchId, scene, JSON.stringify({ ...payload, bar }), autoHide]
  );
  const state = await exports.getState(matchId);
  return state;
};

/** Change what the score bar shows. Only the keys sent change; what is on air besides the bar is left alone. */
exports.setBar = async (matchId, input = {}) => {
  await assertMatch(db, matchId);
  const current = await exports.getState(matchId);
  const bar = cleanBar(input, current.bar);
  await db.query(
    `INSERT INTO match_overlay (match_id, scene, payload, auto_hide, shown_at) VALUES (?, 'none', ?, NULL, NULL)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [matchId, JSON.stringify({ ...current.payload, bar })]
  );
  return exports.getState(matchId);
};

exports.BAR_DEFAULTS = BAR_DEFAULTS;
exports.cleanBar = cleanBar;
exports.cleanPayload = cleanPayload;

/**
 * Everything a scene may need besides the scoreboard and the scorecard.
 * Squads are those of the match (frozen at the toss, or the declared ones before).
 */
exports.getData = async (matchId) => {
  const match = await assertMatch(db, matchId);
  const [[fixture]] = await db.query(`SELECT id, tournament_id, stage, group_name, round_number, venue FROM tournament_matches WHERE match_id = ? LIMIT 1`, [matchId]);
  const teamIds = [match.team1_id, match.team2_id].filter(Boolean);
  const [teamRows] = teamIds.length ? await db.query(`SELECT id, team_name, logo FROM teams WHERE id IN (?)`, [teamIds]) : [[]];
  const teams = teamIds.map((id) => {
    const t = teamRows.find((r) => Number(r.id) === Number(id)) || {};
    return { id: Number(id), name: t.team_name || `Team ${id}`, logo: t.logo || null };
  });
  const [[tournament]] = await db.query(`SELECT id, name FROM tournaments WHERE id = ?`, [match.tournament_id]);

  const squads = fixture ? await squadService.getFixtureSquads(db, fixture.id, fixture.tournament_id, teams) : {};

  let playerOfMatch = null;
  let suggested = null;
  try {
    const rows = await playerStats.buildMatchRows(db, matchId);
    const best = playerStats.suggestPlayerOfMatch(rows, match.winner_team_id);
    const ids = [match.player_of_match_id, best && best.player_id].filter(Boolean);
    const [people] = ids.length ? await db.query(`SELECT player_id, players_name, profile_picture, team_id FROM players_core WHERE player_id IN (?)`, [ids]) : [[]];
    const card = (id) => {
      const p = people.find((x) => Number(x.player_id) === Number(id));
      return p ? { id: Number(p.player_id), name: p.players_name, photo: p.profile_picture || null, teamId: Number(p.team_id) } : null;
    };
    if (match.player_of_match_id) playerOfMatch = card(match.player_of_match_id);
    if (best) suggested = card(best.player_id);
  } catch (err) {
    if (process.env.NODE_ENV !== "test") console.error("Could not work out the player of the match:", err.message);
  }

  return {
    matchId: Number(matchId),
    status: match.status,
    tournament: tournament ? { id: tournament.id, name: tournament.name } : null,
    stage: fixture ? fixture.stage : null,
    group: fixture ? fixture.group_name : null,
    round: fixture ? fixture.round_number : null,
    venue: fixture ? fixture.venue : null,
    teams,
    squads,
    playerOfMatch,
    suggestedPlayerOfMatch: suggested,
    state: await exports.getState(matchId),
  };
};

/** The operator confirms the player of the match (must be in one of the two squads). */
exports.setPlayerOfMatch = async (matchId, playerId) => {
  const match = await assertMatch(db, matchId);
  const id = Number(playerId);
  if (!Number.isInteger(id) || id <= 0) throw new ScoringError("Choose the player");
  const [rows] = await db.query(
    `SELECT ms.player_id FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id WHERE tm.match_id = ? AND ms.player_id = ?`,
    [matchId, id]
  );
  if (!rows.length) throw new ScoringError("That player was not in this match");
  await db.query(`UPDATE matches SET player_of_match_id = ? WHERE match_id = ?`, [id, matchId]);
  // the player of the match earns bonus rating points: rebuild the figures of a finished match
  if (match.status === "completed") {
    try {
      await playerStats.snapshotMatch(db, matchId);
    } catch (err) {
      if (process.env.NODE_ENV !== "test") console.error("Could not refresh the player figures:", err.message);
    }
  }
  return { matchId: Number(matchId), playerOfMatchId: id, tournamentId: match.tournament_id };
};
