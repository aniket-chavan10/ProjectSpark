import React, { useState } from "react";
import { btn, card } from "../../ui/classes";

const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Who plays whom in the first round. Tap a team, then tap another to swap them.
 * The pairs are 1 v 2, 3 v 4 ... in the order of the group; later rounds follow from the winners.
 */
export default function GroupDraw({ groups, onChange, disabled }) {
  const [picked, setPicked] = useState(null); // { group, index }

  const swap = (groupName, a, b) => {
    onChange(
      groups.map((g) => {
        if (g.group_name !== groupName) return g;
        const teams = [...g.teams];
        [teams[a], teams[b]] = [teams[b], teams[a]];
        return { ...g, teams };
      })
    );
  };

  const tap = (groupName, index) => {
    if (disabled) return;
    if (!picked || picked.group !== groupName) return setPicked({ group: groupName, index });
    if (picked.index !== index) swap(groupName, picked.index, index);
    setPicked(null);
  };

  const shuffleGroup = (groupName) => onChange(groups.map((g) => (g.group_name === groupName ? { ...g, teams: shuffled(g.teams) } : g)));

  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="draw-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="draw-title" className="text-lg font-bold text-slate-900">
            2. First-round pairs
          </h2>
          <p className="text-sm text-slate-500">Tap a team, then tap another to swap them. The winners of each pair meet in the next round.</p>
        </div>
        <button type="button" className={btn.secondary} disabled={disabled} onClick={() => onChange(groups.map((g) => ({ ...g, teams: shuffled(g.teams) })))}>
          Shuffle all groups
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => (
          <div key={g.group_name} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Group {g.group_name}</h3>
              <button type="button" className={btn.ghost} disabled={disabled} onClick={() => shuffleGroup(g.group_name)}>
                Shuffle
              </button>
            </div>
            <ol className="space-y-2">
              {Array.from({ length: Math.floor(g.teams.length / 2) }, (_, p) => (
                <li key={p} className="rounded-md bg-white p-1.5 ring-1 ring-slate-200">
                  {[2 * p, 2 * p + 1].map((i, k) => {
                    const t = g.teams[i];
                    const on = picked && picked.group === g.group_name && picked.index === i;
                    return (
                      <React.Fragment key={i}>
                        {k === 1 && <div className="px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">vs</div>}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => tap(g.group_name, i)}
                          aria-pressed={!!on}
                          className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm transition ${
                            on ? "bg-emerald-600 font-semibold text-white" : "text-slate-800 hover:bg-emerald-50"
                          }`}
                        >
                          {t ? t.name : "—"}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
