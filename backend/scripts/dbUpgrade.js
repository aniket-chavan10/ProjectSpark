// npm run db:upgrade   - bring an EXISTING Spark database (an old one, or a restored dump) in line with
//                        database/schema.sql, without losing data.
//
//   npm run db:upgrade -- --dry-run         show what would change, change nothing
//   npm run db:upgrade -- --yes             do not ask
//   npm run db:upgrade -- --clean-orphans   also delete rows that point at something that no longer exists
//
// Safe to run again: every step checks first and says "already done". A step that fails is reported and the
// rest still run. Take a backup first (mysqldump -u <user> -p <database> > backup.sql).
//
// What it fixes (each one reproduced on the 31-Oct-2026 dump):
//   balls.over_id missing                       -> scoring fails: Unknown column 'over_id'
//   balls.extra_type enum 'no ball'/'leg bye'   -> a no-ball or leg-bye fails: Data truncated
//   balls_chk_4 wicket list                     -> "retired out" / "handled ball" fail: Check constraint violated
//   players_core.email NOT NULL                 -> adding a player without an email fails
//   tournaments.updated_at missing              -> editing a tournament fails: Unknown column
//   innings.run_rate generated column            -> EVERY ball fails: value specified for generated column 'run_rate'
//   innings_chk_5 (1,2 only)                    -> a super-over innings fails
//   missing foreign keys, duplicate keys, the misspelled view, leftover rows of deleted matches

const { parseArgs, confirm } = require("./_common");
const { connect, settings, quoteId: Q, schemaSql } = require("./_db");

const args = parseArgs(process.argv.slice(2));
const DRY = !!args["dry-run"];

let conn;
const q = async (sql, params) => (await conn.query(sql, params))[0];
const one = async (sql, params) => (await q(sql, params))[0];
const db = () => settings().database;

const tableType = async (t) => {
  const r = await one("SELECT TABLE_TYPE AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", [db(), t]);
  return r ? r.t : null;
};
const hasTable = async (t) => (await tableType(t)) === "BASE TABLE";
const colInfo = (t, c) =>
  one("SELECT COLUMN_TYPE, IS_NULLABLE, GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?", [db(), t, c]);
const hasConstraint = async (t, name) =>
  !!(await one("SELECT 1 AS x FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?", [db(), t, name]));
const hasIndex = async (t, name) =>
  !!(await one("SELECT 1 AS x FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1", [db(), t, name]));
const checkClause = async (name) => {
  const r = await one("SELECT CHECK_CLAUSE AS c FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME = ?", [db(), name]);
  return r ? String(r.c) : null;
};

let changed = 0;
/** Run a change, or only print it on a dry run. */
async function exec(sql, params) {
  if (DRY) {
    console.log(`      [dry run] ${sql.replace(/\s+/g, " ").slice(0, 150)}`);
    return { affectedRows: 0 };
  }
  const [res] = await conn.query(sql, params);
  changed += 1;
  return res;
}

const ALREADY = "already done";

/** Row count of every table, to show what a clean-up (and the cascades under it) really removed. */
async function rowCounts() {
  const tables = await q("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [db()]);
  const out = {};
  for (const { t } of tables) out[t] = Number((await one(`SELECT COUNT(*) AS n FROM ${Q(t)}`)).n);
  return out;
}

/* --------------------------------------------------------------------------------------------- */
/* The steps                                                                                       */
/* --------------------------------------------------------------------------------------------- */

const steps = [
  {
    title: "Tables added to the schema since your database was made",
    async run() {
      // every "CREATE TABLE IF NOT EXISTS x (...) ENGINE=...;" of schema.sql whose table is not there yet
      const made = [];
      for (const m of schemaSql().matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?\s*\([\s\S]*?\n\) ENGINE=[^;]*;/gi)) {
        if (await hasTable(m[1])) continue;
        await exec(m[0]);
        made.push(m[1]);
      }
      return made.length ? `${DRY ? "would create" : "created"}: ${made.join(", ")}` : ALREADY;
    },
  },
  {
    title: "balls.over_id (the scorer finds the balls of an over by it)",
    async run() {
      if (!(await hasTable("balls"))) return "no balls table";
      const msgs = [];
      if (!(await colInfo("balls", "over_id"))) {
        await exec("ALTER TABLE balls ADD COLUMN over_id INT NULL AFTER inning_id");
        msgs.push("column added");
      }
      if (!DRY && (await hasTable("overs"))) {
        const r = await exec("UPDATE balls b JOIN overs o ON o.inning_id = b.inning_id AND o.over_number = b.over_number SET b.over_id = o.over_id WHERE b.over_id IS NULL");
        if (r.affectedRows) msgs.push(`${r.affectedRows} old balls linked to their over`);
      }
      if (!(await hasIndex("balls", "ix_balls_over"))) {
        await exec("ALTER TABLE balls ADD INDEX ix_balls_over (over_id)");
        msgs.push("index added");
      }
      return msgs.join(", ") || ALREADY;
    },
  },
  {
    title: "balls.extra_type: 'no-ball' and 'leg-bye' as the code writes them",
    async run() {
      const c = await colInfo("balls", "extra_type");
      if (!c) return "no such column";
      const msgs = [];
      if (/^enum/i.test(c.COLUMN_TYPE)) {
        await exec("ALTER TABLE balls MODIFY COLUMN extra_type VARCHAR(10) NULL");
        msgs.push("enum replaced by text");
      }
      if (!DRY) {
        const a = await exec("UPDATE balls SET extra_type = 'no-ball' WHERE extra_type = 'no ball'");
        const b = await exec("UPDATE balls SET extra_type = 'leg-bye' WHERE extra_type = 'leg bye'");
        if (a.affectedRows + b.affectedRows) msgs.push(`${a.affectedRows + b.affectedRows} old rows renamed`);
      }
      if (!(await hasConstraint("balls", "balls_chk_7"))) {
        await exec("ALTER TABLE balls ADD CONSTRAINT balls_chk_7 CHECK (extra_type IS NULL OR extra_type IN ('wide','no-ball','bye','leg-bye'))");
        msgs.push("check added");
      }
      return msgs.join(", ") || ALREADY;
    },
  },
  {
    title: "balls.ball_outcome may be 'retired' (a batter retiring is stored with it; without it every retirement fails)",
    async run() {
      const c = await colInfo("balls", "ball_outcome");
      if (!c) return "no such column";
      if (/'retired'/.test(c.COLUMN_TYPE)) return ALREADY;
      await exec("ALTER TABLE balls MODIFY COLUMN ball_outcome ENUM('dot','run','four','six','wicket','extra','retired') NULL");
      return "value added";
    },
  },
  {
    title: "balls.nb_runs_type (byes and leg-byes run off a no-ball)",
    async run() {
      const msgs = [];
      if (!(await colInfo("balls", "nb_runs_type"))) {
        await exec("ALTER TABLE balls ADD COLUMN nb_runs_type VARCHAR(8) NULL");
        msgs.push("column added");
      }
      if (!(await hasConstraint("balls", "balls_chk_8"))) {
        await exec("ALTER TABLE balls ADD CONSTRAINT balls_chk_8 CHECK (nb_runs_type IS NULL OR (extra_type = 'no-ball' AND nb_runs_type IN ('bye','leg-bye')))");
        msgs.push("check added");
      }
      return msgs.join(", ") || ALREADY;
    },
  },
  {
    title: "balls.wicket_type check: every dismissal the scorer can record",
    async run() {
      const clause = await checkClause("balls_chk_4");
      if (clause && clause.includes("retired out") && clause.includes("hit the ball twice")) return ALREADY;
      if (clause) await exec("ALTER TABLE balls DROP CONSTRAINT balls_chk_4");
      if (!DRY) await exec("UPDATE balls SET wicket_type = 'handled ball' WHERE wicket_type = 'handled the ball'");
      await exec(
        "ALTER TABLE balls ADD CONSTRAINT balls_chk_4 CHECK (wicket_type IS NULL OR wicket_type IN ('bowled','caught','lbw','stumped','run out','hit wicket','handled ball','timed out','obstructing the field','hit the ball twice','retired out','retired hurt'))"
      );
      return "check replaced";
    },
  },
  {
    title: "players_core.email may be empty (many village players have none)",
    async run() {
      const c = await colInfo("players_core", "email");
      if (!c) return "no such column";
      if (c.IS_NULLABLE === "NO") {
        await exec("ALTER TABLE players_core MODIFY COLUMN email VARCHAR(255) NULL");
        if (!DRY) await exec("UPDATE players_core SET email = NULL WHERE email = ''");
        return "column now allows empty";
      }
      return ALREADY;
    },
  },
  {
    title: "tournaments.updated_at (editing a tournament writes it)",
    async run() {
      if (await colInfo("tournaments", "updated_at")) return ALREADY;
      await exec("ALTER TABLE tournaments ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
      return "column added";
    },
  },
  {
    title: "innings.innings_number allows 1 to 4 (room for super-over innings)",
    async run() {
      const clause = await checkClause("innings_chk_5");
      if (!clause) {
        await exec("ALTER TABLE innings ADD CONSTRAINT innings_chk_5 CHECK (innings_number BETWEEN 1 AND 4)");
        return "check added";
      }
      if (/\b4\b/.test(clause)) return ALREADY;
      await exec("ALTER TABLE innings DROP CONSTRAINT innings_chk_5");
      await exec("ALTER TABLE innings ADD CONSTRAINT innings_chk_5 CHECK (innings_number BETWEEN 1 AND 4)");
      return "check widened";
    },
  },
  {
    title: "innings.run_rate is a normal column (the scorer writes it; it was a generated column that refuses every write)",
    async run() {
      const c = await one("SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'innings' AND COLUMN_NAME = 'run_rate'", [db()]);
      if (!c) return "no such column";
      if (!/GENERATED/i.test(c.EXTRA)) return ALREADY;
      await exec("ALTER TABLE innings MODIFY COLUMN run_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00");
      return "now a normal column (values kept)";
    },
  },
  {
    title: "player_performance.economy_rate divides the runs conceded (it used the runs scored)",
    async run() {
      const c = await colInfo("player_performance", "economy_rate");
      if (!c) return "no such column";
      if (!/runs_scored/.test(String(c.GENERATION_EXPRESSION))) return ALREADY;
      await exec("ALTER TABLE player_performance DROP COLUMN economy_rate");
      await exec("ALTER TABLE player_performance ADD COLUMN economy_rate DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN overs_bowled > 0 THEN total_runs_conceded / overs_bowled ELSE 0 END) STORED AFTER maiden_overs");
      return "column rebuilt";
    },
  },
  {
    title: "duplicate keys",
    async run() {
      const msgs = [];
      if ((await hasConstraint("tournaments", "fk_tournament_tentative")) && (await hasConstraint("tournaments", "fk_tournaments_tentative"))) {
        await exec("ALTER TABLE tournaments DROP FOREIGN KEY fk_tournament_tentative");
        msgs.push("tournaments: duplicate foreign key dropped");
      }
      if ((await hasIndex("tournament_participants", "tournament_id")) && (await hasIndex("tournament_participants", "uq_team_tournament"))) {
        await exec("ALTER TABLE tournament_participants DROP INDEX tournament_id");
        msgs.push("tournament_participants: duplicate unique key dropped");
      }
      return msgs.join(", ") || ALREADY;
    },
  },
  {
    title: "the misspelled view tentative_tournmanetschedules (the code now uses the real table)",
    async run() {
      const t = await tableType("tentative_tournmanetschedules");
      if (!t) return ALREADY;
      if (t !== "VIEW") return "it is a real table here - left alone";
      await exec("DROP VIEW tentative_tournmanetschedules");
      return "view dropped";
    },
  },
];

/* --------------------------------------------------------------------------------------------- */
/* Foreign keys: rows that point at nothing, then the keys that were never created                 */
/* --------------------------------------------------------------------------------------------- */

// [name, child table, child column, parent table, parent column, on delete]
const PLANNED = [
  ["fk_innings_match", "innings", "match_id", "matches", "match_id", "CASCADE"],
  ["fk_balls_over", "balls", "over_id", "overs", "over_id", "CASCADE"],
  ["fk_scorecard_match", "live_scorecards", "match_id", "matches", "match_id", "CASCADE"],
  ["fk_overlay_match", "match_overlay", "match_id", "matches", "match_id", "CASCADE"],
  ["fk_tiebreak_match", "match_tiebreaks", "match_id", "matches", "match_id", "CASCADE"],
  ["fk_tiebreak_winner", "match_tiebreaks", "winner_team_id", "teams", "id", "RESTRICT"],
  ["fk_matches_potm", "matches", "player_of_match_id", "players_core", "player_id", "SET NULL"],
  ["fk_participants_team", "tournament_participants", "team_id", "teams", "id", "CASCADE"],
  ["fk_tsquad_tournament", "tournament_squads", "tournament_id", "tournaments", "id", "CASCADE"],
  ["fk_tsquad_team", "tournament_squads", "team_id", "teams", "id", "CASCADE"],
  ["fk_tsquad_player", "tournament_squads", "player_id", "players_core", "player_id", "CASCADE"],
  ["fk_msquad_fixture", "match_squads", "tournament_match_id", "tournament_matches", "id", "CASCADE"],
  ["fk_msquad_team", "match_squads", "team_id", "teams", "id", "CASCADE"],
  ["fk_msquad_player", "match_squads", "player_id", "players_core", "player_id", "CASCADE"],
  ["fk_pms_match", "player_match_stats", "match_id", "matches", "match_id", "CASCADE"],
  ["fk_pms_player", "player_match_stats", "player_id", "players_core", "player_id", "CASCADE"],
  ["fk_pms_team", "player_match_stats", "team_id", "teams", "id", "CASCADE"],
  ["fk_pms_tournament", "player_match_stats", "tournament_id", "tournaments", "id", "CASCADE"],
  ["fk_tpoints_tournament", "team_points", "tournament_id", "tournaments", "id", "CASCADE"],
  ["fk_tpoints_team", "team_points", "team_id", "teams", "id", "CASCADE"],
  ["fk_tresults_tournament", "tournament_results", "tournament_id", "tournaments", "id", "CASCADE"],
  ["fk_tresults_team", "tournament_results", "team_id", "teams", "id", "CASCADE"],
  ["fk_tnotif_team", "team_notifications", "team_id", "teams", "id", "CASCADE"],
  ["fk_perf_player", "player_performance", "player_id", "players_core", "player_id", "CASCADE"],
  ["fk_tm_match", "tournament_matches", "match_id", "matches", "match_id", "SET NULL"],
];

// rows of c whose reference finds no parent (LEFT JOIN form: it also works when a table points at itself)
const orphanJoin = (f) => `${Q(f.child)} c LEFT JOIN ${Q(f.parent)} p ON p.${Q(f.pcol)} = c.${Q(f.col)}`;
const orphanWhere = (f) => `c.${Q(f.col)} IS NOT NULL AND p.${Q(f.pcol)} IS NULL`;

async function existingForeignKeys() {
  const rows = await q(
    `SELECT k.CONSTRAINT_NAME AS name, k.TABLE_NAME AS child, k.COLUMN_NAME AS col, k.REFERENCED_TABLE_NAME AS parent, k.REFERENCED_COLUMN_NAME AS pcol, r.DELETE_RULE AS rule
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    [db()]
  );
  return rows.map((r) => ({ name: r.name, child: r.child, col: r.col, parent: r.parent, pcol: r.pcol, rule: r.rule, exists: true }));
}

async function allForeignKeys() {
  const existing = await existingForeignKeys();
  const have = new Set(existing.map((f) => `${f.child}.${f.col}>${f.parent}.${f.pcol}`));
  const planned = [];
  for (const [name, child, col, parent, pcol, rule] of PLANNED) {
    if (have.has(`${child}.${col}>${parent}.${pcol}`)) continue;
    if (!(await hasTable(child)) || !(await hasTable(parent))) continue;
    if (!(await colInfo(child, col))) continue; // a column a step above had to add (dry run)
    planned.push({ name, child, col, parent, pcol, rule, exists: false });
  }
  return [...existing, ...planned];
}

async function countOrphans(f) {
  const r = await one(`SELECT COUNT(*) AS n FROM ${orphanJoin(f)} WHERE ${orphanWhere(f)}`);
  return Number(r.n);
}

async function cleanOrphans(fks) {
  let rounds = 0;
  let total = 0;
  // deleting a child can orphan its own children, so go round until nothing is left
  for (; rounds < 8; rounds += 1) {
    let any = 0;
    for (const f of fks) {
      const n = await countOrphans(f);
      if (!n) continue;
      any += n;
      // an optional reference is cleared (the row itself is still a real record); a required one cannot be, so the row goes
      const optional = f.rule === "SET NULL" || (await colInfo(f.child, f.col)).IS_NULLABLE === "YES";
      if (optional) {
        const res = await exec(`UPDATE ${orphanJoin(f)} SET c.${Q(f.col)} = NULL WHERE ${orphanWhere(f)}`);
        console.log(`      ${f.child}.${f.col}: ${n} reference${n === 1 ? "" : "s"} to missing ${f.parent} cleared${DRY ? "" : ` (${res.affectedRows})`}`);
      } else {
        const res = await exec(`DELETE c FROM ${orphanJoin(f)} WHERE ${orphanWhere(f)}`);
        console.log(`      ${f.child}: ${n} row${n === 1 ? "" : "s"} of a missing ${f.parent} deleted${DRY ? "" : ` (${res.affectedRows})`}`);
      }
      total += n;
    }
    if (!any || DRY) break;
  }
  return total;
}

/* --------------------------------------------------------------------------------------------- */

(async () => {
  const s = settings();
  console.log(`Target: database "${s.database}" on ${s.host}:${s.port} as ${s.user}${DRY ? "   (DRY RUN - nothing will change)" : ""}\n`);
  conn = await connect({ multi: false });

  if (!DRY && !(await confirm("Have you taken a backup, and do you want to upgrade this database now?", args.yes))) {
    console.log("Cancelled.");
    await conn.end();
    return;
  }

  let failed = 0;
  let n = 0;
  for (const step of steps) {
    n += 1;
    process.stdout.write(`${String(n).padStart(2)}. ${step.title}\n`);
    try {
      const outcome = await step.run();
      console.log(`      -> ${outcome}`);
    } catch (err) {
      failed += 1;
      console.log(`      -> FAILED: ${err.message}`);
    }
  }

  /* ---- foreign keys ---- */
  n += 1;
  console.log(`${String(n).padStart(2)}. Rows that point at something that no longer exists`);
  let fks = await allForeignKeys();
  const dirty = [];
  for (const f of fks) {
    const count = await countOrphans(f);
    if (count) dirty.push({ ...f, count });
  }
  if (!dirty.length) console.log("      -> none");
  else {
    for (const f of dirty) console.log(`      ${f.child}.${f.col} -> ${f.parent}: ${f.count} orphan row${f.count === 1 ? "" : "s"}`);
    console.log("      (left over from matches, innings or players that were deleted while checks were off)");
    console.log("      Removing an orphan also removes rows that hang off it (for example the balls of an innings whose match is gone).");
    const yes = args["clean-orphans"] || (!DRY && (await confirm("      Delete / clear these rows now?", args.yes && args["clean-orphans"])));
    if (yes) {
      try {
        const before = DRY ? null : await rowCounts();
        const total = await cleanOrphans(fks);
        console.log(`      -> ${total} orphan row${total === 1 ? "" : "s"} cleaned`);
        if (before) {
          const after = await rowCounts();
          const gone = Object.keys(before).filter((t) => after[t] !== before[t]);
          if (gone.length) {
            console.log("      Rows removed in all (table: before -> after):");
            gone.forEach((t) => console.log(`        ${t}: ${before[t]} -> ${after[t]}`));
          }
        }
      } catch (err) {
        failed += 1;
        console.log(`      -> FAILED: ${err.message}`);
      }
    } else {
      console.log("      -> left as they are; foreign keys over them will be skipped. Re-run with --clean-orphans to remove them.");
    }
  }

  n += 1;
  console.log(`${String(n).padStart(2)}. Missing foreign keys`);
  fks = await allForeignKeys();
  const missing = fks.filter((f) => !f.exists);
  if (!missing.length) console.log("      -> all present");
  for (const f of missing) {
    try {
      const orphans = await countOrphans(f);
      if (orphans && !(DRY && args["clean-orphans"])) {
        console.log(`      ${f.name}: ${DRY ? "would be skipped" : "skipped"}, ${orphans} orphan row${orphans === 1 ? "" : "s"} in ${f.child}.${f.col}`);
        continue;
      }
      await exec(`ALTER TABLE ${Q(f.child)} ADD CONSTRAINT ${Q(f.name)} FOREIGN KEY (${Q(f.col)}) REFERENCES ${Q(f.parent)} (${Q(f.pcol)}) ON DELETE ${f.rule}`);
      console.log(`      ${f.name}: added (${f.child}.${f.col} -> ${f.parent})`);
    } catch (err) {
      failed += 1;
      console.log(`      ${f.name}: FAILED: ${err.message}`);
    }
  }

  console.log(`\n${DRY ? "Dry run finished." : `Finished. ${changed} change${changed === 1 ? "" : "s"} made.`}${failed ? ` ${failed} step${failed === 1 ? "" : "s"} FAILED (see above).` : ""}`);
  console.log("Next:  npm run db:check");
  await conn.end();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
