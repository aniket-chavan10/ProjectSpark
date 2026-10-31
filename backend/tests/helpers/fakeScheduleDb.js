// In-memory stand-in for the pool used by services/tournamentScheduleService.js.
// It answers exactly the statements that service runs and mimics mysql2 (DATE / DATETIME come back as Date objects,
// a transaction can be rolled back).

const norm = (sql) => sql.replace(/\s+/g, " ").trim();
const copy = (o) => ({ ...o });

const dateFrom = (str) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const dateTimeFrom = (str) => {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(str);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
};

class FakeScheduleDb {
  constructor({ organizerAdminId = 1, start = "2026-11-06", end = "2026-11-08", teamsPerGroup = 8, groupNames = ["A", "B", "C", "D"] } = {}) {
    this.tournament = {
      id: 1,
      name: "Diwali Cup",
      venue: "Village Ground",
      start_date: dateFrom(start),
      end_date: dateFrom(end),
      status: "open",
      organizer_admin_id: organizerAdminId,
    };
    // participants: team ids 1..n, named "Team n"
    this.participants = [];
    groupNames.forEach((g, gi) => {
      for (let i = 0; i < teamsPerGroup; i++) {
        const id = gi * teamsPerGroup + i + 1;
        this.participants.push({ team_id: id, group_name: g, status: "approved", name: `Team ${id}`, logo: null });
      }
    });
    this.matches = [];
    this.progress = null;
    this.nextId = 500;
    this.snapshot = null;
  }

  async getConnection() {
    const self = this;
    return {
      query: (sql, params) => self.query(sql, params),
      beginTransaction: async () => {
        self.snapshot = JSON.stringify({ matches: self.matches, progress: self.progress });
      },
      commit: async () => {
        self.snapshot = null;
      },
      rollback: async () => {
        if (self.snapshot) {
          const s = JSON.parse(self.snapshot);
          self.matches = s.matches;
          self.progress = s.progress;
        }
      },
      release: () => {},
    };
  }

  /** What the DB hands back for a stored row. */
  asRow(m) {
    return {
      ...copy(m),
      match_date: m.match_date ? dateFrom(m.match_date) : null,
      match_time: m.match_time ? dateTimeFrom(m.match_time) : null,
    };
  }

  async query(sql, p = []) {
    const s = norm(sql);

    if (s.startsWith("SELECT id, name, venue, start_date, end_date, status, organizer_admin_id FROM tournaments WHERE id = ?")) {
      return [Number(p[0]) === this.tournament.id ? [copy(this.tournament)] : []];
    }
    if (s.startsWith("SELECT id FROM tournaments WHERE id = ? FOR UPDATE")) return [[{ id: this.tournament.id }]];

    if (s.startsWith("SELECT id, match_id, match_no, stage, round_number, group_name")) {
      return [this.matches.filter((m) => m.tournament_id === Number(p[0])).sort((a, b) => a.match_no - b.match_no).map((m) => this.asRow(m))];
    }
    if (s.startsWith("SELECT tp.team_id AS id, tp.group_name, tm.team_name AS name, tm.logo")) {
      return [
        this.participants
          .filter((x) => x.group_name && !["cancelled", "rejected"].includes(x.status))
          .sort((a, b) => a.group_name.localeCompare(b.group_name) || a.name.localeCompare(b.name))
          .map((x) => ({ id: x.team_id, group_name: x.group_name, name: x.name, logo: x.logo })),
      ];
    }
    if (s.startsWith("DELETE FROM tournament_matches WHERE tournament_id = ?")) {
      this.matches = this.matches.filter((m) => m.tournament_id !== Number(p[0]));
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith("INSERT INTO tournament_matches")) {
      const [match_no, tournament_id, stage, round_number, group_name, team1_id, team2_id, match_date, match_time, venue, overs, duration_minutes, d1, t1, d2, t2] = p;
      const row = {
        id: ++this.nextId, match_id: null, match_no, tournament_id, stage, round_number, group_name, team1_id, team2_id,
        match_date, match_time, venue, overs, duration_minutes, dependent_match1_id: d1, dependent_match1_type: t1,
        dependent_match2_id: d2, dependent_match2_type: t2, status: "scheduled", winner_team_id: null,
      };
      this.matches.push(row);
      return [{ insertId: row.id, affectedRows: 1 }];
    }
    if (s.startsWith("UPDATE tournament_progress SET groups_created = 1")) {
      if (!this.progress) return [{ affectedRows: 0 }];
      this.progress.groups_created = 1;
      this.progress.schedule_created = 1;
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith("INSERT INTO tournament_progress")) {
      this.progress = { teams_created: 1, groups_created: 1, schedule_created: 1, matches_started: 0 };
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith("SELECT match_no, stage, status, team1_id, team2_id, winner_team_id FROM tournament_matches")) {
      return [this.matches.filter((m) => m.tournament_id === Number(p[0])).sort((a, b) => a.match_no - b.match_no).map(copy)];
    }
    if (s.startsWith("SELECT id, team_name, logo FROM teams WHERE id IN")) {
      const ids = [].concat(p[0]);
      return [this.participants.filter((x) => ids.includes(x.team_id)).map((x) => ({ id: x.team_id, team_name: x.name, logo: null }))];
    }
    throw new Error("FakeScheduleDb: unhandled SQL: " + s.slice(0, 120));
  }
}

module.exports = { FakeScheduleDb };
