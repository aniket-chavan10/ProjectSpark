import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { publicApi } from "../../api/sparkApi";
import { Winner } from "./AwardsPage";

/**
 * The award ceremony: full screen, one award at a time, for the stage or a projector.
 * Space / → / click goes forward (nominees first, then the winner), ← goes back, Esc leaves.
 * A step is a [award, stage] pair: stage 0 = the title card, 1 and 2 = the nominees, 3 = the winner.
 */
export default function AwardShow() {
  const [params] = useSearchParams();
  const season = params.get("season") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [at, setAt] = useState(0);

  useEffect(() => {
    publicApi.awards(season).then(setData).catch((e) => setError(e.message));
  }, [season]);

  // the XI is shown as one board; every other award reveals nominees then the winner
  const steps = useMemo(() => {
    if (!data) return [];
    const list = [];
    const ordered = [...data.awards.filter((a) => a.tournamentId), ...data.awards.filter((a) => !a.tournamentId && a.key !== "xi_of_season")].concat(data.awards.filter((a) => a.key === "xi_of_season"));
    for (const a of ordered) {
      if (a.slots) {
        list.push({ a, stage: 0 }, { a, stage: 3 });
        continue;
      }
      const nominees = a.entries.filter((e) => e.rank !== 1).length;
      list.push({ a, stage: 0 });
      for (let i = 0; i < nominees; i += 1) list.push({ a, stage: i + 1 });
      list.push({ a, stage: 3 });
    }
    return list;
  }, [data]);

  const next = useCallback(() => setAt((i) => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const back = useCallback(() => setAt((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  const step = steps[at];
  const shell = "fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 text-center text-white";

  if (error) return <div className={shell}><p>{error}</p></div>;
  if (!data) return <div className={shell}><p className="text-slate-300">Loading the ceremony…</p></div>;
  if (!step) {
    return (
      <div className={shell}>
        <p className="text-lg text-slate-300">There are no published awards for this season.</p>
        <Link to="/awards" className="mt-4 text-amber-300 underline">Back to awards</Link>
      </div>
    );
  }

  const { a, stage } = step;
  const winner = a.entries.find((e) => e.rank === 1);
  const nominees = a.entries.filter((e) => e.rank !== 1).sort((x, y) => y.rank - x.rank);

  return (
    <div className={shell} onClick={next} role="presentation">
      <div className="absolute left-4 top-4 flex items-center gap-4 text-xs text-slate-400">
        <Link to="/awards" onClick={(e) => e.stopPropagation()} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Exit</Link>
        <span>
          {at + 1} / {steps.length} · Space or → to continue
        </span>
      </div>
      <p className="absolute right-4 top-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Season {data.season}</p>

      <AnimatePresence mode="wait">
        <motion.div key={`${a.key}-${a.tournamentId}-${stage}`} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="w-full max-w-5xl">
          {stage === 0 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-300">{a.tournament || "The association awards"}</p>
              <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl">{a.label}</h1>
              <p className="mt-6 text-5xl" aria-hidden="true">🏆</p>
            </>
          )}
          {stage >= 1 && stage <= 2 && nominees[stage - 1] && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">{a.label} · nominee</p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <Winner e={nominees[stage - 1]} size={140} />
                <h2 className="text-4xl font-extrabold sm:text-6xl">{nominees[stage - 1].name}</h2>
                {nominees[stage - 1].teamName && <p className="text-xl text-slate-300">{nominees[stage - 1].teamName}</p>}
                <p className="rounded-full bg-white/10 px-5 py-1.5 text-lg text-slate-200">{nominees[stage - 1].valueText}</p>
              </div>
            </>
          )}
          {stage === 3 && !a.slots && winner && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-300">And the winner is…</p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <span className="relative">
                  <Winner e={winner} size={190} />
                  <span className="absolute -right-3 -top-3 text-5xl" aria-hidden="true">🏆</span>
                </span>
                <h2 className="text-5xl font-extrabold text-amber-300 sm:text-7xl">{winner.name}</h2>
                {winner.teamName && <p className="text-2xl text-slate-200">{winner.teamName}</p>}
                <p className="rounded-full bg-amber-400/20 px-6 py-2 text-xl font-semibold text-amber-200">{winner.valueText}</p>
                <p className="text-sm text-slate-400">{a.label}</p>
              </div>
            </>
          )}
          {stage === 3 && a.slots && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-300">{a.label}</p>
              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
                {a.entries.map((e, i) => (
                  <motion.div key={e.subjectId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                    <Winner e={e} size={52} />
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold">{e.name}</span>
                      <span className="block truncate text-xs text-slate-300">{(e.valueText || "").split(" · ")[0]}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
