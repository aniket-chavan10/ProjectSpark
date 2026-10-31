// Small helpers shared by the scripts in this folder.

const readline = require("readline");

/** node script.js --teams 16 --yes --password abc  ->  { teams: "16", yes: true, password: "abc" } */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

/** Ask a yes/no question. `--yes` on the command line answers it. */
function confirm(question, skip) {
  if (skip) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

/** Which database the script is about to touch, so a wrong .env is noticed before anything changes. */
function target() {
  return `${process.env.DB_NAME || "(DB_NAME missing)"} on ${process.env.DB_HOST || "(DB_HOST missing)"}`;
}

const pad = (n, w = 2) => String(n).padStart(w, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Print rows as an aligned table. */
function table(rows, columns) {
  const widths = columns.map(([title, get]) => Math.max(title.length, ...rows.map((r) => String(get(r) ?? "").length)));
  const line = (cells) => cells.map((c, i) => String(c ?? "").padEnd(widths[i])).join("  ");
  console.log(line(columns.map(([t]) => t)));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  rows.forEach((r) => console.log(line(columns.map(([, get]) => get(r)))));
}

module.exports = { parseArgs, confirm, target, ymd, pad, table };
