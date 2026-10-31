import { useEffect, useState } from "react";
import { card } from "../ui/classes";

const base =
  "flex h-14 items-center justify-center rounded-xl text-xl font-bold shadow-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:h-16";

const RUN_STYLE = {
  0: "bg-slate-200 text-slate-800 hover:bg-slate-300",
  1: "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50",
  2: "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50",
  3: "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50",
  4: "bg-sky-600 text-white hover:bg-sky-700",
  5: "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50",
  6: "bg-violet-600 text-white hover:bg-violet-700",
};

const EXTRAS = [
  { id: "wide", short: "Wd", name: "Wide", hint: "Extra runs the batters ran besides the wide", options: [0, 1, 2, 3, 4] },
  { id: "no-ball", short: "Nb", name: "No-ball", hint: "Runs off the bat (the no-ball itself adds 1). The next ball is a free hit.", options: [0, 1, 2, 3, 4, 6] },
  { id: "bye", short: "Bye", name: "Bye", hint: "Byes run", options: [1, 2, 3, 4] },
  { id: "leg-bye", short: "Lb", name: "Leg-bye", hint: "Leg-byes run", options: [1, 2, 3, 4] },
];

/**
 * The scoring buttons. Runs are one tap. Wide / no-ball / bye / leg-bye are two taps (the type, then the runs).
 * Keys: 0-6 runs, W wicket, U undo, R redo, S swap ends.
 */
export default function ScorePad({ disabled, reason, freeHit, busy, canUndo, canRedo, onRun, onExtra, onWicket, onUndo, onRedo, onSwap, shortcuts }) {
  const [mode, setMode] = useState(null);
  const off = disabled || busy;
  const extra = EXTRAS.find((e) => e.id === mode);

  useEffect(() => {
    if (!shortcuts || off) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const k = e.key.toLowerCase();
      if (/^[0-6]$/.test(k)) onRun(Number(k));
      else if (k === "w") onWicket();
      else if (k === "u" && canUndo) onUndo();
      else if (k === "r" && canRedo) onRedo();
      else if (k === "s") onSwap();
      else if (k === "escape") setMode(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, off, canUndo, canRedo, onRun, onWicket, onUndo, onRedo, onSwap]);

  const chooseExtra = (n) => {
    onExtra(mode, n);
    setMode(null);
  };

  return (
    <section className={`${card} p-3 sm:p-4`} aria-label="Scoring pad">
      {freeHit && (
        <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-amber-900" role="status">
          Free hit — the batter cannot be bowled, caught, lbw or stumped
        </p>
      )}
      {reason && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm text-slate-600">{reason}</p>}

      {extra ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{extra.name}</h3>
            <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">{extra.hint}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {extra.options.map((n) => (
              <button key={n} type="button" disabled={off} onClick={() => chooseExtra(n)} className={`${base} bg-amber-100 text-amber-900 hover:bg-amber-200`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" disabled={off} onClick={() => onRun(n)} className={`${base} ${RUN_STYLE[n]}`} aria-label={`${n} run${n === 1 ? "" : "s"}`}>
                {n === 0 ? "•" : n}
              </button>
            ))}
            <button type="button" disabled={off} onClick={onWicket} className={`${base} bg-red-600 text-white hover:bg-red-700`}>
              OUT
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {EXTRAS.map((e) => (
              <button key={e.id} type="button" disabled={off} onClick={() => setMode(e.id)} className={`${base} h-12 bg-amber-100 text-base text-amber-900 hover:bg-amber-200 sm:h-14`}>
                {e.short}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <button type="button" disabled={busy || !canUndo} onClick={onUndo} className="rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          ↶ Undo
        </button>
        <button type="button" disabled={busy || !canRedo} onClick={onRedo} className="rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          ↷ Redo
        </button>
        <button type="button" disabled={off} onClick={onSwap} className="rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          ⇄ Swap ends
        </button>
      </div>
      <p className="mt-2 hidden text-center text-xs text-slate-400 lg:block">Keys: 0-6 runs · W out · U undo · R redo · S swap ends</p>
    </section>
  );
}
