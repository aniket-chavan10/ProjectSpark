// npm run db:fresh   - throw the whole database away and build a new, empty one from database/schema.sql,
//                      with a first association (master admin) login so you can sign in.
//
//   npm run db:fresh
//   npm run db:fresh -- --master-user boss --master-email me@example.com --master-password Strong123
//   npm run db:fresh -- --yes            do not ask (for scripts)
//   npm run db:fresh -- --no-master      do not create the association login
//   npm run db:fresh -- --no-check       skip the final comparison with the code (db:check)
//
// WHAT IT DOES to the database named in backend/.env:   DROP DATABASE  ->  CREATE DATABASE  ->  database/schema.sql
// Every row is lost (teams, players, matches, balls, logins). There is no undo and no backup is taken.
// Stop the backend server first and start it again afterwards (its open connections point at the old database).
//
// To bring an existing database up to date WITHOUT losing its data use `npm run db:upgrade` instead.

const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const bcrypt = require("bcryptjs");
const { parseArgs } = require("./_common");
const { connect, schemaSql, schemaTables, settings, quoteId: Q } = require("./_db");

const SYSTEM_DATABASES = new Set(["mysql", "sys", "information_schema", "performance_schema"]);

const randomPassword = () => crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "x").slice(0, 10);

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let answered = false;
    rl.on("close", () => { if (!answered) resolve(""); }); // no keyboard (stdin closed): treat as "cancel"
    rl.question(question, (answer) => { answered = true; rl.close(); resolve(answer.trim()); });
  });
}

/** What is in the database that is about to be destroyed (so a wrong .env is noticed). Never throws. */
async function describeExisting(server, name) {
  const info = { tables: 0, counts: [] };
  try {
    const [tables] = await server.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [name]);
    const have = new Set(tables.map((r) => r.t));
    info.tables = have.size;
    for (const [label, table] of [["teams", "teams"], ["players", "players_core"], ["tournaments", "tournaments"], ["matches", "matches"], ["balls", "balls"]]) {
      if (!have.has(table)) continue;
      const [[r]] = await server.query(`SELECT COUNT(*) AS n FROM ${Q(name)}.${Q(table)}`);
      info.counts.push(`${Number(r.n)} ${label}`);
    }
  } catch (err) {
    info.error = err.message;
  }
  return info;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const s = settings();

  if (SYSTEM_DATABASES.has(s.database.toLowerCase())) {
    console.error(`"${s.database}" is a MySQL system database. Refusing to touch it - check DB_NAME in backend/.env.`);
    process.exit(1);
  }

  console.log(`Target: database "${s.database}" on ${s.host}:${s.port} as ${s.user}\n`);

  let server;
  try {
    server = await connect({ database: null });
  } catch (err) {
    console.error(`Cannot connect to MySQL: ${err.message}`);
    console.error("Check DB_HOST, DB_USER and DB_PASSWORD in backend/.env and that MySQL is running.");
    process.exit(1);
  }

  const [dbs] = await server.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", [s.database]);
  const exists = dbs.length > 0;

  if (exists) {
    const info = await describeExisting(server, s.database);
    console.log(`It exists and has ${info.tables} tables${info.counts.length ? ` (${info.counts.join(", ")})` : ""}.`);
    console.log("ALL OF IT WILL BE DELETED. No backup is taken and there is no undo.");
  } else {
    console.log("It does not exist yet, so nothing will be deleted - it will simply be created.");
  }

  if (!args.yes) {
    console.log("");
    const typed = await ask(`Type the database name (${s.database}) to rebuild it from scratch, or press Enter to cancel: `);
    if (typed !== s.database) {
      console.log("Cancelled. Nothing was changed.");
      await server.end();
      return;
    }
  }

  // 1. wipe and create
  try {
    await server.query(`DROP DATABASE IF EXISTS ${Q(s.database)}`);
    await server.query(`CREATE DATABASE ${Q(s.database)} CHARACTER SET utf8mb4`);
  } catch (err) {
    console.error(`\nCould not drop / create the database: ${err.message}`);
    console.error("The MySQL user in backend/.env needs the DROP and CREATE rights (run it as root once, or grant them).");
    await server.end().catch(() => {});
    process.exit(1);
  }
  await server.end();
  console.log(`\n1/4  Database "${s.database}" created (empty).`);

  // 2. the schema
  const conn = await connect({ multi: true });
  try {
    await conn.query(schemaSql());
  } catch (err) {
    console.error(`\nThe schema could not be created: ${err.message}`);
    console.error("The database is empty. Fix the error above (database/schema.sql) and run this again.");
    await conn.end().catch(() => {});
    process.exit(1);
  }

  const [rows] = await conn.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [s.database]);
  const have = new Set(rows.map((r) => r.t));
  const missing = schemaTables().filter((t) => !have.has(t));
  if (missing.length) {
    console.error(`\nThese tables were not created: ${missing.join(", ")}`);
    await conn.end().catch(() => {});
    process.exit(1);
  }
  const [[rules]] = await conn.query("SELECT COUNT(*) AS n FROM points_rules");
  console.log(`2/4  ${have.size} tables created, ${Number(rules.n)} ranking-point rules loaded.`);

  // 3. the first association login (without one nobody can sign in at /ma-signin)
  let login = null;
  if (args["no-master"]) {
    console.log("3/4  Association login skipped (--no-master).");
  } else {
    const username = typeof args["master-user"] === "string" ? args["master-user"] : "association";
    const email = typeof args["master-email"] === "string" ? args["master-email"] : "association@spark.local";
    const generated = typeof args["master-password"] !== "string";
    const password = generated ? randomPassword() : args["master-password"];
    await conn.query("INSERT INTO master_admins (username, password, email_address) VALUES (?, ?, ?)", [username, bcrypt.hashSync(password, 10), email]);
    login = { username, password, generated };
    console.log(`3/4  Association login "${username}" created.`);
  }
  await conn.end();

  // 4. does the new database match what the code reads and writes?
  let checkFailed = false;
  if (args["no-check"]) {
    console.log("4/4  Comparison with the code skipped (--no-check).");
  } else {
    console.log("4/4  Comparing the new database with the code (db:check) ...\n");
    const run = spawnSync(process.execPath, [path.join(__dirname, "dbCheck.js")], { stdio: "inherit", cwd: path.join(__dirname, "..") });
    checkFailed = run.status !== 0;
  }

  console.log("\n==============================================================");
  console.log(checkFailed ? " The database was rebuilt, but db:check reported problems (above)." : ` Done. "${s.database}" is brand new and empty.`);
  if (login) {
    console.log("\n Association (master admin) login  - sign in at /ma-signin");
    console.log(`   username: ${login.username}`);
    console.log(`   password: ${login.password}${login.generated ? "   (random - write it down, it is not stored anywhere readable)" : ""}`);
  }
  console.log("\n Next:");
  console.log("   1. start the backend again           npm start     (or: node index.js)");
  console.log("   2. optional, 16 test teams + schedule  npm run seed:test");
  console.log("   Team admins appear when you approve a team's registration (password admin_<village name>).");
  console.log("==============================================================");
  process.exit(checkFailed ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
