import { cx, TeamLogo } from "../ui/kit";
import { BallChip } from "./console";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode, teamColor } from "./scoreUtils";

const Stat = ({ label, value, sub, tone }) => (
  <div className="min-w-0 px-4">
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</div>
    <div className={cx("tabular truncate font-display text-[28px] font-bold leading-none", tone || "text-white")}>{value}</div>
    {sub && <div className="mt-0.5 truncate text-[11px] text-zinc-400">{sub}</div>}
  </div>
);

/** The score across the top of the console: team, score, the figures that matter, and this over. One row. */
export default function ScoreHero({ sb, inning }) {
  const { batting, bowling } = sides(sb, inning);
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const projected = projectedScore(sb, inning);
  const chips = overChips(inning);
  const done = sb.status === "completed";
  const totalBalls = (sb.maxOvers || 0) * 6;
  const progress = chase ? Math.min(100, (inning.totalRuns / inning.targetScore) * 100) : totalBalls ? Math.min(100, ((inning.ballsBowled || 0) / totalBalls) * 100) : 0;

  return (
    <section className="shrink-0 border-b border-zinc-800 bg-zinc-900" aria-label="Score">
      <div className="flex min-h-[4.75rem] flex-wrap items-center gap-y-2 py-2">
        <div className="flex shrink-0 items-center gap-3 border-l-4 px-4" style={{ borderColor: teamColor(batting.id) }}>
          <TeamLogo team={batting} size={40} />
          <div className="leading-tight">
            <p className="font-display text-[26px] font-bold uppercase tracking-wide">{teamCode(batting.name)}</p>
            <p className="text-[11px] font-medium text-zinc-400">
              {inning.inningsNumber === 1 ? "1st" : "2nd"} innings · v {bowling.name}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-baseline gap-3 px-4">
          <span className="tabular font-display text-[56px] font-bold leading-none tracking-tight">
            {inning.totalRuns}
            <span className="text-zinc-500">/{inning.wickets}</span>
          </span>
          <span className="tabular font-display text-xl font-semibold text-zinc-300">
            {inning.overs}
            <span className="ml-1 text-sm font-medium text-zinc-500">/ {sb.maxOvers} ov</span>
          </span>
        </div>

        <div className="flex shrink-0 divide-x divide-zinc-800 border-l border-zinc-800 py-1">
          <Stat label="Run rate" value={inning.runRate ? inning.runRate.toFixed(2) : "0.00"} sub={chase ? undefined : projected ? `Projected ${projected}` : undefined} />
          {chase ? (
            <>
              <Stat label="Target" value={inning.targetScore} tone="text-spark-300" sub={done ? (need === 0 ? "Reached" : `Fell ${need} short`) : need === 0 ? "Reached" : `Need ${need} off ${left}`} />
              <Stat label="Req. rate" value={done ? "-" : inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} sub={done ? undefined : `${left} balls left`} />
            </>
          ) : (
            <>
              <Stat label="Partnership" value={inning.partnershipRuns} />
              <Stat label="Wickets left" value={inning.wicketsLeft} sub={`of ${inning.maxWickets}`} />
            </>
          )}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-3 px-4">
          {inning.freeHit && <span className="rounded bg-spark-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Free hit</span>}
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{inning.currentBowler ? "This over" : "Last over"}</div>
            <div className="flex min-h-[2rem] flex-wrap items-center gap-1.5">
              {chips.length === 0 && <span className="text-sm text-zinc-600">-</span>}
              {chips.map((c, i) => (
                <BallChip key={i} c={c} size={32} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-zinc-800" aria-hidden="true">
        <div className="h-full bg-spark-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
