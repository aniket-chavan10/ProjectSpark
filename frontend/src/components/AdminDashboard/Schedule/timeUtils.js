// Small helpers for the schedule screens. Dates are "YYYY-MM-DD", times "HH:mm" (wall-clock, no time zones).

export const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

const pad = (n) => String(n).padStart(2, "0");

export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export const endTime = (start, duration) => {
  const s = toMin(start);
  return Number.isNaN(s) ? "" : fromMin(s + Number(duration || 0));
};

/** "Fri 6 Nov" */
export const dayLabel = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h" */
export const durationText = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Same rule as the server: 10 minutes an over plus 10 for the changeover. */
export const defaultDuration = (overs) => Math.max(1, Number(overs) || 1) * 10 + 10;

/** "12:30" -> "12:30 pm" */
export const clock = (t) => {
  const m = toMin(t);
  if (Number.isNaN(m)) return "";
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? "am" : "pm"}`;
};
