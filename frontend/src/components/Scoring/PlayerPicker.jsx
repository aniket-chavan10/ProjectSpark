import { useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import Modal from "./Modal";
import { field } from "../ui/classes";
import { PlayerAvatar } from "../ui/kit";

/**
 * Choose one player. `sections` groups them: [{ label, players: [{ id, name, note, blocked, photo }] }].
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
        <div className="relative mb-4">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" placeholder="Search a player" value={query} onChange={(e) => setQuery(e.target.value)} className={`${field} pl-9`} autoFocus />
        </div>
      )}
      {total === 0 && <p className="py-6 text-center text-sm text-slate-500">Nobody is available to choose.</p>}
      {shown.map((s) => (
        <div key={s.label} className="mb-5 last:mb-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.players.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!!p.blocked || busy}
                  onClick={() => onPick(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-emerald-500 hover:bg-emerald-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 disabled:hover:border-slate-200"
                >
                  <PlayerAvatar name={p.name} photo={p.photo} id={p.id} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{p.name}</span>
                    {(p.blocked || p.note) && <span className={`block truncate text-xs ${p.blocked ? "text-red-600" : "text-slate-500"}`}>{p.blocked || p.note}</span>}
                  </span>
                  {p.badge && <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{p.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Modal>
  );
}
