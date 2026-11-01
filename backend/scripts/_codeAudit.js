// Reads the SQL written in the backend source and checks every column it names against the schema.
// A heuristic (no SQL parser): it understands "FROM/JOIN/UPDATE/INTO table alias", alias.column,
// INSERT INTO t (cols), UPDATE t SET a = ?, and single-table queries. It is what would have caught
// `balls.over_id` and `tournaments.updated_at` before they reached a real database.

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["node_modules", "tests", "mocks", "migrations", "uploads", "scripts", "database"]);
const KEYWORDS = new Set(["where", "on", "set", "left", "right", "inner", "join", "group", "order", "limit", "using", "values", "select", "as", "and", "or", "cross", "outer", "union", "having", "for", "natural", "not", "in"]);

function sourceFiles(root) {
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(f.name)) continue;
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith(".js")) out.push(p);
    }
  })(root);
  return out;
}

/** @param tables Map<tableName, Set<columnName>>  @returns Map<"table.column (kind)", Set<file>> */
function auditCode(tables, root) {
  const issues = new Map();
  const note = (file, table, col, kind) => {
    const key = `${table}.${col} (${kind})`;
    if (!issues.has(key)) issues.set(key, new Set());
    issues.get(key).add(path.relative(root, file).replace(/\\/g, "/"));
  };

  for (const file of sourceFiles(root)) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/`([^`]*)`|"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) {
      const raw = m[1] ?? m[2] ?? m[3];
      if (!raw || !/\b(select|insert\s+into|update|delete\s+from)\b/i.test(raw) || !/\b(from|into|update|set)\b/i.test(raw)) continue;
      const s = raw.replace(/\$\{[^}]*\}/g, "?").replace(/\s+/g, " ");

      const alias = {};
      const named = [];
      for (const t of s.matchAll(/\b(?:from|join|update|into)\s+`?(\w+)`?(?:\s+(?:as\s+)?`?(\w+)`?)?/gi)) {
        if (!tables.has(t[1])) continue;
        named.push(t[1]);
        alias[t[1]] = t[1];
        if (t[2] && !KEYWORDS.has(t[2].toLowerCase())) alias[t[2]] = t[1];
      }

      // alias.column
      for (const c of s.matchAll(/\b(\w+)\.`?(\w+)`?/g)) {
        const t = alias[c[1]];
        if (t && c[2] !== "*" && !tables.get(t).has(c[2])) note(file, t, c[2], "column");
      }
      // INSERT INTO t (a, b)
      for (const c of s.matchAll(/insert\s+(?:ignore\s+)?into\s+`?(\w+)`?\s*\(([^)]*)\)/gi)) {
        if (!tables.has(c[1])) continue;
        for (const col of c[2].split(",").map((x) => x.trim().replace(/`/g, ""))) if (/^\w+$/.test(col) && !tables.get(c[1]).has(col)) note(file, c[1], col, "insert");
      }
      // UPDATE t SET a = ?, b = ?
      for (const c of s.matchAll(/update\s+`?(\w+)`?(?:\s+(?:as\s+)?\w+)?(?:\s+(?:left\s+|inner\s+)?join\s+[^]*?)?\s+set\s+(.*?)(?:\s+where\s+|$)/gi)) {
        if (!tables.has(c[1])) continue;
        for (const a of c[2].matchAll(/(?:^|,\s*)(?:\w+\.)?`?(\w+)`?\s*=/g)) if (!tables.get(c[1]).has(a[1])) note(file, c[1], a[1], "update");
      }

      // a query over ONE table: unqualified snake_case names must be its columns
      if (!/\bjoin\b|\bunion\b|\(\s*select\b/i.test(s) && new Set(named).size === 1) {
        const t = named[0];
        const aliases = new Set([...s.matchAll(/\bas\s+`?(\w+)`?/gi)].map((x) => x[1].toLowerCase()));
        const bare = s.replace(/'[^']*'/g, "''").replace(/\b\w+\.\w+/g, " ");
        for (const w of bare.matchAll(/\b([a-z]+_[a-z0-9_]+)\b/g)) {
          const id = w[1];
          if (tables.get(t).has(id) || aliases.has(id) || id === t || tables.has(id)) continue;
          if (/^(inner_|left_|if_|on_|is_null|not_null|auto_increment|group_concat|date_format|current_timestamp|insert_id|row_count|last_insert_id|case_|time_|str_to)/.test(id)) continue;
          note(file, t, id, "column");
        }
      }
    }
  }
  return issues;
}

module.exports = { auditCode };
