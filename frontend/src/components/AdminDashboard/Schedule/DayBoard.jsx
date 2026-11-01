import React, { useEffect, useMemo, useState } from "react";
import { btn, card, field, label, stageName, stageStyle } from "../../ui/classes";
import { clock, dayLabel, defaultDuration, durationText, endTime } from "./timeUtils";

const sortBySlot = (a, b) => (a.slot.start_time || "").localeCompare(b.slot.start_time || "") || a.fixture.match_no - b.fixture.match_no;

function Editor({ fixture, slot, days, onChange, onDone }) {
  const dates = days.includes(slot.match_date) ? days : [slot.match_date, ...days].filter(Boolean);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-5">
      <div className="col-span-2 sm:col-span-1">
        <label className={label} htmlFor={`day-${fixture.match_no}`}>
          Day
        </label>
        <select id={`day-${fixture.match_no}`} className={field} value={slot.match_date || ""} onChange={(e) => onChange({ match_date: e.target.value })}>
          {dates.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor={`start-${fixture.match_no}`}>
          Starts
        </label>
        <input id={`start-${fixture.match_no}`} type="time" step="300" className={field} value={slot.start_time || ""} onChange={(e) => onChange({ start_time: e.target.value })} />
      </div>
      <div>
        <label className={label} htmlFor={`overs-${fixture.match_no}`}>
          Overs
        </label>
        <input
          id={`overs-${fixture.match_no}`}
          type="number"
          min="1"
          max="50"
          className={field}
          value={slot.overs ?? ""}
          onChange={(e) => {
            const overs = e.target.value === "" ? "" : Number(e.target.value);
            onChange({ overs, ...(overs ? { duration_minutes: defaultDuration(overs) } : {}) });
          }}
        />
      </div>
      <div>
        <label className={label} htmlFor={`dur-${fixture.match_no}`}>
          Length (min)
        </label>
        <input id={`dur-${fixture.match_no}`} type="number" min="5" max="600" step="5" className={field} value={slot.duration_minutes ?? ""} onChange={(e) => onChange({ duration_minutes: e.target.value === "" ? "" : Number(e.target.value) })} />
      </div>
      <div className="flex items-end">
        <button type="button" className={btn.secondary} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ fixture, slot, teams, issues, editing, onEdit, days, onSlot, readOnly, action, highlight }) {
  const hasError = issues.some((i) => i.level === "error");
  const border = hasError ? "border-l-red-500" : issues.length ? "border-l-amber-400" : "border-l-transparent";
  const end = endTime(slot.start_time, slot.duration_minutes);
  return (
    <li id={`match-row-${fixture.match_no}`} className={`border-l-4 px-3 py-3 sm:px-4 ${border} ${highlight ? "bg-emerald-50" : ""}`}>
      <div className="flex gap-3">
        <div className="w-[5.5rem] shrink-0">
          <div className="text-sm font-semibold text-slate-900">{clock(slot.start_time) || "—"}</div>
          <div className="text-xs text-slate-500">{end ? `to ${clock(end)}` : ""}</div>
          {slot.duration_minutes ? <div className="text-xs text-slate-400">{durationText(Number(slot.duration_minutes))}</div> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${stageStyle[fixture.stage] || stageStyle.group}`}>{fixture.label || stageName[fixture.stage]}</span>
            <span className="text-slate-400">Match {fixture.match_no}</span>
            {slot.overs ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{slot.overs} overs</span> : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span className={teams[0].known ? "font-semibold text-slate-900" : "text-slate-500"}>{teams[0].text}</span>
            <span className="text-xs font-semibold text-slate-400">vs</span>
            <span className={teams[1].known ? "font-semibold text-slate-900" : "text-slate-500"}>{teams[1].text}</span>
          </div>
          {issues.map((i, k) => (
            <p key={k} className={`mt-1.5 text-xs ${i.level === "error" ? "text-red-600" : "text-amber-700"}`}>
              {i.level === "error" ? "Fix: " : "Check: "}
              {i.message}
            </p>
          ))}
        </div>
        <div className="shrink-0">
          {readOnly ? action : (
            <button type="button" className={btn.ghost} onClick={onEdit} aria-expanded={editing}>
              {editing ? "Close" : "Edit"}
            </button>
          )}
        </div>
      </div>
      {editing && !readOnly && <Editor fixture={fixture} slot={slot} days={days} onChange={(patch) => onSlot(fixture.match_no, patch)} onDone={onEdit} />}
    </li>
  );
}

/**
 * The schedule, one tab per day, matches in time order. Used for editing (Edit on every row)
 * and, with readOnly, for showing the saved schedule (an optional `renderAction` per row).
 */
export default function DayBoard({ days, fixtures, slots, teamsOf, problems = [], onSlot, readOnly = false, renderAction, focus }) {
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);

  const rows = useMemo(
    () => fixtures.map((fixture) => ({ fixture, slot: slots[fixture.match_no] || {} })),
    [fixtures, slots]
  );

  const issuesByMatch = useMemo(() => {
    const out = {};
    problems.forEach((p) => (out[p.matchNo] ||= []).push(p));
    return out;
  }, [problems]);

  // tabs: the tournament days, then a catch-all for anything outside them or without a time
  const outside = rows.filter((r) => !r.slot.match_date || !days.includes(r.slot.match_date));
  const tabs = [...days.map((d) => ({ id: d, name: dayLabel(d) })), ...(outside.length ? [{ id: "outside", name: "Outside the days" }] : [])];
  const current = tabs.find((t) => t.id === active) ? active : tabs[0]?.id;
  const shown = (current === "outside" ? outside : rows.filter((r) => r.slot.match_date === current)).sort(sortBySlot);

  // jump to a match when a problem is clicked
  useEffect(() => {
    if (!focus) return;
    const row = rows.find((r) => r.fixture.match_no === focus.matchNo);
    if (!row) return;
    setActive(row.slot.match_date && days.includes(row.slot.match_date) ? row.slot.match_date : "outside");
    setTimeout(() => document.getElementById(`match-row-${focus.matchNo}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutesOf = (list) => list.reduce((a, r) => a + (Number(r.slot.duration_minutes) || 0), 0);

  return (
    <div className={card}>
      <div role="tablist" aria-label="Days" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 pt-2">
        {tabs.map((t) => {
          const list = t.id === "outside" ? outside : rows.filter((r) => r.slot.match_date === t.id);
          const on = t.id === current;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setActive(t.id)}
              className={`shrink-0 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                on ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
              } ${t.id === "outside" ? "text-red-600" : ""}`}
            >
              {t.name}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{list.length}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
        <span>{shown.length ? `${shown.length} matches · ${durationText(minutesOf(shown))} of play` : "No matches on this day"}</span>
        {shown.length > 0 && shown[0].slot.start_time && (
          <span>
            {clock(shown[0].slot.start_time)} – {clock(endTime(shown.at(-1).slot.start_time, shown.at(-1).slot.duration_minutes))}
          </span>
        )}
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {shown.map(({ fixture, slot }) => (
          <Row
            key={fixture.match_no}
            fixture={fixture}
            slot={slot}
            teams={teamsOf(fixture)}
            issues={issuesByMatch[fixture.match_no] || []}
            editing={editing === fixture.match_no}
            onEdit={() => setEditing(editing === fixture.match_no ? null : fixture.match_no)}
            days={days}
            onSlot={onSlot}
            readOnly={readOnly}
            action={renderAction ? renderAction(fixture) : null}
            highlight={focus?.matchNo === fixture.match_no}
          />
        ))}
      </ul>
    </div>
  );
}
