import { useEffect, useState } from "react";
import { LuArrowLeftRight, LuRedo2, LuUndo2, LuX } from "react-icons/lu";
import { Card, Kbd } from "../ui/kit";

const base =
  "flex h-16 select-none items-center justify-center rounded-2xl text-2xl font-bold transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 xl:h-[4.5rem]";

// Runs are neutral; a boundary is one step darker. Colour is kept for the wicket only.
const PLAIN = "bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50";
const RUN_STYLE = {
  0: "bg-slate-50 text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
  1: PLAIN,
  2: PLAIN,
  3: PLAIN,
  4: "bg-brand-100 text-brand-900 shadow-sm ring-1 ring-inset ring-brand-300 hover:bg-brand-200",
  5: PLAIN,
  6: "bg-ink-800 text-white shadow-sm hover:bg-ink-700",
};

const EXTRAS = [
  { id: "wide", short: "Wide", key: "Wd", name: "Wide", hint: "Extra runs the batters ran besides the wide", options: [0, 1, 2, 3, 4] },
  {
    id: "no-ball",
    short: "No-ball",
    key: "Nb",
    name: "No-ball",
    hint: "The no-ball itself adds 1 and the next ball is a free hit. Choose what the batters ran on top of it.",
    groups: [
      { label: "Off the bat", as: null, options: [0, 1, 2, 3, 4, 6] },
      { label: "Byes", as: "bye", options: [1, 2, 3, 4] },
      { label: "Leg-byes", as: "leg-bye", options: [1, 2, 3, 4] },
    ],
  },
  { id: "bye", short: "Bye", key: "B", name: "Bye", hint: "Byes run", options: [1, 2, 3, 4] },
  { id: "leg-bye", short: "Leg-bye", key: "Lb", name: "Leg-bye", hint: "Leg-byes run", options: [1, 2, 3, 4] },
];

const Tool = ({ icon: Icon, children, ...rest }) => (
  <button type="button" {...rest} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
    <Icon className="h-4 w-4" aria-hidden="true" />
    {children}
  </button>
);

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

  const chooseExtra = (n, as = null) => {
    onExtra(mode, n, as);
    setMode(null);
  };

  return (
    <Card className="!p-4" aria-label="Scoring pad">
      {freeHit && (
        <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide text-slate-800 ring-1 ring-inset ring-slate-300" role="status">
          Free hit: the batter cannot be bowled, caught, lbw or stumped
        </p>
      )}
      {reason && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm text-slate-600">{reason}</p>}

      {extra ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{extra.name}: how many runs?</h3>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={() => setMode(null)}>
              <LuX className="h-4 w-4" /> Cancel
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">{extra.hint}</p>
          {(extra.groups || [{ label: null, as: null, options: extra.options }]).map((g) => (
            <div key={g.label || "all"} className="mb-2 last:mb-0">
              {g.label && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {g.options.map((n) => (
                  <button key={n} type="button" disabled={off} onClick={() => chooseExtra(n, g.as)} className={`${base} !h-14 bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2.5">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" disabled={off} onClick={() => onRun(n)} className={`${base} ${RUN_STYLE[n]}`} aria-label={`${n} run${n === 1 ? "" : "s"}`}>
                {n === 0 ? "•" : n}
              </button>
            ))}
            <button type="button" disabled={off} onClick={onWicket} className={`${base} bg-white text-xl tracking-wide text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50`}>
              OUT
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2.5">
            {EXTRAS.map((e) => (
              <button key={e.id} type="button" disabled={off} onClick={() => setMode(e.id)} className={`${base} !h-12 bg-slate-50 !text-sm text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 xl:!h-14`}>
                {e.short}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
        <Tool icon={LuUndo2} disabled={busy || !canUndo} onClick={onUndo}>
          Undo
        </Tool>
        <Tool icon={LuRedo2} disabled={busy || !canRedo} onClick={onRedo}>
          Redo
        </Tool>
        <Tool icon={LuArrowLeftRight} disabled={off} onClick={onSwap}>
          Swap ends
        </Tool>
      </div>
      <p className="mt-3 hidden items-center justify-center gap-2 text-xs text-slate-400 lg:flex">
        <Kbd>0</Kbd>–<Kbd>6</Kbd> runs <Kbd>W</Kbd> out <Kbd>U</Kbd> undo <Kbd>R</Kbd> redo <Kbd>S</Kbd> swap ends
      </p>
    </Card>
  );
}
