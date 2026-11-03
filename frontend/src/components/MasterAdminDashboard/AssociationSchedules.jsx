import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowRightLeft, LuCalendarClock, LuCalendarDays, LuCalendarPlus, LuCircleX, LuMapPin, LuRadio, LuSearch, LuSwords } from "react-icons/lu";
import { associationApi } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, CardHeader, cx, Dialog, EmptyState, LiveBadge, PageHeader, Spinner, Stat, TeamLogo } from "../ui/kit";
import { field, label, stageStyle } from "../ui/classes";
import { add, dayOf, keyOf, label3, MONTHS, range, sameDay } from "./dates";

const STAGE = { group: "Group", semi: "Semi-final", third_place: "Third place", final: "Final" };
const PLAN = { pending: ["Reserved", "amber"], allocated: ["Hosting", "indigo"], completed: ["Completed", "green"], cancelled: ["Cancelled", "slate"] };
const VIEWS = [
  ["upcoming", "Upcoming"],
  ["live", "Live"],
  ["done", "Finished"],
  ["all", "All"],
];

const hash = (s) => [...String(s || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
const team = (name) => ({ id: hash(name), name: name || "TBD" });
const dayName = (d, today) => (sameDay(d, today) ? "Today" : sameDay(d, add(today, 1)) ? "Tomorrow" : sameDay(d, add(today, -1)) ? "Yesterday" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]);
const clock = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ""));
  if (!m) return t || "—";
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
};

/* ------------------------------------------------ one match ------------------------------------------------ */

function MatchRow({ f }) {
  const live = f.status === "ongoing";
  const done = f.status === "completed";
  return (
    <li className={cx("relative grid items-center gap-x-5 gap-y-2 px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto]", live && "bg-red-50/60")}>
      {live && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" aria-hidden="true" />}
      <div>
        <p className="whitespace-nowrap font-display text-[1.7rem] font-extrabold uppercase leading-none tracking-wide text-ink-950">{clock(f.time)}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Match {f.matchNo}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex min-w-0 items-center gap-2">
            <TeamLogo team={team(f.team1)} size={32} />
            <span className="truncate text-[15px] font-bold text-ink-950">{f.team1 || "TBD"}</span>
          </span>
          <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-ink-500">vs</span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <TeamLogo team={team(f.team2)} size={32} />
            <span className="truncate text-[15px] font-bold text-ink-950">{f.team2 || "TBD"}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide", stageStyle[f.stage] || stageStyle.group)}>
            {STAGE[f.stage] || f.stage}
            {f.group ? ` ${f.group}` : ""}
          </span>
          <span className="font-semibold text-ink-700">{f.tournament}</span>
          {f.venue && (
            <span className="inline-flex items-center gap-1">
              <LuMapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {f.venue}
            </span>
          )}
        </div>
      </div>
      <div className="sm:justify-self-end">{live ? <LiveBadge /> : done ? <Badge tone="green">Finished</Badge> : <Badge tone="slate">Scheduled</Badge>}</div>
    </li>
  );
}

/* ------------------------------------------- the season plan side ------------------------------------------- */

function PlanCard({ r, onMove, onCancel }) {
  const start = dayOf(r.startDate);
  const end = dayOf(r.endDate);
  const [name, tone] = PLAN[r.status] || PLAN.pending;
  const off = r.status === "cancelled";
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className={cx("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white", off ? "bg-ink-300" : r.status === "pending" ? "bg-gradient-to-br from-amber-400 to-amber-500" : r.status === "completed" ? "bg-gradient-to-br from-green-600 to-emerald-500" : "bg-gradient-to-br from-ink-800 to-indigo-600")}>
          <span className="font-display text-2xl font-extrabold leading-none">{start.getDate()}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">{MONTHS[start.getMonth()].slice(0, 3)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cx("truncate text-[15px] font-bold", off ? "text-ink-400 line-through" : "text-ink-950")}>{r.host || "Host not found"}</p>
            <Badge tone={tone}>{name}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">
            {range(start, end)} · {r.days} day{Number(r.days) === 1 ? "" : "s"}
          </p>
          {r.tournament && <p className="mt-0.5 truncate text-xs font-semibold text-ink-700">{r.tournament}</p>}
          {r.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" icon={LuArrowRightLeft} onClick={() => onMove(r)}>
                Move
              </Button>
              <Button size="sm" variant="ghost" className="!text-red-700 hover:!bg-red-50" icon={LuCircleX} onClick={() => onCancel(r)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SeasonPlan({ reservations, onMove, onCancel, goTo }) {
  const [showOld, setShowOld] = useState(false);
  const live = reservations.filter((r) => r.status === "pending" || r.status === "allocated").sort((a, b) => dayOf(a.startDate) - dayOf(b.startDate));
  const old = reservations.filter((r) => r.status === "completed" || r.status === "cancelled").sort((a, b) => dayOf(b.startDate) - dayOf(a.startDate));
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardHeader title="Season plan" subtitle="Who hosts, and when" icon={LuCalendarClock} actions={goTo && <Button size="sm" variant="soft" icon={LuCalendarPlus} onClick={() => goTo("tournamentManager")}>Reserve</Button>} />
      </div>
      {live.length === 0 && (
        <div className="p-5">
          <EmptyState icon={LuCalendarDays} title="No dates reserved">Reserve dates for a hosting team in the tournament planner.</EmptyState>
        </div>
      )}
      <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
        {live.map((r) => (
          <PlanCard key={r.id} r={r} onMove={onMove} onCancel={onCancel} />
        ))}
      </ul>
      {old.length > 0 && (
        <div className="border-t border-ink-100">
          <button type="button" onClick={() => setShowOld(!showOld)} className="flex w-full items-center justify-between px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500 hover:bg-ink-50">
            Earlier and cancelled <span>{showOld ? "Hide" : `Show ${old.length}`}</span>
          </button>
          {showOld && (
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {old.map((r) => (
                <PlanCard key={r.id} r={r} onMove={onMove} onCancel={onCancel} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------- the day strip ---------------------------------------------- */

function DayStrip({ counts, today, onJump }) {
  const days = Array.from({ length: 14 }, (_, i) => add(today, i));
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Next fourteen days">
      {days.map((d) => {
        const n = counts.get(keyOf(d)) || 0;
        const isToday = sameDay(d, today);
        return (
          <button key={keyOf(d)} type="button" role="listitem" disabled={!n} onClick={() => onJump(keyOf(d))} className={cx("flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl px-2 py-2.5 ring-1 ring-inset transition", n ? "cursor-pointer bg-white ring-ink-200 hover:-translate-y-0.5 hover:shadow-raised" : "cursor-default bg-ink-50/70 ring-ink-100 opacity-60", isToday && "!bg-ink-950 !opacity-100 !ring-ink-950")}>
            <span className={cx("text-[10px] font-extrabold uppercase tracking-widest", isToday ? "text-spark-300" : "text-ink-400")}>{label3(d).slice(0, 3)}</span>
            <span className={cx("font-display text-2xl font-extrabold leading-none", isToday ? "text-white" : "text-ink-950")}>{d.getDate()}</span>
            <span className={cx("mt-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold", n ? "bg-spark-grad text-white" : "bg-transparent text-transparent")}>{n || 0}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------- the page ---------------------------------------------------- */

// The association's calendar: every match of every tournament by day, and the season plan (the hosting dates that
// are reserved, which can be moved or cancelled while the host has not created the tournament yet).
const AssociationSchedules = ({ goTo }) => {
  const today = useMemo(() => dayOf(new Date()), []);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [view, setView] = useState("upcoming");
  const [q, setQ] = useState("");
  const [moving, setMoving] = useState(null); // { id, host, startDate, days }
  const [cancelling, setCancelling] = useState(null); // { id, host, startDate, endDate, reason }
  const [busy, setBusy] = useState(false);
  const picked = useRef(false);

  const load = () =>
    associationApi
      .schedules({ tournamentId })
      .then((d) => {
        setData(d);
        // with nothing ahead, start on "All" so the page is not empty
        if (!picked.current && !d.fixtures.some((f) => f.status === "ongoing" || (f.status !== "completed" && dayOf(f.date) >= today))) setView("all");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, message) => {
    setBusy(true);
    setError("");
    setDone("");
    try {
      await fn();
      setDone(message);
      setMoving(null);
      setCancelling(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const tournaments = useMemo(() => {
    const seen = new Map();
    (data ? data.fixtures : []).forEach((f) => seen.set(f.tournamentId, f.tournament));
    return [...seen.entries()];
  }, [data]);

  const fixtures = data ? data.fixtures : [];
  const isLive = (f) => f.status === "ongoing";
  const isDone = (f) => f.status === "completed";
  const counts = useMemo(() => {
    const m = new Map();
    fixtures.filter((f) => !isDone(f)).forEach((f) => m.set(keyOf(dayOf(f.date)), (m.get(keyOf(dayOf(f.date))) || 0) + 1));
    return m;
  }, [fixtures]);

  const shown = useMemo(() => {
    const text = q.trim().toLowerCase();
    return fixtures.filter((f) => {
      const d = dayOf(f.date);
      const inView = view === "all" ? true : view === "live" ? isLive(f) : view === "done" ? isDone(f) : isLive(f) || (!isDone(f) && d >= today);
      return inView && (!text || `${f.team1} ${f.team2} ${f.venue} ${f.tournament}`.toLowerCase().includes(text));
    });
  }, [fixtures, view, q, today]);

  const days = useMemo(() => {
    const by = new Map();
    shown.forEach((f) => {
      const k = keyOf(dayOf(f.date));
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(f);
    });
    const list = [...by.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    list.forEach(([, items]) => items.sort((a, b) => String(a.time).localeCompare(String(b.time))));
    return view === "done" ? list.reverse() : list;
  }, [shown, view]);

  const next7 = [...counts.entries()].filter(([k]) => k >= keyOf(today) && k <= keyOf(add(today, 6))).reduce((n, [, c]) => n + c, 0);
  const liveNow = fixtures.filter(isLive).length;
  const waiting = data ? data.reservations.filter((r) => r.status === "pending").length : 0;

  const jump = (k) => {
    if (view !== "upcoming" && view !== "all") setView("upcoming");
    setTimeout(() => {
      const el = document.getElementById(`day-${k}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Association" title="Season schedule" subtitle="Every match of every tournament, and who is hosting when." />

      {error && <Alert tone="error" onClose={() => setError("")}>{error}</Alert>}
      {done && <Alert tone="success" onClose={() => setDone("")}>{done}</Alert>}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat label="Matches scheduled" value={fixtures.filter((f) => !isDone(f)).length} icon={LuSwords} tone="green" hint={`${fixtures.length} in all`} />
            <Stat label="Next 7 days" value={next7} icon={LuCalendarDays} tone="blue" hint="Matches coming up" />
            <Stat label="Live now" value={liveNow} icon={LuRadio} tone="red" hint={liveNow ? "Being scored" : "No match on"} />
            <Stat label="Hosts waiting" value={waiting} icon={LuCalendarClock} tone="amber" hint="Dates held, no tournament yet" />
          </div>

          <Card padded={false}>
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-400">The next two weeks</p>
              <DayStrip counts={counts} today={today} onJump={jump} />
            </div>
          </Card>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
            {/* the matches, day by day */}
            <section aria-label="Matches" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl bg-white p-1 shadow-card ring-1 ring-inset ring-ink-100" role="tablist">
                  {VIEWS.map(([id, name]) => (
                    <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => { picked.current = true; setView(id); }} className={cx("rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition", view === id ? "bg-ink-950 text-white shadow-sm" : "text-ink-500 hover:text-ink-900")}>
                      {name}
                      {id === "live" && liveNow > 0 && <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 align-middle" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <div className="relative min-w-[12rem] flex-1">
                  <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
                  <input aria-label="Search matches" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, venue or tournament" className={cx(field, "!pl-10")} />
                </div>
                <select aria-label="Tournament" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className={cx(field, "!w-auto min-w-[11rem]")}>
                  <option value="">All tournaments</option>
                  {tournaments.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {days.length === 0 && (
                <Card>
                  <EmptyState icon={LuCalendarDays} title="No matches here">{fixtures.length ? "Try another tab or clear the search." : "Matches appear once a host schedules a tournament."}</EmptyState>
                </Card>
              )}

              {days.map(([k, list]) => {
                const d = dayOf(k);
                const isToday = sameDay(d, today);
                return (
                  <div key={k} id={`day-${k}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
                    <div className={cx("flex items-center gap-4 px-5 py-3", isToday ? "bg-gradient-to-r from-ink-950 to-indigo-900 text-white" : "border-b border-ink-100 bg-ink-50/80")}>
                      <span className={cx("flex h-12 w-12 flex-col items-center justify-center rounded-xl", isToday ? "bg-spark-grad text-white shadow-glow" : "bg-ink-950 text-white")}>
                        <span className="font-display text-2xl font-extrabold leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cx("font-display text-2xl font-extrabold uppercase leading-none tracking-wide", isToday ? "text-white" : "text-ink-950")}>{dayName(d, today)}</p>
                        <p className={cx("mt-1 text-xs", isToday ? "text-ink-200" : "text-ink-500")}>
                          {label3(d)} {d.getFullYear()}
                        </p>
                      </div>
                      <Badge tone={isToday ? "spark" : "slate"}>
                        {list.length} match{list.length === 1 ? "" : "es"}
                      </Badge>
                    </div>
                    <ul className="divide-y divide-ink-100">
                      {list.map((f) => (
                        <MatchRow key={f.id} f={f} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>

            {/* the season plan */}
            <div className="xl:sticky xl:top-24">
              <SeasonPlan reservations={data.reservations} onMove={(r) => setMoving({ id: r.id, host: r.host, startDate: keyOf(dayOf(r.startDate)), days: Number(r.days) || 3 })} onCancel={(r) => setCancelling({ ...r, reason: "" })} goTo={goTo} />
            </div>
          </div>
        </>
      )}

      {moving && (
        <Dialog
          title="Move these dates"
          subtitle={`${moving.host || "The host"} will be told about the new dates.`}
          onClose={() => setMoving(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMoving(null)}>
                Close
              </Button>
              <Button busy={busy} onClick={() => act(() => associationApi.moveReservation(moving.id, { startDate: moving.startDate, reservedDays: moving.days }), "Moved. The hosting team has been told.")}>
                Save new dates
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={label} htmlFor="mv-start">
                New first day
              </label>
              <input id="mv-start" type="date" className={field} value={moving.startDate} onChange={(e) => setMoving({ ...moving, startDate: e.target.value })} required />
            </div>
            <div>
              <span className={label}>Days</span>
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} type="button" onClick={() => setMoving({ ...moving, days: n })} className={cx("h-11 rounded-xl text-sm font-extrabold ring-1 ring-inset transition", moving.days === n ? "bg-spark-grad text-white shadow-glow ring-transparent" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {moving.startDate && (
              <p className="rounded-xl bg-spark-50 px-4 py-3 text-sm font-semibold text-ink-900 ring-1 ring-inset ring-spark-200">{range(dayOf(moving.startDate), add(dayOf(moving.startDate), moving.days - 1))}</p>
            )}
          </div>
        </Dialog>
      )}

      {cancelling && (
        <Dialog
          title="Cancel these dates?"
          subtitle={`${cancelling.host || "The host"} · ${range(dayOf(cancelling.startDate), dayOf(cancelling.endDate))}`}
          onClose={() => setCancelling(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelling(null)}>
                Keep them
              </Button>
              <Button variant="danger" busy={busy} onClick={() => act(() => associationApi.cancelReservation(cancelling.id, cancelling.reason), "Cancelled. The hosting team has been told.")}>
                Cancel the dates
              </Button>
            </div>
          }
        >
          <label className={label} htmlFor="cx-reason">
            Reason (optional, the host will see it)
          </label>
          <textarea id="cx-reason" rows={3} className={field} value={cancelling.reason} onChange={(e) => setCancelling({ ...cancelling, reason: e.target.value })} placeholder="For example: the ground is not available" />
        </Dialog>
      )}
    </div>
  );
};

export default AssociationSchedules;
