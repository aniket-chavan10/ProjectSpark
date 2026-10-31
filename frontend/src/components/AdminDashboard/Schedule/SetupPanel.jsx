import React from "react";
import { btn, card, field, label } from "../../ui/classes";
import { dayLabel, defaultDuration, durationText } from "./timeUtils";

const Section = ({ title, hint, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    <div className="mt-3">{children}</div>
  </div>
);

/** Which group winners meet: pick the opponent of the first group's winner, the other two meet each other. */
function SemiPairs({ groupNames, semiPairs, onChange }) {
  if (groupNames.length !== 4) return null;
  const first = groupNames[0];
  const partner = (semiPairs.find((p) => p.includes(first)) || []).find((g) => g !== first);
  const choose = (g) => {
    const rest = groupNames.filter((n) => n !== first && n !== g);
    onChange([[first, g], rest]);
  };
  return (
    <div>
      <label className={label} htmlFor="semi-partner">
        Semi-finals
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span>Group {first} winner plays</span>
        <select id="semi-partner" className={`${field} !w-auto`} value={partner} onChange={(e) => choose(e.target.value)}>
          {groupNames
            .filter((g) => g !== first)
            .map((g) => (
              <option key={g} value={g}>
                Group {g} winner
              </option>
            ))}
        </select>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {semiPairs.map((p) => p.join(" v ")).join("   ·   ")} — change this any time before the group winners are known.
      </p>
    </div>
  );
}

export default function SetupPanel({
  plan,
  settings,
  onSettings,
  thirdPlaceMatch,
  onThirdPlace,
  semiPairs,
  onSemiPairs,
  groupNames,
  oversKeys,
  onAutoFill,
  building,
  hasSchedule,
  disabled,
}) {
  const set = (patch) => onSettings({ ...settings, ...patch });
  const toggleDay = (d) => {
    const days = settings.days.includes(d) ? settings.days.filter((x) => x !== d) : [...settings.days, d].sort();
    set({ days });
  };
  const setOvers = (key, value) => set({ overs: { ...settings.overs, [key]: value === "" ? "" : Math.max(1, Math.min(50, Number(value))) } });

  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="setup-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 id="setup-title" className="text-lg font-bold text-slate-900">
            1. Plan the days
          </h2>
          <p className="text-sm text-slate-500">Tell us when you can play and how long each match is. We fit the matches in for you.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Playing days">
          <div className="flex flex-wrap gap-2">
            {plan.days.map((d) => {
              const on = settings.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {dayLabel(d)}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Daily timing">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="day-start">
                First match
              </label>
              <input id="day-start" type="time" className={field} value={settings.dayStart} disabled={disabled} onChange={(e) => set({ dayStart: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="day-end">
                Last match ends
              </label>
              <input id="day-end" type="time" className={field} value={settings.dayEnd} disabled={disabled} onChange={(e) => set({ dayEnd: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="gap">
                Gap (min)
              </label>
              <input id="gap" type="number" min="0" max="60" className={field} value={settings.gapMinutes} disabled={disabled} onChange={(e) => set({ gapMinutes: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={settings.useBreak} disabled={disabled} onChange={(e) => set({ useBreak: e.target.checked })} />
                Lunch break
              </label>
            </div>
          </div>
          {settings.useBreak && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="break-start">
                  Break from
                </label>
                <input id="break-start" type="time" className={field} value={settings.breakStart} disabled={disabled} onChange={(e) => set({ breakStart: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="break-end">
                  Break to
                </label>
                <input id="break-end" type="time" className={field} value={settings.breakEnd} disabled={disabled} onChange={(e) => set({ breakEnd: e.target.value })} />
              </div>
            </div>
          )}
        </Section>

        <Section title="Overs per match" hint="The length of the slot follows the overs: 10 minutes an over plus 10 for the changeover. You can still change any single match later.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {oversKeys.map(({ key, name }) => (
              <div key={key}>
                <label className={label} htmlFor={`overs-${key}`}>
                  {name}
                </label>
                <div className="flex items-center gap-2">
                  <input id={`overs-${key}`} type="number" min="1" max="50" className={`${field} !w-20`} value={settings.overs[key] ?? ""} disabled={disabled} onChange={(e) => setOvers(key, e.target.value)} />
                  <span className="text-xs text-slate-500">{settings.overs[key] ? durationText(defaultDuration(settings.overs[key])) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Finals">
          <div className="space-y-4">
            <SemiPairs groupNames={groupNames} semiPairs={semiPairs} onChange={onSemiPairs} />
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={thirdPlaceMatch} disabled={disabled || groupNames.length !== 4} onChange={(e) => onThirdPlace(e.target.checked)} />
                <span>
                  <span className="font-medium">Play a third-place match</span>
                  <span className="block text-xs text-slate-500">
                    If you skip it, 3rd place goes to the semi-final loser who lost to the champion, and 4th to the other one.
                  </span>
                </span>
              </label>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={settings.restFriendly} disabled={disabled} onChange={(e) => set({ restFriendly: e.target.checked })} />
              <span>
                <span className="font-medium">Give winners a rest</span>
                <span className="block text-xs text-slate-500">Play a group&apos;s first-round matches together before its second round.</span>
              </span>
            </label>
          </div>
        </Section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button type="button" className={btn.primary} onClick={onAutoFill} disabled={disabled || building || !settings.days.length}>
          {building ? "Working…" : hasSchedule ? "Re-fill the schedule" : "Auto-fill the schedule"}
        </button>
        <p className="text-xs text-slate-500">
          {hasSchedule ? "Starts again from these settings and replaces the times below." : "Groups are played one after another, then the semi-finals and the final."}
        </p>
      </div>
    </section>
  );
}
