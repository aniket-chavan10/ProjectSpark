import { useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { cx, PlayerAvatar } from "../ui/kit";
import { ActionShell } from "./console";

/**
 * Choose one player, in the middle of the console (new batter, next bowler, who stayed at the crease).
 * `sections` groups them: [{ label, players: [{ id, name, note, badge, blocked, photo }] }]. A blocked player is shown
 * greyed with the reason. The first nine who can be chosen have a number: pressing it picks them.
 * With `onBack` the panel can be cancelled; without it the scorer has to choose (the match cannot go on without).
 */
export default function PickPanel({ title, subtitle, summary, sections, onPick, onBack, backLabel, footer, busy = false, tone = "accent" }) {
  const [query, setQuery] = useState("");
  const total = sections.reduce((n, s) => n + s.players.length, 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.map((s) => ({ ...s, players: s.players.filter((p) => !q || p.name.toLowerCase().includes(q)) })).filter((s) => s.players.length);
  }, [sections, query]);

  // the numbers, in the order they appear
  const numbered = useMemo(() => shown.flatMap((s) => s.players).filter((p) => !p.blocked), [shown]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || busy) return;
      const t = e.target;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "Escape" && onBack) onBack();
      else if (/^[1-9]$/.test(e.key) && numbered[Number(e.key) - 1]) onPick(numbered[Number(e.key) - 1].id);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <ActionShell tone={tone} title={title} subtitle={subtitle} summary={summary} onBack={onBack} backLabel={backLabel} footer={footer}>
      {total > 12 && (
        <div className="relative mb-3">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input type="search" placeholder="Search a player" value={query} onChange={(e) => setQuery(e.target.value)} className="block w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-spark-500 focus:outline-none focus:ring-1 focus:ring-spark-500" />
        </div>
      )}
      {total === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nobody is available to choose.</p>}
      {shown.map((s) => (
        <div key={s.label} className="mb-4 last:mb-0">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{s.label}</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {s.players.map((p) => {
              const n = numbered.findIndex((x) => x.id === p.id) + 1;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!!p.blocked || busy}
                    onClick={() => onPick(p.id)}
                    className={cx(
                      "flex h-[3.25rem] w-full items-center gap-2.5 rounded-lg border px-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500",
                      p.blocked ? "cursor-not-allowed border-zinc-800 bg-zinc-950/30 opacity-50" : "border-zinc-700 bg-zinc-800 hover:border-spark-500 hover:bg-zinc-700"
                    )}
                  >
                    <PlayerAvatar name={p.name} photo={p.photo} id={p.id} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-white">{p.name}</span>
                      {(p.blocked || p.note || p.badge) && <span className={cx("block truncate text-xs", p.blocked ? "text-red-400" : "text-zinc-400")}>{p.blocked || [p.badge, p.note].filter(Boolean).join(" · ")}</span>}
                    </span>
                    {n > 0 && n <= 9 && <kbd className="shrink-0 rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 ring-1 ring-inset ring-zinc-700">{n}</kbd>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </ActionShell>
  );
}
