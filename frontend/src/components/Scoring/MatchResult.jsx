import { LuTrophy } from "react-icons/lu";
import { TeamLogo } from "../ui/kit";
import { CButton } from "./console";
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
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center" aria-label="Result" style={r && r.winnerTeamId ? { borderTop: `3px solid ${teamColor(r.winnerTeamId)}` } : undefined}>
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400 text-amber-950">
        <LuTrophy className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Full time</p>
      <h2 className="mt-1 font-display text-4xl font-bold uppercase tracking-wide text-white">{headline}</h2>
      {detail && <p className="mt-1 text-base text-zinc-300">{detail}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {sb.innings.map((i) => (
          <div key={i.inningId} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-2.5">
            <TeamLogo team={team(i.teamId)} size={32} />
            <span className="tabular text-left">
              <span className="block text-xs text-zinc-400">{team(i.teamId).name}</span>
              <span className="font-display text-2xl font-bold text-white">
                {i.totalRuns}/{i.wickets} <span className="text-sm font-medium text-zinc-500">({i.overs})</span>
              </span>
            </span>
          </div>
        ))}
      </div>
      {so && (
        <p className="mt-3 text-sm font-medium text-zinc-400">
          {so.rounds.map((rd) => `Super over${so.rounds.length > 1 ? ` ${rd.round}` : ""}: ${rd.innings.map((i) => `${i.teamName} ${i.runs}/${i.wickets}`).join(" · ")}`).join("   |   ")}
        </p>
      )}
      {onBack && (
        <div className="mt-5">
          <CButton onClick={onBack}>Close the console</CButton>
        </div>
      )}
    </section>
  );
}
