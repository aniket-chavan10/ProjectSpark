// A DATE column comes back from mysql2 as a JavaScript Date at local midnight. String(date).slice(0, 10) is NOT
// "YYYY-MM-DD" ("Sun Nov 01"), so every API that sends a plain date goes through here.

const pad = (n) => String(n).padStart(2, "0");

/** Date | "YYYY-MM-DD..." | null  ->  "YYYY-MM-DD" | null */
module.exports = function dateOnly(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return String(value).slice(0, 10);
};
