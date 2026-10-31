import { btn } from "../ui/classes";

const MARGIN = {
  wickets: (v) => `by ${v} wicket${v === 1 ? "" : "s"}`,
  runs: (v) => `by ${v} run${v === 1 ? "" : "s"}`,
};

/** The result once the match is over. A tie has no winner. */
export default function MatchResult({ sb, onBack }) {
  const r = sb.matchResult;
  const tie = r && r.marginType === "tie";
  const headline = !r ? "Match completed" : tie ? "Match tied" : `${r.winnerTeamName} won`;
  const detail = !r ? "" : tie ? "Scores are level. The organiser decides the winner (for example with a super over)." : (MARGIN[r.marginType] || (() => ""))(r.marginValue);

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-center text-white shadow-lg sm:p-8" aria-label="Result">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">Full time</div>
      <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{headline}</h2>
      {detail && <p className="mt-1 text-lg text-emerald-50">{detail}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-emerald-50">
        {sb.innings.map((i) => (
          <span key={i.inningId} className="tabular-nums">
            <span className="font-semibold">{i.teamId === sb.teams.team1.id ? sb.teams.team1.name : sb.teams.team2.name}</span> {i.totalRuns}/{i.wickets} <span className="text-emerald-200">({i.overs})</span>
          </span>
        ))}
      </div>
      {onBack && (
        <div className="mt-6">
          <button type="button" onClick={onBack} className={`${btn.secondary} !border-white/30 !bg-white/10 !text-white hover:!bg-white/20`}>
            Close
          </button>
        </div>
      )}
    </section>
  );
}
