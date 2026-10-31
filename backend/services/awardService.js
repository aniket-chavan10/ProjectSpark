// Season and tournament awards, like the ICC awards. The system looks at the season's figures and SUGGESTS a winner
// and two nominees for each award; the association confirms them (or names somebody else) and then publishes them
// on the public site. A confirmed or hand-picked award is never overwritten when suggestions are generated again.
//
// An award row = one nominee: rank 1 is the winner, 2 and 3 the nominees. The "XI of the season" uses rank as the slot.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const ratings = require("./ratingService");
const playerRanking = require("./playerRankingService");
const points = require("./pointsService");

/** The catalogue. `metric` ranks the players; `min` keeps tiny samples (one lucky over) from winning. */
const PLAYER_AWARDS = [
  { key: "player_of_season", label: "Player of the Season", metric: (p) => p.points, text: (p) => `${p.points} rating points · overall ${p.overall ?? "-"}`, eligible: (p) => p.matches >= 2 && p.points > 0 },
  { key: "best_batter", label: "Best Batter", metric: (p) => p.runs, text: (p) => `${p.runs} runs${p.average ? ` · avg ${p.average}` : ""}`, eligible: (p) => p.runs > 0 },
  { key: "best_bowler", label: "Best Bowler", metric: (p) => p.wickets * 1000 - (p.economy || 0), text: (p) => `${p.wickets} wickets${p.economy ? ` · econ ${p.economy}` : ""}`, eligible: (p) => p.wickets > 0 },
  { key: "best_allrounder", label: "Best All-rounder", metric: (p) => p.allrounder, text: (p) => `${p.runs} runs, ${p.wickets} wkts · rating ${p.allrounder}`, eligible: (p) => !!p.allrounder },
  { key: "best_keeper", label: "Best Wicket-keeper", metric: (p) => p.keeperDismissals * 1000 + p.runs, text: (p) => `${p.keeperDismissals} dismissals`, eligible: (p) => p.keeperMatches > 0 && p.keeperDismissals > 0 },
  { key: "best_fielder", label: "Best Fielder", metric: (p) => p.catches + p.stumpings + p.runOuts, text: (p) => `${p.catches} catches, ${p.runOuts} run outs${p.stumpings ? `, ${p.stumpings} stumpings` : ""}`, eligible: (p) => p.catches + p.stumpings + p.runOuts > 0 },
  { key: "most_sixes", label: "Most Sixes", metric: (p) => p.sixes, text: (p) => `${p.sixes} sixes`, eligible: (p) => p.sixes > 0 },
  { key: "best_strike_rate", label: "Best Strike Rate", metric: (p) => p.strikeRate, text: (p) => `SR ${p.strikeRate} · ${p.runs} runs`, eligible: (p) => p.balls >= 30 && p.innings >= 3 && p.strikeRate > 0 },
  { key: "best_economy", label: "Best Economy", metric: (p) => -p.economy, text: (p) => `econ ${p.economy} · ${p.overs} overs`, eligible: (p) => p.bowledBalls >= 18 && p.economy !== null },
];
const TOURNAMENT_AWARDS = [
  { key: "player_of_tournament", label: "Player of the Tournament", base: "player_of_season" },
  { key: "tournament_best_batter", label: "Top Run Scorer", base: "best_batter" },
  { key: "tournament_best_bowler", label: "Top Wicket Taker", base: "best_bowler" },
];
const TEAM_AWARDS = [
  { key: "team_of_season", label: "Team of the Season" },
  { key: "fair_play", label: "Fair Play Team" },
];
const XI = { key: "xi_of_season", label: "XI of the Season" };

const LABELS = Object.fromEntries([...PLAYER_AWARDS, ...TOURNAMENT_AWARDS, ...TEAM_AWARDS, XI].map((a) => [a.key, a.label]));
const ORDER = [...PLAYER_AWARDS, ...TEAM_AWARDS, XI, ...TOURNAMENT_AWARDS].map((a) => a.key);

const top = (list, metric, eligible, n = 3) =>
  list.filter(eligible).sort((a, b) => metric(b) - metric(a) || b.matches - a.matches || a.playerId - b.playerId).slice(0, n);

/** Pure: one award's nominees (winner first) from the merged player records. */
function nominees(players, def) {
  return top(players, def.metric, def.eligible).map((p) => ({ subjectType: "player", subjectId: p.playerId, valueText: def.text(p) }));
}

/** Pure: the XI of the season: a keeper, four batters, two all-rounders, four bowlers, nobody twice. */
function pickXI(players) {
  const used = new Set();
  const take = (list, n, role) => {
    const picked = [];
    for (const p of list) {
      if (picked.length === n) break;
      if (used.has(p.playerId)) continue;
      used.add(p.playerId);
      picked.push({ subjectType: "player", subjectId: p.playerId, valueText: `${role} · ${p.runs} runs, ${p.wickets} wkts` });
    }
    return picked;
  };
  const by = (key, filter = () => true) => players.filter((p) => p[key] != null && filter(p)).sort((a, b) => b[key] - a[key] || a.playerId - b.playerId);
  const keepers = players.filter((p) => p.keeperMatches > 0).sort((a, b) => b.keeperDismissals - a.keeperDismissals || b.runs - a.runs || a.playerId - b.playerId);
  const xi = [
    ...take(keepers, 1, "Wicket-keeper"),
    ...take(by("allrounder"), 2, "All-rounder"),
    ...take(by("batting"), 4, "Batter"),
    ...take(by("bowling"), 4, "Bowler"),
  ];
  // not enough specialists (a small season): fill the rest with the best overall
  if (xi.length < 11) xi.push(...take(by("overall"), 11 - xi.length, "Player"));
  return xi;
}

/** Pure: the award list of one scope. `players` merges figures and ratings per player. */
function buildAwards({ players, teams = [], fairPlay = [], tournament = false }) {
  const out = [];
  if (tournament) {
    for (const def of TOURNAMENT_AWARDS) {
      const base = PLAYER_AWARDS.find((a) => a.key === def.base);
      const list = nominees(players, base);
      if (list.length) out.push({ key: def.key, nominees: list });
    }
    return out;
  }
  for (const def of PLAYER_AWARDS) {
    const list = nominees(players, def);
    if (list.length) out.push({ key: def.key, nominees: list });
  }
  const bestTeams = [...teams].filter((t) => t.points > 0).sort((a, b) => b.points - a.points || b.titles - a.titles || a.teamId - b.teamId).slice(0, 3);
  if (bestTeams.length) out.push({ key: "team_of_season", nominees: bestTeams.map((t) => ({ subjectType: "team", subjectId: t.teamId, valueText: `${t.points} points${t.titles ? ` · ${t.titles} title${t.titles > 1 ? "s" : ""}` : ""}` })) });
  const clean = fairPlay.filter((t) => t.matches >= 3).sort((a, b) => a.perMatch - b.perMatch || a.teamId - b.teamId).slice(0, 3);
  if (clean.length) out.push({ key: "fair_play", nominees: clean.map((t) => ({ subjectType: "team", subjectId: t.teamId, valueText: `${t.perMatch.toFixed(1)} wides and no-balls a match` })) });
  const xi = pickXI(players);
  if (xi.length >= 5) out.push({ key: "xi_of_season", nominees: xi, slots: true });
  return out;
}

/* --------------------------------- loading --------------------------------- */

async function merged(scope) {
  const [stats, rates] = await Promise.all([playerRanking.aggregate(scope), ratings.all(scope)]);
  const byId = Object.fromEntries(rates.map((r) => [r.playerId, r]));
  return stats.map((s) => ({ ...s, ...(byId[s.playerId] || {}), matches: s.matches }));
}

async function fairPlayRows(season) {
  const [rows] = await db.query(
    `SELECT team_id, SUM(wides + no_balls) AS extras, COUNT(DISTINCT match_id) AS matches FROM player_match_stats WHERE season_year = ? GROUP BY team_id`,
    [season]
  );
  return rows.map((r) => ({ teamId: Number(r.team_id), matches: Number(r.matches), perMatch: Number(r.extras) / Math.max(1, Number(r.matches)) }));
}

const yearOk = (v) => {
  const y = Number(v);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new ScoringError("Choose a season (a year)");
  return y;
};

/* ------------------------------ generate / change ------------------------------ */

async function writeSuggestion(season, tournamentId, award) {
  // an award the association has confirmed, changed or published is left alone
  const [locked] = await db.query(`SELECT id FROM awards WHERE season_year = ? AND award_key = ? AND tournament_id = ? AND (status <> 'suggested' OR is_manual = 1) LIMIT 1`, [season, award.key, tournamentId]);
  if (locked.length) return false;
  await db.query(`DELETE FROM awards WHERE season_year = ? AND award_key = ? AND tournament_id = ?`, [season, award.key, tournamentId]);
  await db.query(`INSERT INTO awards (season_year, award_key, tournament_id, subject_type, subject_id, rank_no, value_text) VALUES ?`, [
    award.nominees.map((n, i) => [season, award.key, tournamentId, n.subjectType, n.subjectId, i + 1, n.valueText]),
  ]);
  return true;
}

/** Work out suggestions for a season and each of its tournaments. Returns how many awards were (re)written. */
exports.generate = async (season) => {
  const year = yearOk(season);
  const players = await merged({ season: year });
  const teams = await points.teamRankings({ season: year, limit: 500 });
  let written = 0;
  for (const award of buildAwards({ players, teams, fairPlay: await fairPlayRows(year) })) if (await writeSuggestion(year, 0, award)) written += 1;

  const [tournaments] = await db.query(`SELECT id FROM tournaments WHERE YEAR(start_date) = ?`, [year]);
  for (const t of tournaments) {
    const scoped = await merged({ tournamentId: t.id });
    for (const award of buildAwards({ players: scoped, tournament: true })) if (await writeSuggestion(year, t.id, award)) written += 1;
  }
  return { season: year, written };
};

async function names(rows) {
  const playerIds = rows.filter((r) => r.subject_type === "player").map((r) => r.subject_id);
  const teamIds = rows.filter((r) => r.subject_type === "team").map((r) => r.subject_id);
  const [players] = playerIds.length ? await db.query(`SELECT p.player_id, p.players_name, p.profile_picture, p.team_id, t.team_name FROM players_core p LEFT JOIN teams t ON t.id = p.team_id WHERE p.player_id IN (?)`, [playerIds]) : [[]];
  const [teams] = teamIds.length ? await db.query(`SELECT id, team_name, logo FROM teams WHERE id IN (?)`, [teamIds]) : [[]];
  return { players: Object.fromEntries(players.map((p) => [Number(p.player_id), p])), teams: Object.fromEntries(teams.map((t) => [Number(t.id), t])) };
}

/** @param opts { publishedOnly } the public site passes true */
exports.list = async (season, { publishedOnly = false } = {}) => {
  const year = yearOk(season);
  const [rows] = await db.query(
    `SELECT a.*, tr.name AS tournament_name FROM awards a LEFT JOIN tournaments tr ON tr.id = a.tournament_id
     WHERE a.season_year = ? ${publishedOnly ? "AND a.status = 'published'" : ""} ORDER BY a.award_key, a.tournament_id, a.rank_no`,
    [year]
  );
  const lookup = await names(rows);
  const groups = new Map();
  for (const r of rows) {
    const id = `${r.award_key}:${r.tournament_id}`;
    if (!groups.has(id)) groups.set(id, { key: r.award_key, label: LABELS[r.award_key] || r.award_key, tournamentId: Number(r.tournament_id) || null, tournament: r.tournament_name || null, slots: r.award_key === XI.key, status: r.status, manual: !!r.is_manual, entries: [] });
    const g = groups.get(id);
    const person = r.subject_type === "player" ? lookup.players[r.subject_id] : lookup.teams[r.subject_id];
    g.entries.push({
      rank: r.rank_no, subjectType: r.subject_type, subjectId: Number(r.subject_id),
      name: person ? person.players_name || person.team_name : `#${r.subject_id}`,
      photo: person ? person.profile_picture || person.logo || null : null,
      teamName: r.subject_type === "player" && person ? person.team_name || null : null,
      valueText: r.value_text, note: r.note,
    });
    if (r.status !== "published" && g.status === "published") g.status = r.status;
  }
  const awards = [...groups.values()].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key) || (a.tournamentId || 0) - (b.tournamentId || 0));
  return { season: year, awards };
};

exports.seasons = async (publishedOnly = false) => {
  const [rows] = await db.query(`SELECT DISTINCT season_year FROM awards ${publishedOnly ? "WHERE status = 'published'" : ""} ORDER BY season_year DESC`);
  const years = rows.map((r) => Number(r.season_year));
  if (!publishedOnly) {
    const [stat] = await db.query(`SELECT DISTINCT season_year FROM player_match_stats ORDER BY season_year DESC`);
    stat.forEach((r) => !years.includes(Number(r.season_year)) && years.push(Number(r.season_year)));
    years.sort((a, b) => b - a);
  }
  return years;
};

/** Name a different winner. The previous winner is dropped from the list; the nominees stay. */
exports.setWinner = async ({ season, awardKey, tournamentId = 0, subjectType, subjectId, note }, by = null) => {
  const year = yearOk(season);
  if (!LABELS[awardKey] || awardKey === XI.key) throw new ScoringError("Unknown award");
  const type = TEAM_AWARDS.some((a) => a.key === awardKey) ? "team" : "player";
  if (subjectType !== type) throw new ScoringError(`This award goes to a ${type}`);
  const id = Number(subjectId);
  if (!Number.isInteger(id) || id <= 0) throw new ScoringError("Choose who wins");
  const [[exists]] = type === "team" ? await db.query(`SELECT id FROM teams WHERE id = ?`, [id]) : await db.query(`SELECT player_id FROM players_core WHERE player_id = ?`, [id]);
  if (!exists) throw new ScoringError("That " + type + " does not exist", 404);
  const tid = Number(tournamentId) || 0;
  const [old] = await db.query(`SELECT value_text FROM awards WHERE season_year = ? AND award_key = ? AND tournament_id = ? AND subject_id = ?`, [year, awardKey, tid, id]);
  await db.query(`DELETE FROM awards WHERE season_year = ? AND award_key = ? AND tournament_id = ? AND (rank_no = 1 OR subject_id = ?)`, [year, awardKey, tid, id]);
  await db.query(
    `INSERT INTO awards (season_year, award_key, tournament_id, subject_type, subject_id, rank_no, value_text, status, is_manual, note, decided_by) VALUES (?, ?, ?, ?, ?, 1, ?, 'confirmed', 1, ?, ?)`,
    [year, awardKey, tid, type, id, (old[0] && old[0].value_text) || "Chosen by the association", String(note || "").trim().slice(0, 300) || null, by]
  );
  return { season: year, awardKey };
};

/** Confirm suggestions (all of the season, or only the given award keys). */
exports.confirm = async (season, keys) => {
  const year = yearOk(season);
  const only = Array.isArray(keys) && keys.length;
  const [res] = await db.query(`UPDATE awards SET status = 'confirmed' WHERE season_year = ? AND status = 'suggested' ${only ? "AND award_key IN (?)" : ""}`, only ? [year, keys] : [year]);
  return { season: year, confirmed: res.affectedRows };
};

exports.publish = async (season) => {
  const year = yearOk(season);
  const [res] = await db.query(`UPDATE awards SET status = 'published' WHERE season_year = ? AND status = 'confirmed'`, [year]);
  return { season: year, published: res.affectedRows };
};

exports.unpublish = async (season) => {
  const year = yearOk(season);
  const [res] = await db.query(`UPDATE awards SET status = 'confirmed' WHERE season_year = ? AND status = 'published'`, [year]);
  return { season: year, unpublished: res.affectedRows };
};

exports.LABELS = LABELS;
exports.buildAwards = buildAwards;
exports.pickXI = pickXI;
exports.nominees = nominees;
exports.PLAYER_AWARDS = PLAYER_AWARDS;
