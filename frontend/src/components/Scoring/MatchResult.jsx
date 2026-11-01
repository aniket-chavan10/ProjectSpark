import { LuTrophy } from "react-icons/lu";
import { Button, TeamLogo } from "../ui/kit";

const MARGIN = {
  wickets: (v) => `by ${v} wicket${v === 1 ? "" : "s"}`,
  runs: (v) => `by ${v} run${v === 1 ? "" : "s"}`,
};

/** The result once the match is over. A tie has no winner. */
export default function MatchResult({ sb, onBack }) {
  const r = sb.matchResult;
  const tie = r && r.marginType === "tie";
  const settled = r && r.marginType === "tiebreak";
  const headline = !r ? "Match completed" : tie ? "Match tied" : `${r.winnerTeamName} won`;
  const detail = !r ? "" : settled ? "The scores were level. The tie was settled." : tie ? "Scores are level. The organiser decides the winner (for example with a super over)." : (MARGIN[r.marginType] || (() => ""))(r.marginValue);
  const team = (id) => (Number(id) === Number(sb.teams.team1.id) ? sb.teams.team1 : sb.teams.team2);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-ink-900 p-7 text-center text-white shadow-pop sm:p-9" aria-label="Result">
      <LuTrophy className="mx-auto h-9 w-9 text-ink-200" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-ink-300">Full time</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{headline}</h2>
      {detail && <p className="mt-1 text-lg text-ink-100">{detail}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {sb.innings.map((i) => (
          <div key={i.inningId} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-inset ring-white/15">
            <TeamLogo team={team(i.teamId)} size={34} />
            <span className="tabular text-left">
              <span className="block text-xs text-ink-200">{team(i.teamId).name}</span>
              <span className="text-lg font-bold">
                {i.totalRuns}/{i.wickets} <span className="text-sm font-medium text-ink-300">({i.overs})</span>
              </span>
            </span>
          </div>
        ))}
      </div>
      {onBack && (
        <div className="mt-7">
          <Button variant="secondary" onClick={onBack} className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/20">
            Close the console
          </Button>
        </div>
      )}
    </section>
  );
}
