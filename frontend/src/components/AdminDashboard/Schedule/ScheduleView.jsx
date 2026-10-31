import React, { useMemo } from "react";
import { card } from "../../ui/classes";
import DayBoard from "./DayBoard";
import { dayLabel } from "./timeUtils";

/**
 * The saved schedule, read-only, one tab per day. `matches` are the rows of /scheduled-matches.
 * `renderAction(match)` can add a button per match (for example "Start").
 */
export default function ScheduleView({ matches, renderAction }) {
  const { fixtures, slots, days, byNo } = useMemo(() => {
    const rows = [...matches].sort((a, b) => a.match_no - b.match_no);
    const byId = Object.fromEntries(rows.map((m) => [m.id, m]));
    const lastRound = {};
    rows.filter((m) => m.stage === "group").forEach((m) => (lastRound[m.group_name] = Math.max(lastRound[m.group_name] || 0, m.round_number)));
    const groupOfFinal = Object.fromEntries(rows.filter((m) => m.stage === "group" && m.round_number === lastRound[m.group_name]).map((m) => [m.id, m.group_name]));
    let semiIndex = 0;

    const slotText = (m, side) => {
      const name = m[`team${side}_name`];
      if (name) return { text: name, known: true };
      const depId = m[`dependent_match${side}_id`];
      const dep = byId[depId];
      if (!dep) return { text: "TBD", known: false };
      if (m[`dependent_match${side}_type`] !== "loser" && groupOfFinal[depId]) return { text: `Group ${groupOfFinal[depId]} winner`, known: false };
      return { text: `${m[`dependent_match${side}_type`] === "loser" ? "Loser" : "Winner"} of Match ${dep.match_no}`, known: false };
    };

    const fx = rows.map((m) => {
      let label;
      if (m.stage === "semi") label = `Semi-final ${++semiIndex}`;
      else if (m.stage === "third_place") label = "Third place";
      else if (m.stage === "final") label = "Final";
      else label = m.round_number === lastRound[m.group_name] ? `Group ${m.group_name} final` : `Group ${m.group_name} · Round ${m.round_number}`;
      return { ...m, stage: m.stage || "group", label, _teams: [slotText(m, 1), slotText(m, 2)] };
    });
    const sl = Object.fromEntries(rows.map((m) => [m.match_no, { match_date: m.match_date_str, start_time: m.start_time_str, duration_minutes: m.duration_minutes, overs: m.overs }]));
    const ds = [...new Set(rows.map((m) => m.match_date_str).filter(Boolean))].sort();
    return { fixtures: fx, slots: sl, days: ds, byNo: Object.fromEntries(fx.map((f) => [f.match_no, f])) };
  }, [matches]);

  if (!matches.length) return <div className={`${card} p-8 text-center text-sm text-slate-500`}>No matches have been scheduled yet.</div>;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        {fixtures.length} matches on {days.map(dayLabel).join(", ")}
      </p>
      <DayBoard days={days} fixtures={fixtures} slots={slots} teamsOf={(f) => byNo[f.match_no]._teams} readOnly renderAction={renderAction ? (f) => renderAction(byNo[f.match_no]) : undefined} />
    </div>
  );
}
