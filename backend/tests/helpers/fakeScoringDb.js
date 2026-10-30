// A tiny in-memory stand-in for the MySQL tables the scoring engine touches.
// It understands exactly the statements the services run, so the real service code
// (not a copy of it) can be exercised without a database.

const norm = (sql) => sql.replace(/\s+/g, " ").trim();
const copy = (o) => (o ? { ...o } : o);

class FakeScoringDb {
  constructor({ totalOvers = 5, team1 = 1, team2 = 2 } = {}) {
    this.ids = { over: 1, ball: 1, match: 100, inning: 10 };
    this.matches = {
      100: {
        match_id: 100,
        total_overs: totalOvers,
        team1_id: team1,
        team2_id: team2,
        target_score: null,
        status: "live",
        winner_team_id: null,
        victory_margin_type: null,
        victory_margin: null,
      },
    };
    this.innings = {};
    this.live = {};
    this.overs = [];
    this.balls = [];
    this.perf = {};
    this.stats = {};
    this.tm = [];
    this.addInnings(1, 1, team1);
    this.addInnings(2, 2, team2);
    this.ids.inning = 10;
  }

  addInnings(inningId, number, teamId, matchId = 100) {
    this.innings[inningId] = {
      inning_id: inningId,
      match_id: matchId,
      innings_number: number,
      team_id: teamId,
      status: "live",
      balls_bowled: 0,
      total_runs: 0,
      wickets: 0,
      extras: 0,
      overs: "0.0",
      run_rate: 0,
    };
    this.live[inningId] = {
      inning_id: inningId,
      match_id: matchId,
      on_strike_batsman_id: null,
      non_striker_batsman_id: null,
      batsman1_id: null,
      batsman2_id: null,
      current_score: 0,
      current_wickets: 0,
      legal_balls_in_over: 0,
      legal_over_count: 0,
      bowler_id: null,
      partnership_runs: 0,
      current_overs: "0.0",
      last_wicket_player_id: null,
      last_wicket_over: null,
      last_wicket_description: null,
    };
  }

  /** What liveMatchService.setInitialPlayers does. */
  setInitialPlayers(inningId, striker, nonStriker, bowler) {
    Object.assign(this.live[inningId], {
      batsman1_id: striker,
      batsman2_id: nonStriker,
      on_strike_batsman_id: striker,
      non_striker_batsman_id: nonStriker,
      bowler_id: bowler,
    });
  }

  get conn() {
    return { execute: (sql, params) => this.execute(sql, params), query: (sql, params) => this.execute(sql, params) };
  }

  async execute(sql, p = []) {
    const s = norm(sql);
    const rows = (r) => [r];
    const ok = (extra = {}) => [{ affectedRows: 1, insertId: 0, ...extra }];

    /* ----------------------------- live_scorecards ----------------------------- */
    if (s.startsWith("SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id, current_score")) {
      return rows(this.live[p[0]] ? [copy(this.live[p[0]])] : []);
    }
    if (s.startsWith("SELECT on_strike_batsman_id, non_striker_batsman_id, batsman1_id, batsman2_id FROM live_scorecards")) {
      const l = this.live[p[0]];
      return rows(l && l.match_id === Number(p[1]) ? [copy(l)] : []);
    }
    if (s.startsWith("UPDATE live_scorecards SET on_strike_batsman_id = ?, non_striker_batsman_id = ?, batsman1_id = ?, batsman2_id = ? WHERE")) {
      Object.assign(this.live[p[4]], {
        on_strike_batsman_id: p[0],
        non_striker_batsman_id: p[1],
        batsman1_id: p[2],
        batsman2_id: p[3],
      });
      return ok();
    }
    if (s.startsWith("UPDATE live_scorecards SET on_strike_batsman_id = ?, non_striker_batsman_id = ? WHERE inning_id")) {
      Object.assign(this.live[p[2]], { on_strike_batsman_id: p[0], non_striker_batsman_id: p[1] });
      return ok();
    }
    if (s.startsWith("SELECT bowler_id, legal_over_count FROM live_scorecards")) return rows([copy(this.live[p[0]])]);
    if (s.startsWith("UPDATE live_scorecards SET bowler_id = ?, legal_balls_in_over = 0")) {
      const l = this.live[p[1]];
      if (l.bowler_id) return [{ affectedRows: 0 }];
      Object.assign(l, { bowler_id: p[0], legal_balls_in_over: 0 });
      return ok();
    }
    if (s.startsWith("UPDATE live_scorecards SET current_score = ?")) {
      const l = this.live[p[p.length - 1]];
      const undo = s.includes("last_wicket_player_id = ?");
      Object.assign(l, {
        current_score: p[0],
        current_wickets: p[1],
        legal_balls_in_over: p[2],
        legal_over_count: p[3],
        current_overs: p[4],
        on_strike_batsman_id: p[5],
        non_striker_batsman_id: p[6],
        batsman1_id: p[7],
        batsman2_id: p[8],
        bowler_id: p[9],
        partnership_runs: p[10],
      });
      if (undo) Object.assign(l, { last_wicket_player_id: p[12], last_wicket_over: p[13], last_wicket_description: p[14] });
      return ok();
    }
    if (s.startsWith("UPDATE live_scorecards SET last_wicket_player_id = ?, last_wicket_over = ?, last_wicket_description = ? WHERE")) {
      Object.assign(this.live[p[3]], { last_wicket_player_id: p[0], last_wicket_over: p[1], last_wicket_description: p[2] });
      return ok();
    }
    if (s.startsWith("INSERT INTO live_scorecards")) {
      this.addInnings(p[1], this.innings[p[1]] ? this.innings[p[1]].innings_number : 0, p[0], p[2]);
      return ok();
    }

    /* -------------------------------- matches -------------------------------- */
    if (s.startsWith("SELECT total_overs, team1_id, team2_id, target_score, status FROM matches")) {
      return rows(this.matches[p[0]] ? [copy(this.matches[p[0]])] : []);
    }
    if (s.startsWith("SELECT total_overs, status FROM matches")) return rows([copy(this.matches[p[0]])]);
    if (s.startsWith("SELECT total_overs FROM matches")) return rows([copy(this.matches[p[0]])]);
    if (s.startsWith("UPDATE matches SET target_score = ? WHERE")) {
      this.matches[p[1]].target_score = p[0];
      return ok();
    }
    if (s.startsWith("UPDATE matches SET winner_team_id = ?, result = 'completed'")) {
      Object.assign(this.matches[p[3]], { winner_team_id: p[0], status: "completed", victory_margin_type: p[1], victory_margin: p[2] });
      return ok();
    }
    if (s.startsWith("UPDATE matches SET winner_team_id = NULL, result = 'live'")) {
      Object.assign(this.matches[p[0]], { winner_team_id: null, status: "live", victory_margin_type: null, victory_margin: null });
      return ok();
    }
    if (s.startsWith("INSERT INTO matches")) {
      const id = ++this.ids.match;
      this.matches[id] = {
        match_id: id,
        total_overs: 5,
        team1_id: p[2],
        team2_id: p[3],
        target_score: null,
        status: "live",
        winner_team_id: null,
        tossWinner: p[5],
        tossDecision: p[6],
      };
      return ok({ insertId: id });
    }

    /* -------------------------------- innings -------------------------------- */
    if (s.startsWith("SELECT balls_bowled, total_runs, wickets, status, innings_number, team_id, match_id FROM innings")) {
      return rows(this.innings[p[0]] ? [copy(this.innings[p[0]])] : []);
    }
    if (s.startsWith("SELECT inning_id, match_id, innings_number, total_runs, wickets, balls_bowled, status FROM innings")) {
      return rows(this.innings[p[0]] ? [copy(this.innings[p[0]])] : []);
    }
    if (s.startsWith("SELECT inning_id FROM innings WHERE match_id = ? AND innings_number = ?")) {
      const i = Object.values(this.innings).find((x) => x.match_id === Number(p[0]) && x.innings_number === p[1]);
      return rows(i ? [{ inning_id: i.inning_id }] : []);
    }
    if (s.startsWith("UPDATE innings SET overs = ?, status = 'completed'")) {
      Object.assign(this.innings[p[1]], { overs: p[0], status: "completed" });
      return ok();
    }
    if (s.startsWith("UPDATE innings SET total_runs = ?")) {
      const undo = s.includes("GREATEST(COALESCE(extras");
      const i = this.innings[p[7]];
      Object.assign(i, { total_runs: p[0], wickets: p[1], balls_bowled: p[2], overs: p[3], status: p[4], run_rate: p[6] });
      i.extras = undo ? Math.max((i.extras || 0) - p[5], 0) : (i.extras || 0) + p[5];
      return ok();
    }
    if (s.startsWith("INSERT INTO innings")) {
      const id = ++this.ids.inning;
      this.innings[id] = {
        inning_id: id, match_id: p[0], team_id: p[1], innings_number: s.includes("VALUES (?, ?, 1)") ? 1 : 2,
        status: "live", balls_bowled: 0, total_runs: 0, wickets: 0, extras: 0,
      };
      this.live[id] = { inning_id: id, match_id: p[0] };
      return ok({ insertId: id });
    }

    /* ---------------------------------- overs ---------------------------------- */
    if (s.startsWith("SELECT over_id, over_number, bowler_id, is_complete FROM overs")) {
      const open = this.overs.filter((o) => o.inning_id === p[0] && !o.is_complete).sort((a, b) => b.over_number - a.over_number)[0];
      return rows(open ? [copy(open)] : []);
    }
    if (s.startsWith("SELECT MAX(over_number) AS maxOver FROM overs")) {
      const mine = this.overs.filter((o) => o.inning_id === p[0]);
      return rows([{ maxOver: mine.length ? Math.max(...mine.map((o) => o.over_number)) : null }]);
    }
    if (s.startsWith("INSERT INTO overs")) {
      const o = { over_id: this.ids.over++, inning_id: p[0], over_number: p[2], bowler_id: p[3], is_complete: false };
      this.overs.push(o);
      return ok({ insertId: o.over_id });
    }
    if (s.startsWith("UPDATE overs SET is_complete = TRUE")) {
      this.overs.find((o) => o.over_id === p[0]).is_complete = true;
      return ok();
    }
    if (s.startsWith("UPDATE overs SET is_complete = FALSE")) {
      this.overs.find((o) => o.over_id === p[0]).is_complete = false;
      return ok();
    }
    if (s.startsWith("DELETE FROM overs WHERE inning_id = ? AND over_number > ?")) {
      this.overs = this.overs.filter(
        (o) => !(o.inning_id === p[0] && o.over_number > p[1] && !this.balls.some((b) => b.over_id === o.over_id))
      );
      return ok();
    }

    /* ---------------------------------- balls ---------------------------------- */
    if (s.startsWith("SELECT COALESCE(MAX(ball_number), 0) + 1 AS nextBallNumber")) {
      const mine = this.balls.filter((b) => b.over_id === p[0]);
      return rows([{ nextBallNumber: (mine.length ? Math.max(...mine.map((b) => b.ball_number)) : 0) + 1 }]);
    }
    if (s.startsWith("INSERT INTO balls")) {
      const b = {
        ball_id: this.ids.ball++, inning_id: p[0], over_id: p[1], over_number: p[2], ball_number: p[3],
        batsman_id: p[4], bowler_id: p[5], runs_scored: p[6], is_wicket: p[7], wicket_type: p[8],
        dismissed_player_id: p[9], fielder_id: p[10], extras: p[11], extra_type: p[12], legal_delivery: p[13], is_retired_hurt: p[14],
      };
      this.balls.push(b);
      return ok({ insertId: b.ball_id });
    }
    if (s.startsWith("SELECT * FROM balls WHERE inning_id = ? ORDER BY ball_id DESC LIMIT 1")) {
      const mine = this.balls.filter((b) => b.inning_id === p[0]).sort((a, b) => b.ball_id - a.ball_id);
      return rows(mine.length ? [copy(mine[0])] : []);
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM balls WHERE over_id = ? AND legal_delivery = 1")) {
      return rows([{ n: this.balls.filter((b) => b.over_id === p[0] && b.legal_delivery === 1).length }]);
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM balls b JOIN innings i")) {
      const n = this.balls.filter((b) => {
        const i = this.innings[b.inning_id];
        return i.match_id === p[0] && i.innings_number > 1;
      }).length;
      return rows([{ n }]);
    }
    if (s.startsWith("DELETE FROM balls WHERE ball_id = ?")) {
      this.balls = this.balls.filter((b) => b.ball_id !== p[0]);
      return ok();
    }
    if (s.startsWith("SELECT COALESCE(SUM(runs_scored + CASE")) {
      const conceded = this.balls
        .filter((b) => b.over_id === p[0])
        .reduce((a, b) => a + b.runs_scored + (b.extra_type === "wide" || b.extra_type === "no-ball" ? b.extras : 0), 0);
      return rows([{ conceded }]);
    }
    if (s.startsWith("SELECT COALESCE(SUM(runs_scored + extras), 0) AS runs FROM balls")) {
      const mine = this.balls.filter((b) => b.inning_id === p[0]);
      const lastOut = Math.max(0, ...mine.filter((b) => b.is_wicket === 1 || b.is_retired_hurt === 1).map((b) => b.ball_id));
      return rows([{ runs: mine.filter((b) => b.ball_id > lastOut).reduce((a, b) => a + b.runs_scored + b.extras, 0) }]);
    }
    if (s.startsWith("SELECT dismissed_player_id, wicket_type,")) {
      const mine = this.balls.filter((b) => b.inning_id === p[0]);
      const w = mine.filter((b) => b.is_wicket === 1).sort((a, b) => b.ball_id - a.ball_id)[0];
      if (!w) return rows([]);
      return rows([
        { dismissed_player_id: w.dismissed_player_id, wicket_type: w.wicket_type, legal_upto: mine.filter((b) => b.ball_id <= w.ball_id && b.legal_delivery === 1).length },
      ]);
    }

    /* ------------------------------ tournament_matches ------------------------------ */
    if (s.startsWith("SELECT id, tournament_id, match_no, team1_id, team2_id, venue, match_id FROM tournament_matches")) {
      return rows(this.tm.filter((m) => m.id === Number(p[0])).map(copy));
    }
    if (s.startsWith("UPDATE tournament_matches SET match_id = ?, status = 'live' WHERE id = ?")) {
      Object.assign(this.tm.find((m) => m.id === Number(p[1])), { match_id: p[0], status: "live" });
      return ok();
    }
    if (s.startsWith("SELECT id FROM tournament_matches WHERE match_id = ? LIMIT 1")) {
      return rows(this.tm.filter((m) => m.match_id === p[0]).map((m) => ({ id: m.id })));
    }
    if (s.startsWith("SELECT id, status, match_id FROM tournament_matches WHERE dependent_match1_id")) {
      return rows(this.tm.filter((m) => m.dependent_match1_id === p[0] || m.dependent_match2_id === p[1]).map(copy));
    }
    if (s.startsWith("UPDATE tournament_matches SET winner_team_id = ?, status = 'completed' WHERE match_id")) {
      this.tm.filter((m) => m.match_id === p[1]).forEach((m) => Object.assign(m, { winner_team_id: p[0], status: "completed" }));
      return ok();
    }
    if (s.startsWith("UPDATE tournament_matches SET winner_team_id = NULL, status = 'live' WHERE match_id")) {
      this.tm.filter((m) => m.match_id === p[0]).forEach((m) => Object.assign(m, { winner_team_id: null, status: "live" }));
      return ok();
    }
    if (s.startsWith("UPDATE tournament_matches SET team1_id = ? WHERE dependent_match1_id")) {
      this.tm.filter((m) => m.dependent_match1_id === p[1]).forEach((m) => (m.team1_id = p[0]));
      return ok();
    }
    if (s.startsWith("UPDATE tournament_matches SET team2_id = ? WHERE dependent_match2_id")) {
      this.tm.filter((m) => m.dependent_match2_id === p[1]).forEach((m) => (m.team2_id = p[0]));
      return ok();
    }
    if (s.startsWith("UPDATE tournament_matches SET team1_id = NULL WHERE dependent_match1_id")) {
      this.tm.filter((m) => m.dependent_match1_id === p[0]).forEach((m) => (m.team1_id = null));
      return ok();
    }
    if (s.startsWith("UPDATE tournament_matches SET team2_id = NULL WHERE dependent_match2_id")) {
      this.tm.filter((m) => m.dependent_match2_id === p[0]).forEach((m) => (m.team2_id = null));
      return ok();
    }

    /* ----------------------------- player_performance ----------------------------- */
    const perfKey = (player, match) => `${player}:${match}`;
    const newPerf = () => ({ runs: 0, balls: 0, fours: 0, sixes: 0, conceded: 0, overs: 0, wkts: 0, maidens: 0 });
    if (s.startsWith("INSERT IGNORE INTO player_performance")) {
      this.perf[perfKey(p[0], p[1])] ??= newPerf();
      return ok();
    }
    if (s.startsWith("SELECT overs_bowled FROM player_performance")) {
      const r = this.perf[perfKey(p[0], p[1])];
      return rows(r ? [{ overs_bowled: r.overs }] : []);
    }
    if (s.startsWith("SELECT runs_scored FROM player_performance")) {
      const r = this.perf[perfKey(p[0], p[1])];
      return rows(r ? [{ runs_scored: r.runs }] : []);
    }
    if (s.startsWith("UPDATE player_performance SET runs_scored")) {
      const r = this.perf[perfKey(p[4], p[5])];
      const sign = s.includes("GREATEST") ? -1 : 1;
      r.runs = Math.max(r.runs + sign * p[0], 0);
      r.balls = Math.max(r.balls + sign * p[1], 0);
      r.fours = Math.max(r.fours + sign * p[2], 0);
      r.sixes = Math.max(r.sixes + sign * p[3], 0);
      return ok();
    }
    if (s.startsWith("UPDATE player_performance SET total_runs_conceded")) {
      const r = this.perf[perfKey(p[3], p[4])];
      const sign = s.includes("GREATEST") ? -1 : 1;
      r.conceded = Math.max(r.conceded + sign * p[0], 0);
      r.overs = p[1];
      r.wkts = Math.max(r.wkts + sign * p[2], 0);
      return ok();
    }
    if (s.startsWith("UPDATE player_performance SET maiden_overs")) {
      const r = this.perf[perfKey(p[1], p[2])];
      r.maidens = Math.max(r.maidens + p[0], 0);
      return ok();
    }

    /* -------------------------------- players_stats -------------------------------- */
    const newStats = () => ({ runs: 0, balls: 0, fours: 0, sixes: 0, ducks: 0, conceded: 0, overs: 0, wkts: 0 });
    if (s.startsWith("INSERT IGNORE INTO players_stats")) {
      this.stats[p[0]] ??= newStats();
      return ok();
    }
    if (s.startsWith("SELECT total_overs_bowled FROM players_stats")) {
      const r = this.stats[p[0]];
      return rows(r ? [{ total_overs_bowled: r.overs }] : []);
    }
    if (s.startsWith("UPDATE players_stats SET total_runs =")) {
      const r = this.stats[p[4]];
      const sign = s.includes("GREATEST") ? -1 : 1;
      r.runs = Math.max(r.runs + sign * p[0], 0);
      r.balls = Math.max(r.balls + sign * p[1], 0);
      r.fours = Math.max(r.fours + sign * p[2], 0);
      r.sixes = Math.max(r.sixes + sign * p[3], 0);
      return ok();
    }
    if (s.startsWith("UPDATE players_stats SET total_ducks")) {
      this.stats[p[0]].ducks = Math.max(this.stats[p[0]].ducks + (s.includes("GREATEST") ? -1 : 1), 0);
      return ok();
    }
    if (s.startsWith("UPDATE players_stats SET total_runs_conceded")) {
      const r = this.stats[p[3]];
      const sign = s.includes("GREATEST") ? -1 : 1;
      r.conceded = Math.max(r.conceded + sign * p[0], 0);
      r.overs = p[1];
      r.wkts = Math.max(r.wkts + sign * p[2], 0);
      return ok();
    }

    throw new Error("FakeScoringDb: unhandled SQL: " + s.slice(0, 120));
  }
}

module.exports = { FakeScoringDb };
