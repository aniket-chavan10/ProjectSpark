import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LuCalendarCheck, LuCalendarClock, LuCalendarPlus, LuChevronLeft, LuChevronRight, LuCircleAlert, LuSparkles, LuTrophy } from "react-icons/lu";
import teamApi from "../../api/teamApi";
import tournamentApi from "../../api/tournamentApi1";
import { Alert, Badge, Button, Card, CardHeader, cx, EmptyState, IconButton, PageHeader, Spinner, Stat } from "../ui/kit";
import { field, label } from "../ui/classes";
import { add, dayOf, diff, keyOf, label3, mondayOf, MONTHS, nextWeekday, range, sameDay, WEEKDAYS } from "./dates";

/* ----------------------------------------------------------------------------------------------------------------
 * The association's planner: a big month calendar where hosting dates are reserved for a team. A reservation is a
 * bar that runs across the days it covers. Pick a start day, choose how many days (1-7), choose the host, reserve.
 * ---------------------------------------------------------------------------------------------------------------- */

// what each reservation status means, and how it is drawn
const STATUS = {
  pending: { name: "Reserved", tone: "amber", bar: "bg-gradient-to-r from-amber-300 to-amber-400 text-amber-950", dot: "bg-amber-400", note: "Dates held for the host" },
  allocated: { name: "Hosting", tone: "indigo", bar: "bg-gradient-to-r from-ink-800 to-indigo-600 text-white", dot: "bg-indigo-600", note: "The host has created the tournament" },
  completed: { name: "Completed", tone: "green", bar: "bg-gradient-to-r from-green-600 to-emerald-500 text-white", dot: "bg-green-600", note: "Tournament finished" },
  cancelled: { name: "Cancelled", tone: "slate", bar: "bg-ink-200 text-ink-600", dot: "bg-ink-300", note: "Dates released" },
};
const stat = (s) => STATUS[s] || STATUS.pending;

const normalise = (t) => {
  const start = dayOf(t.start_date);
  const days = Number(t.reserved_days) || (t.end_date ? diff(start, dayOf(t.end_date)) + 1 : 3);
  return {
    id: t.id,
    host: t.organizer_team_name || t.organizer || "Host team",
    tournament: t.tournament_name || "",
    status: t.status || "pending",
    start,
    days,
    end: add(start, days - 1),
  };
};

/* ------------------------------------------------ the month grid ------------------------------------------------ */

/** The bars of one week, each on its own lane so overlapping ones sit under each other. */
function weekBars(week, items) {
  const first = week[0];
  const last = week[6];
  const hit = items
    .filter((r) => r.start <= last && r.end >= first)
    .map((r) => ({ r, col: Math.max(0, diff(first, r.start)), to: Math.min(6, diff(first, r.end)), left: r.start < first, right: r.end > last }))
    .sort((a, b) => a.col - b.col || b.to - a.to);
  const lanes = [];
  hit.forEach((b) => {
    let lane = lanes.findIndex((end) => end < b.col);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = b.to;
    b.lane = lane;
  });
  return { bars: hit, count: lanes.length };
}

function MonthGrid({ month, items, draft, picked, today, focusId, onPick, onFocus }) {
  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const out = [];
    for (let w = mondayOf(first); w <= lastDay; w = add(w, 7)) out.push(Array.from({ length: 7 }, (_, i) => add(w, i)));
    return out;
  }, [month]);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="grid grid-cols-7 bg-ink-950 text-white">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cx("py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.2em]", i >= 5 ? "text-spark-300" : "text-ink-200")}>
            {w}
          </div>
        ))}
      </div>
      {weeks.map((week) => {
        const { bars, count } = weekBars(week, draft ? [...items, draft] : items);
        return (
          <div key={keyOf(week[0])} className="relative grid grid-cols-7 border-t border-ink-100" style={{ minHeight: Math.max(118, 52 + count * 30 + 12) }}>
            {week.map((d, i) => {
              const inMonth = d.getMonth() === month.getMonth();
              const past = d < today;
              const isToday = sameDay(d, today);
              const inDraft = draft && d >= draft.start && d <= draft.end;
              return (
                <button
                  key={keyOf(d)}
                  type="button"
                  disabled={past}
                  onClick={() => onPick(d)}
                  aria-label={`${label3(d)}${isToday ? ", today" : ""}`}
                  className={cx(
                    "group relative flex items-start justify-between px-2.5 pt-2 text-left transition-colors",
                    i > 0 && "border-l border-ink-100",
                    past ? "cursor-default bg-ink-50/80" : "hover:bg-spark-50/70",
                    inDraft && "bg-spark-50",
                    i >= 5 && !past && !inDraft && "bg-ink-50/40"
                  )}
                >
                  <span className={cx("flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[13px] font-bold tabular-nums", isToday ? "bg-spark-grad text-white shadow-glow" : picked && sameDay(d, picked) ? "bg-ink-950 text-white" : past ? "text-ink-300" : inMonth ? "text-ink-900" : "text-ink-300")}>
                    {d.getDate() === 1 ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : d.getDate()}
                  </span>
                  {!past && <LuCalendarPlus className="mt-1.5 h-3.5 w-3.5 text-spark-500 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />}
                </button>
              );
            })}
            <div className="pointer-events-none absolute inset-x-0 top-10 grid grid-cols-7 auto-rows-[26px] gap-y-1" style={{ paddingBottom: 8 }}>
              {bars.map(({ r, col, to, left, right, lane }) =>
                r.draft ? (
                  <div key="draft" className={cx("flex items-center gap-1.5 border-2 border-dashed border-spark-500 bg-spark-100/90 px-2 text-[12px] font-extrabold text-spark-800", !left && "ml-1 rounded-l-lg", !right && "mr-1 rounded-r-lg")} style={{ gridColumn: `${col + 1} / ${to + 2}`, gridRow: lane + 1 }}>
                    <LuSparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.host || "New reservation"}</span>
                  </div>
                ) : (
                  <button
                    key={`${r.id}`}
                    type="button"
                    onClick={() => onFocus(r.id)}
                    title={`${r.host} · ${range(r.start, r.end)} · ${stat(r.status).name}`}
                    className={cx("pointer-events-auto flex items-center gap-1.5 px-2 text-left text-[12px] font-extrabold shadow-sm transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500", stat(r.status).bar, !left && "ml-1 rounded-l-lg", !right && "mr-1 rounded-r-lg", focusId === r.id && "ring-2 ring-ink-950 ring-offset-1")}
                    style={{ gridColumn: `${col + 1} / ${to + 2}`, gridRow: lane + 1 }}
                  >
                    <span className="truncate">{r.host}</span>
                    {to - col >= 1 && <span className="ml-auto shrink-0 rounded bg-black/15 px-1 text-[10px] tabular-nums">{r.days}d</span>}
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------ the booked list ------------------------------------------------ */

const FILTERS = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
];

function BookedList({ items, today, focusId, onFocus }) {
  const [filter, setFilter] = useState("upcoming");
  const shown = useMemo(() => {
    const list = items.filter((r) => (filter === "cancelled" ? r.status === "cancelled" : filter === "past" ? r.status !== "cancelled" && r.end < today : r.status !== "cancelled" && r.end >= today));
    return list.sort((a, b) => (filter === "past" ? b.start - a.start : a.start - b.start));
  }, [items, filter, today]);
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardHeader title="Booked dates" subtitle="Click one to find it on the calendar" icon={LuCalendarCheck} />
        <div className="mt-3 inline-flex rounded-xl bg-ink-50 p-1 ring-1 ring-inset ring-ink-100" role="tablist">
          {FILTERS.map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold transition", filter === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-800")}>
              {name}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={LuCalendarClock} title={filter === "upcoming" ? "Nothing booked ahead" : "Nothing here"}>{filter === "upcoming" ? "Pick a day on the calendar to reserve it." : ""}</EmptyState>
        </div>
      ) : (
        <ul className="mt-3 max-h-[26rem] divide-y divide-ink-100 overflow-y-auto border-t border-ink-100">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onFocus(r.id, r.start)} className={cx("flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-ink-50", focusId === r.id && "bg-spark-50")}>
                <span className={cx("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white", r.status === "cancelled" ? "bg-ink-300" : "bg-ink-950")}>
                  <span className="font-display text-xl font-extrabold leading-none">{r.start.getDate()}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-ink-200">{MONTHS[r.start.getMonth()].slice(0, 3)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm font-bold", r.status === "cancelled" ? "text-ink-400 line-through" : "text-ink-950")}>{r.host}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {range(r.start, r.end)} · {r.days} day{r.days === 1 ? "" : "s"}
                    {r.tournament ? ` · ${r.tournament}` : ""}
                  </span>
                </span>
                <Badge tone={stat(r.status).tone}>{stat(r.status).name}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------------------------- the page ---------------------------------------------------- */

export default function TournamentScheduler() {
  const today = useMemo(() => dayOf(new Date()), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [teams, setTeams] = useState([]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [hostId, setHostId] = useState("");
  const [picked, setPicked] = useState(null); // the first day, a Date
  const [days, setDays] = useState(3);
  const [focusId, setFocusId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { tone, text }

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([teamApi.getAllTeams(), tournamentApi.getAllTentativeSchedules()]);
      setTeams((t && t.teams) || t || []);
      setRows((s || []).map(normalise));
      setError("");
    } catch (e) {
      setError("Could not load the teams and reserved dates. Try again in a moment.");
      setRows((r) => r || []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => (rows || []).filter((r) => r.status !== "cancelled"), [rows]);
  const hostName = (teams.find((t) => String(t.id) === String(hostId)) || {}).team_name;
  const draft = picked ? { draft: true, id: "draft", host: hostName || "", start: picked, days, end: add(picked, days - 1) } : null;
  const clash = draft ? active.find((r) => r.start <= draft.end && r.end >= draft.start) : null;
  const tooEarly = picked && picked < today;
  const ready = hostId && picked && !clash && !tooEarly;

  const pick = (d) => {
    setPicked(d);
    setResult(null);
  };
  const focus = (id, start) => {
    setFocusId(id);
    if (start) setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  };

  const reserve = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setResult(null);
    try {
      await tournamentApi.createTentativeSchedule({ organizer_admin_id: hostId, start_date: keyOf(picked), reserved_days: days });
      setResult({ tone: "success", text: `${hostName || "The host"} now has ${range(picked, add(picked, days - 1))}. They have been told.` });
      setPicked(null);
      setHostId("");
      await load();
    } catch (err) {
      setResult({ tone: "error", text: (err.response && err.response.data && err.response.data.error) || "Could not reserve those dates." });
    } finally {
      setBusy(false);
    }
  };

  const upcoming = active.filter((r) => r.end >= today);
  const nextUp = [...upcoming].sort((a, b) => a.start - b.start)[0];
  const monthLabel = `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;
  const go = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Association" title="Tournament planner" subtitle="Reserve hosting dates for a team. The host then sets the tournament up from their own dashboard." />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Upcoming hostings" value={upcoming.length} icon={LuCalendarCheck} tone="green" hint="Reserved or running" />
        <Stat label="Waiting for a host" value={upcoming.filter((r) => r.status === "pending").length} icon={LuCalendarClock} tone="amber" hint="Dates held, no tournament yet" />
        <Stat label="Tournaments created" value={active.filter((r) => r.status === "allocated").length} icon={LuTrophy} tone="indigo" hint="Hosts that have set up" />
        <Stat label="Next start" value={nextUp ? `${nextUp.start.getDate()} ${MONTHS[nextUp.start.getMonth()].slice(0, 3)}` : "—"} icon={LuSparkles} tone="blue" hint={nextUp ? nextUp.host : "Nothing reserved ahead"} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        {/* the calendar */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-r from-white to-spark-50/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink-950">{monthLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
                Today
              </Button>
              <IconButton icon={LuChevronLeft} label="Previous month" variant="secondary" onClick={() => go(-1)} />
              <IconButton icon={LuChevronRight} label="Next month" variant="secondary" onClick={() => go(1)} />
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {rows === null ? <Spinner /> : <MonthGrid month={month} items={active} draft={draft} picked={picked} today={today} focusId={focusId} onPick={pick} onFocus={setFocusId} />}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
              {["pending", "allocated", "completed"].map((s) => (
                <span key={s} className="inline-flex items-center gap-2" title={stat(s).note}>
                  <span className={cx("h-3 w-6 rounded", stat(s).dot)} aria-hidden="true" />
                  <b className="font-bold text-ink-800">{stat(s).name}</b>
                  <span className="hidden sm:inline">{stat(s).note}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-6 rounded border-2 border-dashed border-spark-500 bg-spark-100" aria-hidden="true" />
                <b className="font-bold text-ink-800">Your pick</b>
              </span>
            </div>
          </div>
        </Card>

        {/* the form and the list */}
        <div className="space-y-6 xl:sticky xl:top-24">
          <Card>
            <CardHeader title="Reserve dates" subtitle="Click a day on the calendar, or type it here" icon={LuCalendarPlus} />
            <form onSubmit={reserve} className="mt-5 space-y-4">
              <div>
                <label className={label} htmlFor="host">
                  Host team
                </label>
                <select id="host" className={field} value={hostId} onChange={(e) => setHostId(e.target.value)} disabled={!teams.length}>
                  <option value="">{teams.length ? "Choose the hosting team…" : "No teams yet"}</option>
                  {[...teams]
                    .sort((a, b) => String(a.team_name).localeCompare(String(b.team_name)))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name || t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor="start">
                  First day
                </label>
                <input id="start" type="date" className={field} value={picked ? keyOf(picked) : ""} min={keyOf(today)} onChange={(e) => pick(e.target.value ? dayOf(e.target.value) : null)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["Next Friday", nextWeekday(today, 5)],
                    ["Next Saturday", nextWeekday(today, 6)],
                  ].map(([name, d]) => (
                    <button key={name} type="button" onClick={() => { pick(d); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="rounded-full bg-ink-50 px-3 py-1 text-xs font-bold text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-spark-50 hover:text-spark-800 hover:ring-spark-300">
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={label}>How many days</span>
                <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Days">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={days === n} onClick={() => setDays(n)} className={cx("h-11 rounded-xl text-sm font-extrabold tabular-nums ring-1 ring-inset transition", days === n ? "bg-spark-grad text-white shadow-glow ring-transparent" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cx("rounded-2xl px-4 py-3 text-sm ring-1 ring-inset", clash ? "bg-red-50 text-red-800 ring-red-200" : picked ? "bg-spark-50 text-ink-900 ring-spark-200" : "bg-ink-50 text-ink-500 ring-ink-100")} aria-live="polite">
                {clash ? (
                  <p className="flex gap-2">
                    <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Clashes with <b>{clash.host}</b> ({range(clash.start, clash.end)}). Pick other days.
                    </span>
                  </p>
                ) : picked ? (
                  <p>
                    <span className="block font-display text-2xl font-extrabold uppercase tracking-wide">{range(picked, add(picked, days - 1))}</span>
                    <span className="text-xs text-ink-500">
                      {days} day{days === 1 ? "" : "s"}
                      {hostName ? ` · ${hostName}` : ""}
                    </span>
                  </p>
                ) : (
                  <p>No day chosen yet.</p>
                )}
              </div>

              {result && <Alert tone={result.tone === "success" ? "success" : "error"} onClose={() => setResult(null)}>{result.text}</Alert>}

              <Button type="submit" size="lg" className="w-full" icon={LuCalendarCheck} busy={busy} disabled={!ready}>
                Reserve these dates
              </Button>
            </form>
          </Card>

          <BookedList items={rows || []} today={today} focusId={focusId} onFocus={focus} />
        </div>
      </div>
    </div>
  );
}
