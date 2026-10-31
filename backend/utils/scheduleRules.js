// Scheduling rules for one ground: auto-plan the matches into the tournament days and check a
// hand-edited schedule. Dates are plain "YYYY-MM-DD" and times "HH:mm" (wall-clock, no time zones).

const { ScoringError } = require("./errors");
const { STAGE } = require("./tournamentFormat");

/* ------------------------------ time helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, "0");

/** ("2026-11-06", "09:30") -> minutes since 1970 on a naive clock */
function toMinutes(dateStr, timeStr) {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ""));
  const t = /^(\d{1,2}):(\d{2})/.exec(String(timeStr || ""));
  if (!d || !t) return NaN;
  return Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]) / 60000;
}

/** minutes -> { date: "YYYY-MM-DD", time: "HH:mm" } */
function fromMinutes(min) {
  const dt = new Date(min * 60000);
  return {
    date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
    time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
  };
}

const addDays = (dateStr, n) => fromMinutes(toMinutes(dateStr, "00:00") + n * 1440).date;

/** Every date from start to end, both included. */
function daysBetween(startDate, endDate) {
  const out = [];
  for (let d = startDate; d <= endDate && out.length < 31; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 10 minutes per over plus 10 for the changeover: 5 overs = 60 min, 2 overs = 30 min, 1 over = 20 min. */
const defaultDurationMinutes = (overs) => Math.max(1, Number(overs) || 1) * 10 + 10;

/** Default overs per match type; the host can change any of them. */
const DEFAULT_OVERS = { 1: 5, 2: 4, 3: 4, 4: 4, semi: 2, third_place: 2, final: 2 };

const oversKeyFor = (match) => (match.stage === STAGE.GROUP ? match.round : match.stage);

/* -------------------------------- auto-plan -------------------------------- */

/**
 * Lay the matches out on the tournament days, one after another on the single ground.
 * Groups are played one at a time, so the first group is completely finished before the next starts;
 * then the semi-finals, the optional third-place match and the final.
 *
 * @param matches fixtures from buildFixtures()
 * @param settings {
 *   days: ["2026-11-06", ...],           days the tournament can use
 *   dayStart: "09:00", dayEnd: "19:00",  playing hours each day
 *   breakStart?: "13:00", breakEnd?: "14:00",  optional lunch break
 *   gapMinutes: 10,                      time between two matches
 *   overs: { 1: 5, 2: 4, ... }           overs by group round / "semi" / "third_place" / "final"
 *   restFriendly: true                   play a group's first round together so winners get a rest
 * }
 * @returns { slots, fits, overflowMinutes, totalMinutes }
 */
function autoPlan(matches, settings) {
  const s = normalizeSettings(settings);
  const overs = { ...DEFAULT_OVERS, ...(settings.overs || {}) };

  const groupSeq = {};
  matches.forEach((m) => {
    if (m.group && groupSeq[m.group] === undefined) groupSeq[m.group] = Object.keys(groupSeq).length;
  });
  const stageOrder = { [STAGE.GROUP]: 0, [STAGE.SEMI]: 1, [STAGE.THIRD]: 2, [STAGE.FINAL]: 3 };
  const ordered = [...matches].sort((a, b) => {
    if (stageOrder[a.stage] !== stageOrder[b.stage]) return stageOrder[a.stage] - stageOrder[b.stage];
    if (a.stage === STAGE.GROUP) {
      if (groupSeq[a.group] !== groupSeq[b.group]) return groupSeq[a.group] - groupSeq[b.group];
      if (s.restFriendly && a.round !== b.round) return a.round - b.round;
    }
    return a.match_no - b.match_no;
  });

  const dayDate = (i) => (i < s.days.length ? s.days[i] : addDays(s.days[s.days.length - 1], i - s.days.length + 1));
  let dayIdx = 0;
  let cursor = toMinutes(dayDate(0), s.dayStart);
  let overflowMinutes = 0;
  let totalMinutes = 0;
  const slots = [];

  for (const m of ordered) {
    const matchOvers = overs[oversKeyFor(m)] ?? overs.final;
    const duration = defaultDurationMinutes(matchOvers);
    totalMinutes += duration;

    for (let guard = 0; guard < 400; guard++) {
      const date = dayDate(dayIdx);
      const dayEnd = toMinutes(date, s.dayEnd);
      const bs = s.breakStart ? toMinutes(date, s.breakStart) : null;
      const be = s.breakEnd ? toMinutes(date, s.breakEnd) : null;

      if (bs !== null && cursor >= bs && cursor < be) cursor = be; // starts inside the break
      if (bs !== null && cursor < bs && cursor + duration > bs) cursor = be; // would run into the break
      if (cursor + duration > dayEnd) {
        dayIdx += 1;
        cursor = toMinutes(dayDate(dayIdx), s.dayStart);
        continue;
      }
      const start = fromMinutes(cursor);
      const overflow = dayIdx >= s.days.length;
      if (overflow) overflowMinutes += duration;
      slots.push({
        match_no: m.match_no,
        match_date: start.date,
        start_time: start.time,
        end_time: fromMinutes(cursor + duration).time,
        duration_minutes: duration,
        overs: matchOvers,
        overflow,
      });
      cursor += duration + s.gapMinutes;
      break;
    }
  }

  slots.sort((a, b) => a.match_no - b.match_no);
  return { slots, fits: overflowMinutes === 0, overflowMinutes, totalMinutes };
}

function normalizeSettings(settings = {}) {
  const days = [...new Set((settings.days || []).filter(Boolean))].sort();
  if (!days.length) throw new ScoringError("Choose at least one playing day");
  const dayStart = settings.dayStart || "09:00";
  const dayEnd = settings.dayEnd || "19:00";
  if (!(toMinutes(days[0], dayStart) < toMinutes(days[0], dayEnd))) {
    throw new ScoringError("The playing day must end after it starts");
  }
  const hasBreak = settings.breakStart && settings.breakEnd;
  if (hasBreak && !(toMinutes(days[0], settings.breakStart) < toMinutes(days[0], settings.breakEnd))) {
    throw new ScoringError("The break must end after it starts");
  }
  return {
    days,
    dayStart,
    dayEnd,
    breakStart: hasBreak ? settings.breakStart : null,
    breakEnd: hasBreak ? settings.breakEnd : null,
    gapMinutes: Math.max(0, Number(settings.gapMinutes ?? 10) || 0),
    restFriendly: settings.restFriendly !== false,
  };
}

/* ------------------------------- validation ------------------------------- */

/**
 * Check a schedule.
 *
 * Errors block saving: a match without a time, two matches at the same time on the one ground,
 * a match that starts before the matches feeding it are finished, a date outside the tournament.
 * Warnings are only shown: playing outside the usual hours, a team that gets little rest.
 *
 * @param matches fixtures with a slot merged in: { match_no, dep1, dep2, match_date, start_time, duration_minutes }
 * @param rules   { startDate, endDate, dayStart, dayEnd, minRestMinutes }
 */
function validateSchedule(matches, rules = {}) {
  const errors = [];
  const warnings = [];
  const minRest = rules.minRestMinutes ?? 30;

  const timed = [];
  matches.forEach((m) => {
    const start = toMinutes(m.match_date, m.start_time);
    const duration = Number(m.duration_minutes);
    if (Number.isNaN(start)) {
      errors.push({ code: "unscheduled", matchNo: m.match_no, message: `Match ${m.match_no} has no day and time` });
      return;
    }
    if (!(duration > 0) || duration > 720) {
      errors.push({ code: "duration", matchNo: m.match_no, message: `Match ${m.match_no} needs a length between 1 minute and 12 hours` });
      return;
    }
    timed.push({ ...m, start, end: start + duration });
  });

  // outside the tournament dates
  if (rules.startDate && rules.endDate) {
    timed.forEach((m) => {
      if (m.match_date < rules.startDate || m.match_date > rules.endDate) {
        errors.push({
          code: "outside_dates",
          matchNo: m.match_no,
          message: `Match ${m.match_no} is on ${m.match_date}, outside the tournament dates (${rules.startDate} to ${rules.endDate})`,
        });
      }
    });
  }

  // one ground: no two matches at the same time
  const byStart = [...timed].sort((a, b) => a.start - b.start || a.match_no - b.match_no);
  let latest = null;
  byStart.forEach((m) => {
    if (latest && m.start < latest.end) {
      errors.push({
        code: "overlap",
        matchNo: m.match_no,
        otherMatchNo: latest.match_no,
        message: `Match ${m.match_no} starts at ${m.start_time} while Match ${latest.match_no} is still on (until ${fromMinutes(latest.end).time})`,
      });
    }
    if (!latest || m.end > latest.end) latest = m;
  });

  // a match needs the matches feeding it to be over, and gives those teams some rest
  const byNo = Object.fromEntries(timed.map((m) => [m.match_no, m]));
  timed.forEach((m) => {
    [m.dep1, m.dep2].filter(Boolean).forEach((dep) => {
      const feeder = byNo[dep.matchNo];
      if (!feeder) return;
      const gap = m.start - feeder.end;
      if (gap < 0) {
        errors.push({
          code: "order",
          matchNo: m.match_no,
          otherMatchNo: feeder.match_no,
          message: `Match ${m.match_no} must start after Match ${feeder.match_no} finishes (${fromMinutes(feeder.end).time})`,
        });
      } else if (gap < minRest) {
        warnings.push({
          code: "rest",
          matchNo: m.match_no,
          otherMatchNo: feeder.match_no,
          message: `The ${dep.type} of Match ${feeder.match_no} plays Match ${m.match_no} after only ${gap} min rest`,
        });
      }
    });
  });

  // outside the usual playing hours
  if (rules.dayStart && rules.dayEnd) {
    timed.forEach((m) => {
      if (m.start_time < rules.dayStart || fromMinutes(m.end).time > rules.dayEnd || fromMinutes(m.end).date !== m.match_date) {
        warnings.push({ code: "hours", matchNo: m.match_no, message: `Match ${m.match_no} is outside the playing hours ${rules.dayStart}-${rules.dayEnd}` });
      }
    });
  }

  return { errors, warnings };
}

/** Matches and minutes per day, for the summary line. */
function summarize(slots) {
  const perDay = {};
  slots.forEach((s) => {
    const d = (perDay[s.match_date] ||= { matches: 0, minutes: 0 });
    d.matches += 1;
    d.minutes += Number(s.duration_minutes) || 0;
  });
  return perDay;
}

module.exports = {
  toMinutes,
  fromMinutes,
  addDays,
  daysBetween,
  defaultDurationMinutes,
  DEFAULT_OVERS,
  autoPlan,
  validateSchedule,
  summarize,
};
