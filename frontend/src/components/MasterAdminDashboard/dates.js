// Small calendar helpers for the planner and the schedule page. Dates are handled as local midnight, so a day never slips.
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const add = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const diff = (a, b) => Math.round((b - a) / 86400000);
export const sameDay = (a, b) => keyOf(a) === keyOf(b);

/** A date from the server (a plain "2026-11-06" or a full timestamp) as local midnight. */
export const dayOf = (v) => {
  if (v instanceof Date) {
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(v);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** "Fri 6 Nov" */
export const label3 = (d) => `${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
/** "Fri 6 Nov – Sun 8 Nov" */
export const range = (a, b) => (sameDay(a, b) ? label3(a) : `${label3(a)} – ${label3(b)}`);
export const mondayOf = (d) => add(d, -((d.getDay() + 6) % 7));
/** The next given weekday (0 = Sunday) after `from`. */
export const nextWeekday = (from, weekday) => {
  const d = new Date(from);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7));
  return d;
};
