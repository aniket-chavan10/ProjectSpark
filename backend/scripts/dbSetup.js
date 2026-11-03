// npm run db:setup     - build an empty Spark database from database/schema.sql (a new machine).
// npm run db:setup -- --yes      skip the question
//
// It creates the database named in backend/.env when it does not exist. It refuses to run on a database that
// already has Spark tables: use `npm run db:upgrade` for those (an old database, or a restored dump).

const { parseArgs, confirm } = require("./_common");
const { connect, schemaSql, schemaTables, settings, quoteId } = require("./_db");

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const s = settings();
  console.log(`Target: database "${s.database}" on ${s.host}:${s.port} as ${s.user}`);

  const server = await connect({ database: null });
  const [dbs] = await server.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", [s.database]);
  const exists = dbs.length > 0;

  if (exists) {
    const [rows] = await server.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [s.database]);
    const have = new Set(rows.map((r) => r.TABLE_NAME));
    const ours = schemaTables().filter((t) => have.has(t));
    if (ours.length) {
      console.error(`\nThis database already has ${ours.length} Spark tables (${ours.slice(0, 5).join(", ")}${ours.length > 5 ? ", ..." : ""}).`);
      console.error("Nothing was changed. To bring an existing database up to date run:  npm run db:upgrade");
      console.error("To throw it away and start from an empty one run:                       npm run db:fresh");
      await server.end();
      process.exit(1);
    }
  }

  if (!(await confirm(`${exists ? "Create the Spark tables in" : "Create the database and tables in"} "${s.database}"?`, args.yes))) {
    console.log("Cancelled.");
    await server.end();
    return;
  }

  if (!exists) await server.query(`CREATE DATABASE ${quoteId(s.database)} CHARACTER SET utf8mb4`);
  await server.end();

  const conn = await connect({ multi: true });
  try {
    await conn.query(schemaSql());
  } catch (err) {
    console.error(`\nThe schema could not be created: ${err.message}`);
    await conn.end();
    process.exit(1);
  }
  const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [s.database]);
  await conn.end();
  console.log(`\nDone. ${n} tables created.`);
  console.log("Next:  npm run db:check      (confirms it matches the code)");
  console.log("       npm run seed:test     (optional: 16 test teams and a ready schedule)");
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
