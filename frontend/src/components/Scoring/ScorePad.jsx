import { useEffect, useState } from "react";
import { LuArrowLeftRight, LuRedo2, LuUndo2, LuUserRoundX, LuX } from "react-icons/lu";
import { cx } from "../ui/kit";
import { Kbd } from "./console";

const EXTRAS = [
  { id: "wide", name: "Wide", key: "d", hint: "Wide: tap the extra runs the batters ran, 0 if none" },
  { id: "no-ball", name: "No-ball", key: "n", hint: "No-ball: tap what was run on top of it (a free hit follows)" },
  { id: "bye", name: "Bye", key: "b", hint: "Byes: tap the runs run" },
  { id: "leg-bye", name: "Leg-bye", key: "l", hint: "Leg-byes: tap the runs run" },
];

// which run buttons an armed extra accepts
const allowed = (mode, nbAs) => {
  if (mode === "wide") return [0, 1, 2, 3, 4];
  if (mode === "no-ball") return nbAs ? [1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
  return [1, 2, 3, 4];
};

const KEY_BASE =
  "relative flex select-none flex-col items-center justify-center rounded-lg border font-display font-bold leading-none transition-[transform,background-color] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100";
const RUN = {
  0: "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700",
  4: "border-sky-400 bg-sky-600 text-white hover:bg-sky-500",
  6: "border-violet-400 bg-violet-600 text-white hover:bg-violet-500",
};
const RUN_PLAIN = "border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700";
const ARMED = "border-amber-500/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25";

/**
 * The scoring buttons. Runs are one tap. Wide / no-ball / bye / leg-bye are two taps: the extra, then the runs,
 * and the run buttons stay where they are (they turn amber while an extra is waiting for its runs).
 * Keys: 0-6 runs, W out, D wide, N no-ball, B bye, L leg-bye, U undo, R redo, S swap ends, Esc cancel.
 */
export default function ScorePad({ disabled, reason, freeHit, busy, canUndo, canRedo, canRetire, onRun, onExtra, onWicket, onUndo, onRedo, onSwap, onRetire, shortcuts }) {
  const [mode, setMode] = useState(null);
  const [nbAs, setNbAs] = useState(null);
  const off = disabled || busy;
  const extra = EXTRAS.find((e) => e.id === mode);
  const ok = mode ? allowed(mode, nbAs) : null;

  useEffect(() => {
    if (disabled) setMode(null);
  }, [disabled]);

  const choose = (n) => {
    if (mode) {
      onExtra(mode, n, mode === "no-ball" ? nbAs : null);
      setMode(null);
      setNbAs(null);
    } else onRun(n);
  };
  const arm = (id) => {
    setMode((m) => (m === id ? null : id));
    setNbAs(null);
  };

  useEffect(() => {
    if (!shortcuts || off) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const k = e.key.toLowerCase();
      const ex = EXTRAS.find((x) => x.key === k);
      if (/^[0-6]$/.test(k)) {
        if (!ok || ok.includes(Number(k))) choose(Number(k));
      } else if (ex) arm(ex.id);
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
  }); // re-bound every render: it reads the armed extra

  const runButton = (n) => {
    const blocked = ok && !ok.includes(n);
    const style = ok ? ARMED : RUN[n] || RUN_PLAIN;
    return (
      <button key={n} type="button" disabled={off || blocked} onClick={() => choose(n)} className={cx(KEY_BASE, "text-[clamp(2rem,7.5vh,3.75rem)]", style)} aria-label={`${n} run${n === 1 ? "" : "s"}`}>
        {n}
        {!ok && (n === 4 || n === 6) && <span className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">{n === 4 ? "Four" : "Six"}</span>}
        {!ok && n === 0 && <span className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.22em] opacity-60">Dot</span>}
      </button>
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 p-3" aria-label="Scoring pad">
      <div className="flex h-6 shrink-0 items-center justify-between px-0.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Score the ball</h2>
        {busy && <span className="text-[11px] font-semibold uppercase tracking-wider text-spark-300">Saving…</span>}
      </div>

      {freeHit && !disabled && (
        <p className="shrink-0 rounded-md bg-spark-600 px-3 py-2 text-center text-[13px] font-bold uppercase tracking-wider text-white" role="status">
          Free hit · only a run out can dismiss the batter
        </p>
      )}
      {reason && <p className="shrink-0 rounded-md bg-amber-500/10 px-3 py-2 text-center text-[13px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-500/30">{reason}</p>}

      {extra && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-md bg-amber-500/10 px-3 py-2 ring-1 ring-inset ring-amber-500/40" role="status">
          <p className="min-w-0 flex-1 text-[13px] font-semibold text-amber-100">{extra.hint}</p>
          {extra.id === "no-ball" && (
            <div className="inline-flex rounded-md bg-zinc-950 p-0.5 ring-1 ring-inset ring-zinc-700" role="radiogroup" aria-label="Runs off a no-ball came from">
              {[
                [null, "Off the bat"],
                ["bye", "Byes"],
                ["leg-bye", "Leg-byes"],
              ].map(([v, label]) => (
                <button key={label} type="button" role="radio" aria-checked={nbAs === v} onClick={() => setNbAs(v)} className={cx("rounded px-2.5 py-1 text-[12px] font-semibold", nbAs === v ? "bg-amber-500 text-amber-950" : "text-zinc-300 hover:text-white")}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid min-h-[9rem] flex-1 grid-cols-4 grid-rows-2 gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map(runButton)}
        {mode ? (
          <button type="button" onClick={() => setMode(null)} className={cx(KEY_BASE, "gap-1 border-zinc-600 bg-zinc-800 text-base text-zinc-200 hover:bg-zinc-700")}>
            <LuX className="h-6 w-6" aria-hidden="true" />
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em]">Cancel</span>
          </button>
        ) : (
          <button type="button" disabled={off} onClick={onWicket} className={cx(KEY_BASE, "border-red-400 bg-red-600 text-[clamp(1.6rem,5.5vh,2.75rem)] tracking-wider text-white hover:bg-red-500")}>
            OUT
          </button>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2">
        {EXTRAS.map((e) => (
          <button
            key={e.id}
            type="button"
            disabled={off}
            aria-pressed={mode === e.id}
            onClick={() => arm(e.id)}
            className={cx("flex h-12 items-center justify-center gap-1.5 rounded-lg border text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500 disabled:cursor-not-allowed disabled:opacity-30", mode === e.id ? "border-amber-400 bg-amber-500 text-amber-950" : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20")}
          >
            {e.name}
            <span className="hidden text-[10px] font-bold uppercase opacity-60 xl:inline">{e.key}</span>
          </button>
        ))}
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2 border-t border-zinc-800 pt-2.5">
        {[
          { icon: LuUndo2, label: "Undo", on: onUndo, dis: busy || !canUndo },
          { icon: LuRedo2, label: "Redo", on: onRedo, dis: busy || !canRedo },
          { icon: LuArrowLeftRight, label: "Swap ends", on: onSwap, dis: off },
          { icon: LuUserRoundX, label: "Retire", on: onRetire, dis: off || !canRetire },
        ].map((t) => (
          <button key={t.label} type="button" disabled={t.dis} onClick={t.on} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-zinc-800 text-[13px] font-semibold text-zinc-200 ring-1 ring-inset ring-zinc-700 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <p className="hidden shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 2xl:flex">
        <span><Kbd>0</Kbd>–<Kbd>6</Kbd> runs</span>
        <span><Kbd>W</Kbd> out</span>
        <span><Kbd>D</Kbd> wide <Kbd>N</Kbd> no-ball <Kbd>B</Kbd> bye <Kbd>L</Kbd> leg-bye</span>
        <span><Kbd>U</Kbd> undo <Kbd>R</Kbd> redo <Kbd>S</Kbd> swap</span>
      </p>
    </section>
  );
}
