// Rating points for one player in one match. The same formula everywhere, written down so the association
// can explain it to anybody:
//
//  BATTING   runs, +1 per four, +2 per six, +5/+10/+20 for 25/50/100, -3 for a duck,
//            strike-rate bonus = half the runs scored above what an average batter would have made off the
//            same balls in this match (at most +20, at worst -5), +5 for finishing a winning chase not out
//  BOWLING   20 per wicket (+10 for three or more), 8 per maiden, 1 per dot ball,
//            economy bonus = three quarters of the runs saved against the match's average (from -10 to +20)
//  FIELDING  catch 8, stumping 10, run out 10
//  BONUS     +5 for being in the winning XI, +15 for player of the match
//
// "Average" is the match's own run rate (both innings together), so a good score on a slow, low-scoring day
// counts for more than the same score on a flat track.

const POINTS = {
  four: 1, six: 2, fifty25: 5, fifty: 10, hundred: 20, duck: -3, finisher: 5,
  srFactor: 0.5, srCap: 20, srFloor: -5,
  wicket: 20, threeWickets: 10, maiden: 8, dot: 1, econFactor: 0.75, econCap: 20, econFloor: -10,
  catch: 8, stumping: 10, runOut: 10,
  win: 5, playerOfMatch: 15,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v) => Math.round(v * 100) / 100;

/**
 * @param row a player_match_stats row (runs, balls, fours, sixes, not_out, batted, bowled_balls, runs_conceded, wickets,
 *            maidens, dots, catches, stumpings, run_outs, in_xi)
 * @param ctx { parRpb: runs per ball of the whole match, won: bool, chased: bool (the winner batted second), potm: bool }
 */
function matchPoints(row, ctx = {}) {
  const par = ctx.parRpb > 0 ? ctx.parRpb : 0.2;
  let bat = 0;
  let bowl = 0;
  let field = 0;
  let bonus = 0;

  if (row.batted) {
    bat += row.runs + row.fours * POINTS.four + row.sixes * POINTS.six;
    if (row.runs >= 100) bat += POINTS.hundred;
    else if (row.runs >= 50) bat += POINTS.fifty;
    else if (row.runs >= 25) bat += POINTS.fifty25;
    if (row.runs === 0 && !row.not_out) bat += POINTS.duck;
    bat += clamp(POINTS.srFactor * (row.runs - par * row.balls), POINTS.srFloor, POINTS.srCap);
    if (ctx.won && ctx.chased && row.not_out) bat += POINTS.finisher;
  }

  if (row.bowled_balls > 0) {
    bowl += row.wickets * POINTS.wicket + (row.wickets >= 3 ? POINTS.threeWickets : 0);
    bowl += row.maidens * POINTS.maiden + row.dots * POINTS.dot;
    bowl += clamp(POINTS.econFactor * (par * row.bowled_balls - row.runs_conceded), POINTS.econFloor, POINTS.econCap);
  }

  field += row.catches * POINTS.catch + row.stumpings * POINTS.stumping + row.run_outs * POINTS.runOut;

  if (row.in_xi && ctx.won) bonus += POINTS.win;
  if (ctx.potm) bonus += POINTS.playerOfMatch;

  return { bat: round(bat), bowl: round(bowl), field: round(field), bonus: round(bonus), total: round(bat + bowl + field + bonus) };
}

module.exports = { POINTS, matchPoints };
