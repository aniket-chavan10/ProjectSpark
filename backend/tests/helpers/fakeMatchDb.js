// FakeScoringDb plus everything the match screens read: teams, players, playing XIs, the fixture,
// the scoreboard queries and the validators. With it the REAL controllers and services can run
// without MySQL (used by tests and by a local sandbox server).

const { FakeScoringDb } = require("./fakeScoringDb");

const norm = (sql) => sql.replace(/\s+/g, " ").trim();
const copy = (o) => (o ? { ...o } : o);
const BOWLER_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];

class FakeMatchDb extends FakeScoringDb {
  /**
   * @param teams  [{ id, name, players: [{ id, name }] }]  (two teams); every listed player is in the playing XI
   * @param fixture { id, match_no, stage, group_name, overs, venue, tournament_name }
   */
  constructor({ teams, fixture = {}, totalOvers = 5 } = {}) {
    super({ totalOvers, team1: teams[0].id, team2: teams[1].id });
    // no match exists until the toss creates it
    this.matches = {};
    this.innings = {};
    this.live = {};
    this.ids.match = 100;
    this.ids.inning = 10;

    this.teams = Object.fromEntries(teams.map((t) => [t.id, { id: t.id, team_name: t.name, logo: t.logo || null }]));
    this.players = {};
    this.squads = {};
    teams.forEach((t) => {
      this.squads[t.id] = t.players.map((p) => p.id);
      t.players.forEach((p) => (this.players[p.id] = { player_id: p.id, team_id: t.id, players_name: p.name, mobile_number: p.mobile || null, email: null, profile_picture: null, is_banned: p.banned ? 1 : 0, banned_until: null }));
    });
    this.fixture = {
      id: 7,
      match_id: null,
      match_no: 1,
      tournament_id: 1,
      stage: "group",
      round_number: 1,
      group_name: "A",
      team1_id: teams[0].id,
      team2_id: teams[1].id,
      match_date_str: "2026-11-06",
      start_time_str: "09:00",
      overs: totalOvers,
      duration_minutes: 60,
      venue: "Village Ground",
      winner_team_id: null,
      status: "scheduled",
      tournament_name: "Diwali Cup",
      ...fixture,
    };
    this.tm = [this.fixture];
    // the old playing-XI table is the whole player list unless a test says otherwise
    this.legacyXI = this.squads;
    this.nextPlayerId = 1000;
    this.tournaments = { 1: { id: 1, name: "Diwali Cup", start_date: "2026-11-06", end_date: "2026-11-08", status: "scheduled" } };
    this.participants = teams.map((t) => ({ tournament_id: 1, team_id: t.id, status: "registered" }));
  }

  get squad() {
    // the playing XI size of each team, as the engine asks for it
    return new Proxy({}, { get: (_, team) => (this.squads[team] ? this.squads[team].length : 0) });
  }
  set squad(_) {}

  // a pool-like connection with real transactions (rollback restores the data)
  async getConnection() {
    const self = this;
    let snapshot = null;
    return {
      execute: (sql, params) => self.execute(sql, params),
      query: (sql, params) => self.execute(sql, params),
      beginTransaction: async () => {
        snapshot = JSON.stringify({ matches: self.matches, innings: self.innings, live: self.live, overs: self.overs, balls: self.balls, perf: self.perf, stats: self.stats, tm: self.tm, matchSquads: self.matchSquads, tournamentSquads: self.tournamentSquads });
      },
      commit: async () => {
        snapshot = null;
      },
      rollback: async () => {
        if (!snapshot) return;
        Object.assign(self, JSON.parse(snapshot));
        snapshot = null;
      },
      release: () => {},
    };
  }

  async execute(sql, p = []) {
    const s = norm(sql);
    const rows = (r) => [r];
    const ok = () => [{ affectedRows: 1 }];

    /* ----------------------------- fixture details ----------------------------- */
    if (s.startsWith("SELECT tm.id, tm.match_id, tm.match_no")) {
      return rows(this.tm.filter((m) => m.id === Number(p[0])).map(copy));
    }
    if (s.startsWith("SELECT id, team_name, logo FROM teams WHERE id = ? LIMIT 1")) {
      return rows(this.teams[p[0]] ? [copy(this.teams[p[0]])] : []);
    }
    if (s.startsWith("SELECT p.player_id, p.players_name, p.profile_picture FROM teams_squad tp")) {
      return rows((this.squads[p[0]] || []).map((id) => ({ player_id: id, players_name: this.players[id].players_name, profile_picture: null })));
    }
    if (s.startsWith("SELECT p.player_id, p.team_id, p.players_name")) {
      return rows((this.squads[p[0]] || []).map((id) => copy(this.players[id])));
    }
    if (s.startsWith("SELECT player_id, team_id, players_name, mobile_number, email, profile_picture")) {
      return rows(p.map((id) => this.players[id]).filter(Boolean).map(copy));
    }

    /* ------------------------------- the scoreboard ------------------------------ */
    if (s.startsWith("SELECT match_id, tournament_id, match_no, team1_id, team2_id, date, venue")) {
      return rows(this.matches[p[0]] ? [copy(this.matches[p[0]])] : []);
    }
    if (s.startsWith("SELECT inning_id, team_id, total_runs, target_score, required_run_rate")) {
      return rows(
        Object.values(this.innings)
          .filter((i) => i.match_id === Number(p[0]))
          .sort((a, b) => a.innings_number - b.innings_number)
          .map((i) => ({ target_score: null, required_run_rate: null, ...copy(i) }))
      );
    }
    if (s.startsWith("SELECT l.scorecard_id, l.team_id")) {
      return rows(
        Object.values(this.live)
          .filter((l) => l.match_id === Number(p[0]))
          .map((l) => ({ ...copy(l), team_id: this.innings[l.inning_id].team_id, team_name: this.teams[this.innings[l.inning_id].team_id].team_name }))
      );
    }
    if (s.startsWith("SELECT player_id, runs_scored, balls_faced, fours, sixes, strike_rate")) {
      return rows(
        Object.entries(this.perf)
          .filter(([k]) => k.endsWith(`:${p[0]}`))
          .map(([k, v]) => ({
            player_id: Number(k.split(":")[0]),
            runs_scored: v.runs, balls_faced: v.balls, fours: v.fours, sixes: v.sixes,
            total_runs_conceded: v.conceded, wickets_taken: v.wkts, overs_bowled: v.overs, maiden_overs: v.maidens,
          }))
      );
    }
    if (s.startsWith("SELECT ball_id, inning_id, over_number, ball_number, batsman_id")) {
      const limit = Number(/LIMIT (\d+)/.exec(s)[1]);
      return rows(this.balls.filter((b) => b.inning_id === p[0]).sort((a, b) => b.over_number - a.over_number || b.ball_number - a.ball_number).slice(0, limit).map(copy));
    }
    if (s.startsWith("SELECT ball_id, over_number, ball_number, batsman_id, bowler_id, wicket_type")) {
      const mine = this.balls.filter((b) => b.inning_id === p[0]).sort((a, b) => a.ball_id - b.ball_id);
      return rows(
        mine
          .filter((b) => b.is_wicket === 1)
          .map((w) => ({
            ...copy(w),
            legal_balls_upto: mine.filter((b) => b.ball_id <= w.ball_id && b.legal_delivery === 1).length,
            score_at_fall: mine.filter((b) => b.ball_id <= w.ball_id).reduce((a, b) => a + b.runs_scored + b.extras, 0),
          }))
      );
    }
    if (s.startsWith("SELECT extra_type, COALESCE(SUM(extras), 0) AS total FROM balls")) {
      const out = {};
      this.balls.filter((b) => b.inning_id === p[0] && b.extra_type).forEach((b) => (out[b.extra_type] = (out[b.extra_type] || 0) + b.extras));
      return rows(Object.entries(out).map(([extra_type, total]) => ({ extra_type, total })));
    }
    if (s.startsWith("SELECT DISTINCT dismissed_player_id FROM balls WHERE inning_id = ? AND is_retired_hurt = 1")) {
      const ids = [...new Set(this.balls.filter((b) => b.inning_id === p[0] && b.is_retired_hurt === 1 && b.dismissed_player_id).map((b) => b.dismissed_player_id))];
      return rows(ids.map((id) => ({ dismissed_player_id: id })));
    }
    if (s === "SELECT * FROM balls WHERE inning_id = ? ORDER BY ball_id") {
      return rows(this.balls.filter((b) => b.inning_id === p[0]).sort((a, b) => a.ball_id - b.ball_id).map(copy));
    }

    /* ------------------------ validators (controller level) ------------------------ */
    if (s.startsWith("SELECT team1_id, team2_id FROM matches WHERE match_id = ?")) {
      return rows(this.matches[p[0]] ? [copy(this.matches[p[0]])] : []);
    }
    if (s.startsWith("SELECT team_id FROM innings WHERE match_id = ? AND inning_id = ?")) {
      const i = this.innings[p[1]];
      return rows(i && i.match_id === Number(p[0]) ? [{ team_id: i.team_id }] : []);
    }
    if (s.startsWith("SELECT player_id FROM players_core WHERE team_id = ? AND player_id IN (?, ?)")) {
      return rows([p[1], p[2]].filter((id) => this.players[id] && this.players[id].team_id === Number(p[0])).map((id) => ({ player_id: id })));
    }
    if (s.startsWith("SELECT player_id FROM players_core WHERE team_id = ? AND player_id = ?")) {
      return rows(this.players[p[1]] && this.players[p[1]].team_id === Number(p[0]) ? [{ player_id: p[1] }] : []);
    }
    if (s.startsWith("SELECT 1 FROM balls WHERE inning_id = ? AND dismissed_player_id = ? AND is_wicket = 1")) {
      return rows(this.balls.some((b) => b.inning_id === p[0] && b.dismissed_player_id === Number(p[1]) && b.is_wicket === 1) ? [{ 1: 1 }] : []);
    }
    if (s.startsWith("SELECT on_strike_batsman_id, non_striker_batsman_id FROM live_scorecards WHERE inning_id = ?")) {
      return rows(this.live[p[0]] ? [copy(this.live[p[0]])] : []);
    }
    if (s.startsWith("SELECT bowler_id FROM overs WHERE inning_id = ? ORDER BY over_number DESC LIMIT 1")) {
      const mine = this.overs.filter((o) => o.inning_id === p[0]).sort((a, b) => b.over_number - a.over_number);
      return rows(mine.length ? [{ bowler_id: mine[0].bowler_id }] : []);
    }
    if (s.startsWith("SELECT COUNT(*) AS balls FROM balls WHERE inning_id = ? AND bowler_id = ? AND legal_delivery = 1")) {
      return rows([{ balls: this.balls.filter((b) => b.inning_id === p[0] && b.bowler_id === Number(p[1]) && b.legal_delivery === 1).length }]);
    }


    /* ------------------------------ squads and players ------------------------------ */
    const mine = (teamId) => Object.values(this.players).filter((x) => x.team_id === Number(teamId));
    const byName = (a, b) => a.players_name.localeCompare(b.players_name);
    if (s.startsWith("SELECT player_id, players_name, profile_picture FROM players_core WHERE team_id = ?")) {
      return rows(mine(p[0]).map(copy));
    }
    if (s.startsWith("SELECT player_id, players_name, mobile_number, profile_picture, is_banned, banned_until FROM players_core WHERE team_id = ?")) {
      return rows(mine(p[0]).sort(byName).map(copy));
    }
    if (s.startsWith("SELECT player_id, players_name, mobile_number, email, profile_picture, is_banned, banned_until FROM players_core WHERE team_id = ?")) {
      return rows(mine(p[0]).sort(byName).map(copy));
    }
    if (s.startsWith("SELECT player_id, players_name, mobile_number, email, profile_picture, is_banned, banned_until FROM players_core WHERE player_id = ? AND team_id = ?")) {
      const x = this.players[p[0]];
      return rows(x && x.team_id === Number(p[1]) ? [copy(x)] : []);
    }
    if (s.startsWith("SELECT player_id FROM players_core WHERE team_id = ? AND mobile_number = ? AND player_id <> ?")) {
      return rows(mine(p[0]).filter((x) => x.mobile_number === p[1] && x.player_id !== Number(p[2])).map((x) => ({ player_id: x.player_id })));
    }
    if (s.startsWith("INSERT INTO players_core")) {
      const id = this.nextPlayerId++;
      this.players[id] = { player_id: id, team_id: Number(p[0]), players_name: p[1], mobile_number: p[2], email: p[3], profile_picture: p[4], is_banned: 0, banned_until: null };
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (s.startsWith("UPDATE players_core SET players_name = ?")) {
      Object.assign(this.players[p[4]], { players_name: p[0], mobile_number: p[1], email: p[2], profile_picture: p[3] });
      return ok();
    }
    if (s.startsWith("DELETE FROM players_core WHERE player_id = ? AND team_id = ?")) {
      delete this.players[p[0]];
      return ok();
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM balls WHERE batsman_id = ? OR bowler_id = ?")) {
      const id = Number(p[0]);
      return rows([{ n: this.balls.filter((b) => [b.batsman_id, b.bowler_id, b.dismissed_player_id, b.fielder_id].includes(id)).length }]);
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id WHERE ms.player_id = ?")) {
      const started = this.tm.filter((m) => m.match_id).map((m) => m.id);
      return rows([{ n: this.matchSquads.filter((r) => r.player_id === Number(p[0]) && started.includes(r.tournament_match_id)).length }]);
    }
    if (s.startsWith("DELETE FROM tournament_squads WHERE player_id = ? AND team_id = ?")) {
      this.tournamentSquads = this.tournamentSquads.filter((r) => !(r.player_id === Number(p[0]) && r.team_id === Number(p[1])));
      return ok();
    }
    if (s.startsWith("DELETE FROM match_squads WHERE player_id = ? AND team_id = ?")) {
      this.matchSquads = this.matchSquads.filter((r) => !(r.player_id === Number(p[0]) && r.team_id === Number(p[1])));
      return ok();
    }
    if (s.startsWith("SELECT id, name, start_date, end_date, status FROM tournaments WHERE id = ?")) {
      return rows(this.tournaments[p[0]] ? [copy(this.tournaments[p[0]])] : []);
    }
    if (s.startsWith("SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ?")) {
      return rows(this.participants.filter((x) => x.tournament_id === Number(p[0]) && x.team_id === Number(p[1]) && !["cancelled", "rejected"].includes(x.status)).map(() => ({ id: 1 })));
    }
    if (s.startsWith("SELECT tm.id, tm.tournament_id, tm.match_no, tm.stage, tm.group_name, tm.team1_id")) {
      return rows(this.tm.filter((m) => m.id === Number(p[0])).map(copy));
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM tournament_squads WHERE tournament_id = ? AND team_id = ? AND role = 'playing'")) {
      return rows([{ n: this.tournamentSquads.filter((r) => r.tournament_id === Number(p[0]) && r.team_id === Number(p[1]) && r.role === "playing").length }]);
    }
    if (s.startsWith("DELETE FROM tournament_squads WHERE tournament_id = ? AND team_id = ?")) {
      this.tournamentSquads = this.tournamentSquads.filter((r) => !(r.tournament_id === Number(p[0]) && r.team_id === Number(p[1])));
      return ok();
    }
    if (s.startsWith("INSERT INTO tournament_squads")) {
      const [tournament_id, team_id, player_id, role, batting_order, jersey_number, is_captain, is_keeper] = p;
      this.tournamentSquads.push({ tournament_id: Number(tournament_id), team_id: Number(team_id), player_id: Number(player_id), role, batting_order, jersey_number, is_captain, is_keeper });
      return ok();
    }
    if (s.startsWith("SELECT t.id, t.name, t.start_date, t.end_date, t.status,")) {
      const teamId = Number(p[0]);
      return rows(
        this.participants
          .filter((x) => x.team_id === teamId && !["cancelled", "rejected"].includes(x.status))
          .map((x) => ({ ...this.tournaments[x.tournament_id], xi: this.tournamentSquads.filter((r) => r.tournament_id === x.tournament_id && r.team_id === teamId && r.role === "playing").length }))
      );
    }
    if (s.startsWith("SELECT tm.id, tm.match_no, tm.stage, tm.group_name, tm.team1_id, tm.team2_id, tm.match_id, tm.status,")) {
      const teamId = Number(p[0]);
      const tournamentId = Number(p[1]);
      return rows(
        this.tm
          .filter((m) => m.tournament_id === tournamentId && (m.team1_id === teamId || m.team2_id === teamId))
          .map((m) => ({
            ...copy(m),
            team1_name: this.teams[m.team1_id] && this.teams[m.team1_id].team_name,
            team2_name: this.teams[m.team2_id] && this.teams[m.team2_id].team_name,
            match_xi: this.matchSquads.filter((r) => r.tournament_match_id === m.id && r.team_id === teamId && r.role === "playing").length,
          }))
      );
    }

    const result = await super.execute(sql, p);

    // the toss creates the live match: keep what the scoreboard shows about it
    if (s.startsWith("INSERT INTO matches")) {
      const id = result[0].insertId;
      Object.assign(this.matches[id], {
        tournament_id: p[0], match_no: p[1], venue: p[4], toss_winner_id: p[5], toss_decision: p[6],
        date: new Date().toISOString(), result: "live", is_super_over: 0,
      });
    }
    // the fixture row follows the match it became (the base class tracks tm by id)
    if (s.startsWith("UPDATE tournament_matches SET winner_team_id = ?, status = 'completed' WHERE match_id")) {
      this.tm.filter((m) => m.match_id === p[1]).forEach((m) => Object.assign(m, { winner_team_id: p[0], status: "completed" }));
    }
    return result;
  }
}

module.exports = { FakeMatchDb, BOWLER_WICKETS };
