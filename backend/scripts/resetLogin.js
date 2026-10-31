#!/usr/bin/env node
// Find or reset a login you forgot. Passwords are stored hashed, so an old password cannot be read back;
// this script instead (1) lists every login, and tells you when a team admin still has the DEFAULT password
// that the approval screen gave it (admin_<village name in lower case>), and (2) sets a new password.
//
//   node scripts/resetLogin.js --list
//   node scripts/resetLogin.js --master <username> --password <new>          association (master admin) login
//   node scripts/resetLogin.js --master <username> --create --email <e> --password <new>
//   node scripts/resetLogin.js --admin <email> --password <new>              a team admin login
//   node scripts/resetLogin.js --player <email> --password <new>             a player (players cannot log in yet)
//   add --yes to skip the question; leave out --password to get a random one printed
//
// Every command names the database first and asks before it changes anything.

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { parseArgs, confirm, target, table } = require("./_common");

const randomPassword = () => crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "x").slice(0, 10);

/** Passwords the approval screen would have generated for this login, in the order to try. */
function defaultCandidates({ village_name, team_name }) {
  const names = [village_name, team_name].filter(Boolean);
  return [...new Set(names.flatMap((n) => [`admin_${String(n).toLowerCase()}`]))];
}

/** The first candidate that matches the stored hash, or null. */
function matchingDefault(hash, candidates) {
  return candidates.find((c) => bcrypt.compareSync(c, hash)) || null;
}

async function list(db) {
  const [masters] = await db.query(`SELECT id, username, email_address, created_at FROM master_admins ORDER BY id`);
  console.log("\nASSOCIATION LOGINS (master admin) - sign in at /ma-signin with the username");
  table(masters, [["id", (r) => r.id], ["username", (r) => r.username], ["email", (r) => r.email_address]]);

  const [admins] = await db.query(
    `SELECT a.id, a.admin_name, a.email, a.password, a.team_name, a.role, a.is_organizer, t.id AS team_id, v.village_name
     FROM admins a LEFT JOIN teams t ON t.team_name = a.team_name LEFT JOIN villages v ON v.team_name = a.team_name AND v.status = 'approved'
     ORDER BY a.id`
  );
  console.log("\nTEAM ADMIN LOGINS - sign in at /sign-in with the email");
  table(admins, [
    ["id", (r) => r.id],
    ["email (login)", (r) => r.email],
    ["team", (r) => r.team_name],
    ["admin", (r) => r.admin_name],
    ["host", (r) => (r.is_organizer ? "yes" : "")],
    ["password", (r) => {
      if (!r.team_id) return "NO MATCHING TEAM - cannot log in";
      const def = matchingDefault(r.password, defaultCandidates(r));
      return def ? `default still works: ${def}` : "changed (reset it below)";
    }],
  ]);
  console.log("\nTo set a new password:  node scripts/resetLogin.js --admin <email> --password <new>\n");
}

async function setPassword(db, { table: tbl, key, value, password, create, email }) {
  const hash = bcrypt.hashSync(password, 10);
  const [rows] = await db.query(`SELECT id FROM ${tbl} WHERE ${key} = ?`, [value]);
  if (rows.length) {
    await db.query(`UPDATE ${tbl} SET password = ? WHERE ${key} = ?`, [hash, value]);
    return "updated";
  }
  if (create && tbl === "master_admins") {
    if (!email) throw new Error("--create needs --email");
    await db.query(`INSERT INTO master_admins (username, password, email_address) VALUES (?, ?, ?)`, [value, hash, email]);
    return "created";
  }
  throw new Error(`No ${key} "${value}" in ${tbl}. Run with --list to see the logins that exist.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  require("dotenv").config();
  const wants = ["list", "master", "admin", "player"].filter((k) => args[k]);
  if (wants.length !== 1) {
    console.log("Use one of: --list | --master <username> | --admin <email> | --player <email>   (see the top of this file)");
    return;
  }

  console.log(`\nDatabase: ${target()}`);
  const db = require("../dbconfigure");
  try {
    if (args.list) return await list(db);

    const password = typeof args.password === "string" ? args.password : randomPassword();
    if (password.length < 6) throw new Error("Use a password of at least 6 characters");
    const job = args.master
      ? { table: "master_admins", key: "username", value: args.master, label: `association login "${args.master}"` }
      : args.admin
      ? { table: "admins", key: "email", value: args.admin, label: `team admin login ${args.admin}` }
      : { table: "players_core", key: "email", value: args.player, label: `player ${args.player}` };
    console.log(`This will set a new password for the ${job.label}.`);
    if (!(await confirm("Continue?", args.yes))) return console.log("Cancelled. Nothing was changed.");

    const done = await setPassword(db, { ...job, password, create: !!args.create, email: args.email });
    console.log(`\nPassword ${done}.\n  login:    ${job.value}\n  password: ${password}\n`);
    if (job.table === "admins") console.log("(A team admin can only sign in if a team with the same team name exists. --list warns when it does not.)\n");
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("\nFailed:", err.message);
    process.exit(1);
  });
}

module.exports = { defaultCandidates, matchingDefault, randomPassword, setPassword };
