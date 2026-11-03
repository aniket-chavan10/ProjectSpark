import { LuTrophy } from "react-icons/lu";
import { Button, TeamLogo } from "../ui/kit";
import { teamColor } from "./scoreUtils";

const MARGIN = {
  wickets: (v) => `by ${v} wicket${v === 1 ? "" : "s"}`,
  runs: (v) => `by ${v} run${v === 1 ? "" : "s"}`,
};

/** The result once the match is over. A tie has no winner. */
export default function MatchResult({ sb, onBack }) {
  const r = sb.matchResult;
  const tie = r && r.marginType === "tie";
  const settled = r && r.marginType === "tiebreak";
  const so = sb.superOver && sb.superOver.phase === "settled" ? sb.superOver : null;
  const headline = !r ? "Match completed" : tie ? "Match tied" : so ? `${r.winnerTeamName} won the super over` : `${r.winnerTeamName} won`;
  const detail = !r ? "" : so ? "The scores were level, so one over each decided it." : settled ? "The scores were level. The tie was settled." : tie ? "Scores are level. The organiser decides the winner (for example with a super over)." : (MARGIN[r.marginType] || (() => ""))(r.marginValue);
  const team = (id) => (Number(id) === Number(sb.teams.team1.id) ? sb.teams.team1 : sb.teams.team2);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-center text-white shadow-pop ring-1 ring-white/10 sm:p-12" aria-label="Result">
      {r && r.winnerTeamId && <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(700px 300px at 50% 0%, ${teamColor(r.winnerTeamId)}, transparent 70%)` }} aria-hidden="true" />}
      <div className="run-stripes absolute inset-x-0 bottom-0 h-2 bg-spark-grad" aria-hidden="true" />
      <span className="relative mx-auto flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_15px_40px_-10px_rgba(245,158,11,.8)]">
        <LuTrophy className="h-9 w-9 text-amber-950" aria-hidden="true" />
      </span>
      <p className="relative mt-4 text-xs font-extrabold uppercase tracking-[0.3em] text-spark-300">Full time</p>
      <h2 className="relative mt-2 font-display text-5xl font-extrabold uppercase tracking-wide sm:text-6xl">{headline}</h2>
      {detail && <p className="relative mt-1 text-lg font-semibold text-ink-100">{detail}</p>}
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
        {sb.innings.map((i) => (
          <div key={i.inningId} className="flex items-center gap-3 rounded-2xl bg-ink-950/60 px-5 py-3 ring-1 ring-inset ring-white/15 backdrop-blur">
            <TeamLogo team={team(i.teamId)} size={34} />
            <span className="tabular text-left">
              <span className="block text-xs text-ink-200">{team(i.teamId).name}</span>
              <span className="font-display text-3xl font-extrabold">
                {i.totalRuns}/{i.wickets} <span className="text-sm font-medium text-ink-300">({i.overs})</span>
              </span>
            </span>
          </div>
        ))}
      </div>
      {so && (
        <p className="relative mt-4 text-sm font-semibold text-ink-200">
          {so.rounds
            .map((rd) => `Super over${so.rounds.length > 1 ? ` ${rd.round}` : ""}: ${rd.innings.map((i) => `${i.teamName} ${i.runs}/${i.wickets}`).join(" · ")}`)
            .join("   |   ")}
        </p>
      )}
      {onBack && (
        <div className="relative mt-8">
          <Button variant="glass" onClick={onBack}>
            Close the console
          </Button>
        </div>
      )}
    </section>
  );
}
