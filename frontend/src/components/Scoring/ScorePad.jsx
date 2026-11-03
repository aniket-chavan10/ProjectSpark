import { useEffect, useState } from "react";
import { LuArrowLeftRight, LuRedo2, LuUndo2, LuX } from "react-icons/lu";
import { Kbd } from "../ui/kit";

const base =
  "relative flex h-[clamp(4.5rem,10.5vh,8.5rem)] select-none items-center justify-center overflow-hidden rounded-2xl font-display text-4xl font-extrabold transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100";

// A dot is quiet, singles are plain, a four and a six look like they do on TV, the wicket is red.
const PLAIN = "bg-white/[0.08] text-white ring-1 ring-inset ring-white/15 hover:bg-white/[0.14]";
const RUN_STYLE = {
  0: "bg-ink-950/60 text-ink-300 ring-1 ring-inset ring-white/10 hover:bg-ink-950",
  1: PLAIN,
  2: PLAIN,
  3: PLAIN,
  4: "bg-gradient-to-br from-volt-400 to-blue-600 text-white shadow-glow-volt hover:brightness-110",
  5: PLAIN,
  6: "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-[0_10px_30px_-8px_rgba(192,38,211,.7)] hover:brightness-110",
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
  <button type="button" {...rest} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-3 text-sm font-bold text-ink-100 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
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
    <section className="rounded-3xl bg-ink-900/70 p-4 ring-1 ring-inset ring-white/10 backdrop-blur sm:p-5" aria-label="Scoring pad">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-ink-300">Score the ball</h2>
        {busy && <span className="text-[11px] font-bold uppercase tracking-widest text-spark-300">Saving…</span>}
      </div>
      {freeHit && (
        <p className="run-stripes mb-3 rounded-xl bg-spark-grad px-3 py-2.5 text-center text-sm font-extrabold uppercase tracking-wider text-white shadow-glow" role="status">
          Free hit · the batter cannot be bowled, caught, lbw or stumped
        </p>
      )}
      {reason && <p className="mb-3 rounded-xl bg-amber-400/15 px-3 py-2.5 text-center text-sm font-semibold text-amber-200 ring-1 ring-inset ring-amber-400/30">{reason}</p>}

      {extra ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">{extra.name}: how many runs?</h3>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-ink-300 hover:bg-white/10 hover:text-white" onClick={() => setMode(null)}>
              <LuX className="h-4 w-4" /> Cancel
            </button>
          </div>
          <p className="mb-4 text-xs text-ink-300">{extra.hint}</p>
          {(extra.groups || [{ label: null, as: null, options: extra.options }]).map((g) => (
            <div key={g.label || "all"} className="mb-2 last:mb-0">
              {g.label && <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400">{g.label}</p>}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {g.options.map((n) => (
                  <button key={n} type="button" disabled={off} onClick={() => chooseExtra(n, g.as)} className={`${base} !h-14 bg-amber-400/15 text-amber-100 ring-1 ring-inset ring-amber-400/40 hover:bg-amber-400/25`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" disabled={off} onClick={() => onRun(n)} className={`${base} ${RUN_STYLE[n]}`} aria-label={`${n} run${n === 1 ? "" : "s"}`}>
                {n === 0 ? "•" : n}
                {(n === 4 || n === 6) && <span className="absolute bottom-1.5 text-[9px] font-sans font-extrabold uppercase tracking-[0.25em] opacity-80">{n === 4 ? "Four" : "Six"}</span>}
              </button>
            ))}
            <button type="button" disabled={off} onClick={onWicket} className={`${base} bg-gradient-to-br from-red-500 to-rose-700 text-3xl tracking-widest text-white shadow-[0_10px_30px_-8px_rgba(239,68,68,.75)] hover:brightness-110`}>
              OUT
            </button>
          </div>
          <p className="mb-2 mt-5 px-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink-400">Extras</p>
          <div className="grid grid-cols-4 gap-3">
            {EXTRAS.map((e) => (
              <button key={e.id} type="button" disabled={off} onClick={() => setMode(e.id)} className={`${base} !h-14 bg-amber-400/10 !font-sans !text-sm !font-extrabold uppercase tracking-wider text-amber-200 ring-1 ring-inset ring-amber-400/30 hover:bg-amber-400/20`}>
                {e.short}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
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
      <p className="mt-4 hidden flex-wrap items-center justify-center gap-2 text-xs text-ink-400 lg:flex [&_kbd]:border-white/15 [&_kbd]:bg-white/10 [&_kbd]:text-ink-100 [&_kbd]:shadow-none">
        <Kbd>0</Kbd>–<Kbd>6</Kbd> runs <Kbd>W</Kbd> out <Kbd>U</Kbd> undo <Kbd>R</Kbd> redo <Kbd>S</Kbd> swap ends
      </p>
    </section>
  );
}
