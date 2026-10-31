import { ballsLeft, projectedScore, runsNeeded, sides, teamCode, teamColor } from "./scoreUtils";

const Stat = ({ label, value, sub }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="truncate text-lg font-bold text-white">{value}</div>
    {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
  </div>
);

/** The big scoreboard at the top of the dashboard. */
export default function ScoreHero({ sb, inning }) {
  const { batting, bowling } = sides(sb, inning);
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const projected = projectedScore(sb, inning);
  const color = teamColor(batting.id);

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg" aria-label="Score">
      <div className="h-1.5" style={{ background: color }} />
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-extrabold" style={{ background: color }}>
            {teamCode(batting.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-300">
              {batting.name} · {inning.inningsNumber === 1 ? "1st" : "2nd"} innings · vs {bowling.name}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <span className="text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
                {inning.totalRuns}
                <span className="text-slate-400">/{inning.wickets}</span>
              </span>
              <span className="text-xl font-semibold tabular-nums text-slate-300">
                {inning.overs} <span className="text-sm text-slate-500">/ {sb.maxOvers} ov</span>
              </span>
              {inning.freeHit && <span className="animate-pulse rounded bg-amber-400 px-2 py-0.5 text-xs font-extrabold uppercase text-slate-900">Free hit</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
          <Stat label="Run rate" value={inning.runRate ? inning.runRate.toFixed(2) : "0.00"} sub={projected && !chase ? `Projected ${projected}` : undefined} />
          {chase ? (
            <Stat label="Target" value={inning.targetScore} sub={sb.status === "completed" ? (need === 0 ? "Reached" : `Fell ${need} short`) : need === 0 ? "Reached" : `Need ${need} off ${left}`} />
          ) : (
            <Stat label="Partnership" value={inning.partnershipRuns} sub={`${inning.extrasBreakdown?.total ?? 0} extras`} />
          )}
          {chase ? <Stat label="Required rate" value={sb.status === "completed" ? "—" : inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} sub={sb.status === "completed" ? undefined : `${left} balls left`} /> : <Stat label="Wickets left" value={inning.wicketsLeft} sub={`Out of ${inning.maxWickets}`} />}
          <Stat label="Last wicket" value={inning.lastWicket ? inning.lastWicket.playerOutName || "—" : "—"} sub={inning.lastWicket ? `${inning.lastWicket.description || ""} · ${inning.lastWicket.over || ""}` : undefined} />
        </div>
      </div>
    </section>
  );
}
