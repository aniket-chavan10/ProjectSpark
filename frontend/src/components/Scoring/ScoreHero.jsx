import { LuTarget } from "react-icons/lu";
import { TeamLogo } from "../ui/kit";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamColor } from "./scoreUtils";

const CHIP = {
  dot: "bg-white/10 text-slate-400",
  run: "bg-white/90 text-ink-900",
  four: "bg-brand-400 text-ink-950",
  six: "bg-brand-300 text-ink-950",
  wicket: "bg-red-500/90 text-white",
  extra: "bg-white/20 text-white",
};

const Metric = ({ label, value, sub, accent }) => (
  <div className="min-w-0 rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/10">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">{label}</div>
    <div className={`tabular mt-0.5 truncate text-xl font-bold ${accent || "text-white"}`}>{value}</div>
    {sub && <div className="truncate text-xs text-ink-300">{sub}</div>}
  </div>
);

/** The scoreboard at the top of the console: who is batting, the score, the chase and this over. */
export default function ScoreHero({ sb, inning }) {
  const { batting, bowling } = sides(sb, inning);
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const projected = projectedScore(sb, inning);
  const color = teamColor(batting.id);
  const chips = overChips(inning);
  const done = sb.status === "completed";

  return (
    <section className="relative overflow-hidden rounded-xl bg-ink-900 text-white shadow-card" aria-label="Score">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />

      <div className="relative grid gap-6 p-5 pl-7 sm:p-6 sm:pl-8 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-5">
          <TeamLogo team={batting} size={68} className="ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-300">
              <span className="font-semibold text-white">{batting.name}</span> · {inning.inningsNumber === 1 ? "1st" : "2nd"} innings · v {bowling.name}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span className="tabular text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
                {inning.totalRuns}
                <span className="text-ink-400">/{inning.wickets}</span>
              </span>
              <span className="tabular text-2xl font-semibold text-ink-200">
                {inning.overs} <span className="text-base font-medium text-ink-400">/ {sb.maxOvers} ov</span>
              </span>
              {inning.freeHit && <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-900">Free hit</span>}
            </div>
            <div className="mt-3 flex min-h-[2rem] items-center gap-2" aria-label={inning.currentBowler ? "This over" : "Last over"}>
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{inning.currentBowler ? "This over" : "Last over"}</span>
              {chips.length === 0 && <span className="text-xs text-ink-400">—</span>}
              {chips.map((c, i) => (
                <span key={i} className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-sm font-bold ${CHIP[c.kind]}`}>
                  {c.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[26rem] xl:grid-cols-2">
          <Metric label="Run rate" value={inning.runRate ? inning.runRate.toFixed(2) : "0.00"} sub={projected && !chase ? `Projected ${projected}` : `${inning.extrasBreakdown?.total ?? 0} extras`} />
          {chase ? (
            <Metric
              label="Target"
              value={inning.targetScore}
              accent={need === 0 ? "text-brand-200" : undefined}
              sub={done ? (need === 0 ? "Reached" : `Fell ${need} short`) : need === 0 ? "Reached" : `Need ${need} off ${left}`}
            />
          ) : (
            <Metric label="Partnership" value={inning.partnershipRuns} sub={`${inning.wicketsLeft} wickets left`} />
          )}
          {chase ? <Metric label="Required rate" value={done ? "—" : inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} sub={done ? undefined : `${left} balls left`} /> : <Metric label="Wickets left" value={inning.wicketsLeft} sub={`Out of ${inning.maxWickets}`} />}
          <Metric label="Last wicket" value={inning.lastWicket ? inning.lastWicket.playerOutName || "—" : "—"} sub={inning.lastWicket ? `${inning.lastWicket.description || ""} ${inning.lastWicket.over ? `· ${inning.lastWicket.over}` : ""}` : undefined} />
        </div>
      </div>
      {chase && !done && need > 0 && (
        <div className="relative flex items-center gap-2 border-t border-white/10 bg-white/[0.04] px-7 py-2.5 text-sm text-ink-200 sm:px-8">
          <LuTarget className="h-4 w-4 text-ink-300" aria-hidden="true" />
          <span>
            <strong className="text-white">{batting.name}</strong> need <strong className="text-white">{need}</strong> more from <strong className="text-white">{left}</strong> balls
          </span>
        </div>
      )}
    </section>
  );
}
