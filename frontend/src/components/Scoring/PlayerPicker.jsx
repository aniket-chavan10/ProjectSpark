import { useMemo, useState } from "react";
import Modal from "./Modal";
import { field } from "../ui/classes";

/**
 * Choose one player. `sections` groups them: [{ label, players: [{ id, name, note, blocked }] }].
 * A blocked player is shown greyed with the reason. `locked` forces a choice (no way to close it).
 */
export default function PlayerPicker({ title, subtitle, sections, onPick, onClose, locked = false, footer, busy = false }) {
  const [query, setQuery] = useState("");
  const total = sections.reduce((n, s) => n + s.players.length, 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.map((s) => ({ ...s, players: s.players.filter((p) => !q || p.name.toLowerCase().includes(q)) })).filter((s) => s.players.length);
  }, [sections, query]);

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} locked={locked} footer={footer}>
      {total > 7 && (
        <input type="search" placeholder="Search a player" value={query} onChange={(e) => setQuery(e.target.value)} className={`${field} mb-4`} autoFocus />
      )}
      {total === 0 && <p className="py-6 text-center text-sm text-slate-500">Nobody is available to choose.</p>}
      {shown.map((s) => (
        <div key={s.label} className="mb-4 last:mb-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.players.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!!p.blocked || busy}
                  onClick={() => onPick(p.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 disabled:hover:border-slate-200"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{p.name}</span>
                    {(p.blocked || p.note) && <span className={`block truncate text-xs ${p.blocked ? "text-red-600" : "text-slate-500"}`}>{p.blocked || p.note}</span>}
                  </span>
                  {p.badge && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{p.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Modal>
  );
}
