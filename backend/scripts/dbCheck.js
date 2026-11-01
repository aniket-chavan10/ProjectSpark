// npm run db:check   - compare the database in backend/.env with database/schema.sql and say exactly what is wrong.
//
// It builds a throw-away copy of schema.sql (a temporary database next to yours, dropped at the end - the
// MySQL user needs CREATE DATABASE rights) and compares tables, columns, keys, checks and rows that point at
// nothing. Nothing in your database is changed. Exit code 0 = fine, 1 = something to fix.

const path = require("path");
const { connect, settings, schemaSql, quoteId: Q } = require("./_db");
const { auditCode } = require("./_codeAudit");

const REF = `spark_schema_ref_${Date.now()}`;

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/_utf8mb4/g, "").replace(/[()`]/g, "").trim().toLowerCase();

async function snapshot(conn, schema) {
  const [tables] = await conn.query("SELECT TABLE_NAME AS t, TABLE_TYPE AS ty FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [schema]);
  const [cols] = await conn.query(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ty, IS_NULLABLE AS nul, EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?",
    [schema]
  );
  const [fks] = await conn.query(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c, REFERENCED_TABLE_NAME AS pt, REFERENCED_COLUMN_NAME AS pc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL",
    [schema]
  );
  const [checks] = await conn.query(
    "SELECT tc.TABLE_NAME AS t, cc.CONSTRAINT_NAME AS name, cc.CHECK_CLAUSE AS clause FROM information_schema.CHECK_CONSTRAINTS cc JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME WHERE cc.CONSTRAINT_SCHEMA = ?",
    [schema]
  );
  const [uniques] = await conn.query(
    "SELECT TABLE_NAME AS t, INDEX_NAME AS name, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND NON_UNIQUE = 0 GROUP BY TABLE_NAME, INDEX_NAME",
    [schema]
  );
  return {
    tables: new Map(tables.map((r) => [r.t, r.ty])),
    cols: new Map(cols.map((r) => [`${r.t}.${r.c}`, { type: r.ty, nullable: r.nul === "YES", generated: /GENERATED/i.test(r.extra) }])),
    fks: new Map(fks.map((r) => [`${r.t}.${r.c}>${r.pt}.${r.pc}`, r])),
    checks: new Map(checks.map((r) => [`${r.t}.${r.name}`, norm(r.clause)])),
    uniques: new Map(uniques.map((r) => [`${r.t}(${r.cols})`, r.name])),
  };
}

(async () => {
  const s = settings();
  console.log(`Checking database "${s.database}" on ${s.host}:${s.port} against database/schema.sql\n`);

  const admin = await connect({ database: null });
  let ref;
  try {
    await admin.query(`CREATE DATABASE ${Q(REF)} CHARACTER SET utf8mb4`);
  } catch (err) {
    console.error(`Could not create the temporary comparison database: ${err.message}`);
    console.error("Give the MySQL user CREATE rights, or run this check as root.");
    await admin.end();
    process.exit(1);
  }

  const problems = [];
  const notes = [];
  try {
    ref = await connect({ database: REF, multi: true });
    await ref.query(schemaSql());
    const want = await snapshot(ref, REF);
    const live = await connect();
    const have = await snapshot(live, s.database);

    // tables
    for (const t of want.tables.keys()) if (!have.tables.has(t)) problems.push(`Table missing: ${t}`);

    // columns
    for (const [key, w] of want.cols) {
      const [t] = key.split(".");
      if (!have.tables.has(t)) continue;
      const h = have.cols.get(key);
      if (!h) problems.push(`Column missing: ${key} (${w.type}${w.nullable ? "" : " NOT NULL"})`);
      else if (h.type.replace(/\s+/g, "") !== w.type.replace(/\s+/g, "")) problems.push(`Column type differs: ${key} is ${h.type}, the code expects ${w.type}`);
      else if (h.generated !== w.generated) problems.push(`Column ${key} is ${h.generated ? "calculated by the database (it refuses every write the code makes)" : "a normal column"} here, the code expects ${w.generated ? "a calculated column" : "a normal column"}`);
      else if (h.nullable !== w.nullable) problems.push(`Column ${key} is ${h.nullable ? "optional" : "required"} here, the code expects it to be ${w.nullable ? "optional" : "required"}`);
    }

    // foreign keys
    for (const [key] of want.fks) {
      const [t] = key.split(".");
      if (have.tables.has(t) && !have.fks.has(key)) problems.push(`Foreign key missing: ${key.replace(">", " -> ")}`);
    }

    // check constraints
    for (const [key, clause] of want.checks) {
      const [t] = key.split(".");
      if (!have.tables.has(t)) continue;
      if (!have.checks.has(key)) problems.push(`Check constraint missing: ${key}`);
      else if (have.checks.get(key) !== clause) problems.push(`Check constraint ${key} differs from what the code needs (run npm run db:upgrade)`);
    }

    // unique keys the code relies on (ON DUPLICATE KEY UPDATE, INSERT IGNORE)
    for (const [key] of want.uniques) {
      const [t] = key.split("(");
      if (have.tables.has(t) && !have.uniques.has(key)) problems.push(`Unique key missing: ${key}`);
    }

    // rows that point at nothing
    for (const [key, f] of want.fks) {
      const [t, c] = key.split(">")[0].split(".");
      if (!have.tables.has(t) || !have.tables.has(f.pt) || !have.cols.has(`${t}.${c}`) || !have.cols.has(`${f.pt}.${f.pc}`)) continue;
      const [[r]] = await live.query(
        `SELECT COUNT(*) AS n FROM ${Q(t)} x WHERE x.${Q(c)} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${Q(f.pt)} p WHERE p.${Q(f.pc)} = x.${Q(c)})`
      );
      if (Number(r.n)) problems.push(`${r.n} row${Number(r.n) === 1 ? "" : "s"} in ${t}.${c} point at a missing ${f.pt}`);
    }

    // the SQL written in the code against the schema (what the code asks for must exist)
    const byTable = new Map();
    for (const key of want.cols.keys()) {
      const [t, c] = key.split(".");
      if (!byTable.has(t)) byTable.set(t, new Set());
      byTable.get(t).add(c);
    }
    for (const [what, files] of auditCode(byTable, path.join(__dirname, ".."))) problems.push(`The code uses ${what} which is not in the schema (${[...files].join(", ")})`);

    // tables the app does not use
    const extra = [...have.tables].filter(([t]) => !want.tables.has(t)).map(([t, ty]) => (ty === "VIEW" ? `${t} (view)` : t));
    if (extra.length) notes.push(`Not used by the app (kept, harmless): ${extra.join(", ")}`);

    await live.end();
  } finally {
    if (ref) await ref.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS ${Q(REF)}`).catch(() => {});
    await admin.end().catch(() => {});
  }

  if (!problems.length) {
    console.log("OK - the database matches the schema the code needs.");
  } else {
    console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"} found:\n`);
    problems.forEach((p, i) => console.log(`${String(i + 1).padStart(3)}. ${p}`));
    console.log("\nTo fix:  npm run db:upgrade   (it shows what it will do and asks first; use -- --dry-run to only look)");
  }
  notes.forEach((n) => console.log(`\n${n}`));
  process.exit(problems.length ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
