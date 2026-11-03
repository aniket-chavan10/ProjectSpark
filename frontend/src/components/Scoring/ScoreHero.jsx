import { LuTarget } from "react-icons/lu";
import { cx, TeamLogo } from "../ui/kit";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode, teamColor } from "./scoreUtils";

export const CHIP = {
  dot: "bg-white/[0.06] text-ink-300 ring-1 ring-inset ring-white/15",
  run: "bg-white text-ink-950",
  four: "bg-gradient-to-br from-volt-400 to-blue-600 text-white shadow-glow-volt",
  six: "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-[0_8px_20px_-6px_rgba(192,38,211,.7)]",
  wicket: "bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,.7)]",
  extra: "bg-amber-400 text-amber-950",
};

const Metric = ({ label, value, sub, accent }) => (
  <div className="min-w-0 px-5 py-3">
    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400">{label}</div>
    <div className={cx("tabular mt-0.5 truncate font-display text-[34px] font-extrabold leading-none tracking-wide", accent || "text-white")}>{value}</div>
    {sub && <div className="mt-1 truncate text-xs font-medium text-ink-300">{sub}</div>}
  </div>
);

/** The broadcast-style score strip across the top of the console: team, score, this over, the state of the game. */
export default function ScoreHero({ sb, inning }) {
  const { batting, bowling } = sides(sb, inning);
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const projected = projectedScore(sb, inning);
  const color = teamColor(batting.id);
  const chips = overChips(inning);
  const done = sb.status === "completed";
  const totalBalls = (sb.maxOvers || 0) * 6;
  const progress = chase ? Math.min(100, (inning.totalRuns / inning.targetScore) * 100) : totalBalls ? Math.min(100, ((inning.ballsBowled || 0) / totalBalls) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink-900 text-white shadow-pop ring-1 ring-white/10" aria-label="Score">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_30%_0%,rgba(255,255,255,.06),transparent_70%)]" aria-hidden="true" />
      <div className="relative flex flex-col xl:flex-row">
        {/* team slab */}
        <div className="relative flex shrink-0 items-center gap-4 overflow-hidden px-6 py-5 xl:w-[300px] xl:[clip-path:polygon(0_0,100%_0,calc(100%-34px)_100%,0_100%)] xl:pr-12" style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
          <div className="run-stripes absolute inset-0 opacity-50" aria-hidden="true" />
          <TeamLogo team={batting} size={72} className="relative ring-4 ring-white/30" />
          <div className="relative min-w-0">
            <p className="font-display text-5xl font-extrabold uppercase leading-none tracking-wide">{teamCode(batting.name)}</p>
            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.18em] text-white/80">{inning.inningsNumber === 1 ? "1st" : "2nd"} innings</p>
          </div>
        </div>

        {/* score */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5 xl:px-8">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-ink-300">
              {batting.name} <span className="text-ink-500">v</span> {bowling.name}
            </p>
            <div className="flex items-baseline gap-4">
              <span className="tabular font-display text-[84px] font-extrabold leading-[0.9] tracking-tight">
                {inning.totalRuns}
                <span className="text-ink-400">/{inning.wickets}</span>
              </span>
              <span className="tabular font-display text-3xl font-bold text-ink-100">
                {inning.overs}
                <span className="ml-1 text-lg text-ink-400">/ {sb.maxOvers} ov</span>
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400">{inning.currentBowler ? "This over" : "Last over"}</span>
              {inning.freeHit && <span className="animate-pulse rounded-md bg-spark-grad px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-glow">Free hit</span>}
            </div>
            <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5" aria-label={inning.currentBowler ? "This over" : "Last over"}>
              {chips.length === 0 && <span className="text-sm text-ink-500">—</span>}
              {chips.map((c, i) => (
                <span key={i} className={cx("flex h-10 min-w-10 animate-pop-in items-center justify-center rounded-full px-2 font-display text-lg font-extrabold", CHIP[c.kind])}>
                  {c.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* the state of the game */}
        <div className="grid shrink-0 grid-cols-2 divide-x divide-white/10 border-t border-white/10 sm:grid-cols-4 xl:w-[560px] xl:border-l xl:border-t-0 2xl:w-[640px]">
          <Metric label="Run rate" value={inning.runRate ? inning.runRate.toFixed(2) : "0.00"} sub={projected && !chase ? `Projected ${projected}` : `${inning.extrasBreakdown?.total ?? 0} extras`} />
          {chase ? (
            <Metric label="Target" value={inning.targetScore} accent={need === 0 ? "text-green-400" : "text-spark-300"} sub={done ? (need === 0 ? "Reached" : `Fell ${need} short`) : need === 0 ? "Reached" : `Need ${need} off ${left}`} />
          ) : (
            <Metric label="Partnership" value={inning.partnershipRuns} sub={`${inning.wicketsLeft} wickets left`} />
          )}
          {chase ? <Metric label="Req. rate" value={done ? "—" : inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} sub={done ? undefined : `${left} balls left`} /> : <Metric label="Wickets left" value={inning.wicketsLeft} sub={`Out of ${inning.maxWickets}`} />}
          <Metric label="Last wicket" value={<span className="text-xl">{inning.lastWicket ? inning.lastWicket.playerOutName || "—" : "—"}</span>} sub={inning.lastWicket ? `${inning.lastWicket.description || ""} ${inning.lastWicket.over ? `· ${inning.lastWicket.over}` : ""}` : undefined} />
        </div>
      </div>

      {/* chase / innings progress */}
      <div className="relative h-1.5 bg-white/5" aria-hidden="true">
        <div className="h-full bg-spark-grad transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </div>
      {chase && !done && need > 0 && (
        <div className="relative flex items-center gap-2 bg-white/[0.03] px-6 py-2.5 text-sm text-ink-200">
          <LuTarget className="h-4 w-4 text-spark-400" aria-hidden="true" />
          <span>
            <strong className="text-white">{batting.name}</strong> need <strong className="text-spark-300">{need}</strong> more from <strong className="text-white">{left}</strong> balls
          </span>
        </div>
      )}
    </section>
  );
}
