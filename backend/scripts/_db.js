// Connection helpers for the database scripts (db:setup, db:upgrade, db:check).
// They read the same .env as the server, so they act on the database the server uses.

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const SCHEMA_FILE = path.join(__dirname, "..", "database", "schema.sql");

function settings() {
  const missing = ["DB_HOST", "DB_USER", "DB_NAME"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing in backend/.env: ${missing.join(", ")}`);
    process.exit(1);
  }
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
  };
}

/** A single connection. `database: null` connects to the server without choosing a database. */
async function connect({ database, multi = false } = {}) {
  const s = settings();
  return mysql.createConnection({
    host: s.host,
    port: s.port,
    user: s.user,
    password: s.password,
    database: database === null ? undefined : database || s.database,
    multipleStatements: multi,
    charset: "utf8mb4",
  });
}

const schemaSql = () => fs.readFileSync(SCHEMA_FILE, "utf8");

/** Names of the tables the app needs, read from schema.sql. */
function schemaTables() {
  return [...schemaSql().matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/gi)].map((m) => m[1]);
}

const quoteId = (id) => `\`${String(id).replace(/`/g, "")}\``;

module.exports = { settings, connect, schemaSql, schemaTables, quoteId, SCHEMA_FILE };
