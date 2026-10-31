import { btn, card } from "../../components/ui/classes";
import TeamBadge from "../../components/Scoring/TeamBadge";
import { dayLabel, clock } from "../../components/AdminDashboard/Schedule/timeUtils";

const stageName = (m) => ({ group: m.group_name ? `Group ${m.group_name}` : "Group stage", semi: "Semi-final", third_place: "Third place", final: "Final" })[m.stage] || "Match";

function Squad({ team }) {
  const thin = team.squad.length < 2;
  return (
    <section className={`${card} overflow-hidden`} aria-label={`${team.team_name} playing XI`}>
      <header className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
        <TeamBadge team={team} size={52} />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{team.team_name}</h2>
          <p className="text-sm text-slate-500">Playing XI · {team.squad.length} {team.squad.length === 1 ? "player" : "players"}</p>
        </div>
      </header>
      {thin ? (
        <p className="m-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          The playing XI is not set for this team. Its team admin must choose it (My Squad) before the toss, or the toss will not start.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {team.squad.map((p, i) => (
            <li key={p.player_id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-6 text-sm tabular-nums text-slate-400">{i + 1}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{p.players_name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.players_name}</span>
              {p.is_captain && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800" title="Captain">C</span>}
              {p.is_keeper && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-bold text-sky-800" title="Wicket-keeper">WK</span>}
              {p.jersey_number !== null && p.jersey_number !== undefined && <span className="w-8 text-right text-sm tabular-nums text-slate-400">#{p.jersey_number}</span>}
            </li>
          ))}
        </ol>
      )}
      {team.reserves && team.reserves.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reserves · {team.reserves.length}</p>
          <p className="mt-1 text-sm text-slate-600">{team.reserves.map((p) => p.players_name).join(", ")}</p>
        </div>
      )}
    </section>
  );
}

/** Step 1: the match and both playing XIs. */
export default function MatchDetailsStep({ details, onNext }) {
  const { match, team1, team2 } = details;
  const ready = team1 && team2;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {match.tournament_name || "Tournament"} · {stageName(match)} · Match {match.match_no}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:justify-between">
          {ready ? (
            <>
              <div className="flex items-center gap-4">
                <TeamBadge team={team1} size={72} />
                <span className="text-2xl font-extrabold sm:text-3xl">{team1.team_name}</span>
              </div>
              <span className="text-lg font-bold text-slate-400">VS</span>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-extrabold sm:text-3xl">{team2.team_name}</span>
                <TeamBadge team={team2} size={72} />
              </div>
            </>
          ) : (
            <p className="text-lg text-slate-300">The teams of this match are not decided yet.</p>
          )}
        </div>
        <dl className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-400">When</dt>
            <dd className="font-semibold">{match.match_date_str ? `${dayLabel(match.match_date_str)}${match.start_time_str ? `, ${clock(match.start_time_str)}` : ""}` : "Not scheduled"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Where</dt>
            <dd className="font-semibold">{match.venue || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Format</dt>
            <dd className="font-semibold">{match.overs || 5} overs a side</dd>
          </div>
          <div>
            <dt className="text-slate-400">Slot</dt>
            <dd className="font-semibold">{match.duration_minutes ? `${match.duration_minutes} minutes` : "—"}</dd>
          </div>
        </dl>
      </section>

      {ready && (
        <div className="grid gap-4 md:grid-cols-2">
          <Squad team={team1} />
          <Squad team={team2} />
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" className={`${btn.primary} !px-6 !py-3 !text-base`} disabled={!ready} onClick={onNext}>
          Next: the toss →
        </button>
      </div>
    </div>
  );
}
