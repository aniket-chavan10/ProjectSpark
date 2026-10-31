import { Link, useParams } from "react-router-dom";
import { publicApi, shortDate } from "../../api/sparkApi";
import Scorecard from "../../components/Public/Scorecard";
import { ErrorBox, Loading, PlayerPhoto, PublicLayout, TeamLogo, useLoad } from "../../components/Public/ui";

/** The scorecard of a finished match. */
export default function MatchPage() {
  const { id } = useParams();
  const { data: m, error, loading } = useLoad(() => publicApi.match(id), [id]);

  return (
    <PublicLayout>
      {loading && <Loading />}
      {error && (
        <div className="space-y-4">
          <ErrorBox>{error}</ErrorBox>
          <Link to="/results" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← All results
          </Link>
        </div>
      )}
      {m && (
        <>
          <Link to="/results" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← All results
          </Link>
          <section className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              {m.tournamentId ? (
                <Link to={`/tournaments/${m.tournamentId}`} className="hover:underline">
                  {m.tournament}
                </Link>
              ) : (
                m.tournament
              )}{" "}
              · {m.stageLabel} · {shortDate(m.date)}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {m.teams.map((t) => {
                const s = m.innings.find((i) => i.teamId === t.id);
                return (
                  <Link key={t.id} to={`/teams/${t.id}`} className="flex items-center gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/15">
                    <TeamLogo team={t} size={56} />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{t.name}</p>
                      <p className="text-2xl font-extrabold tabular-nums">
                        {s ? `${s.runs}/${s.wickets}` : "—"} {s && <span className="text-sm font-medium text-slate-300">({s.overs} ov)</span>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 text-xl font-bold text-amber-300">{m.result}</p>
            <p className="mt-1 text-sm text-slate-300">{[m.toss, m.venue && `📍 ${m.venue}`, m.overs && `${m.overs} overs a side`].filter(Boolean).join(" · ")}</p>
            {m.playerOfMatch && (
              <Link to={`/players/${m.playerOfMatch.id}`} className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 hover:bg-white/15">
                <PlayerPhoto player={m.playerOfMatch} size={36} />
                <span className="text-sm">
                  <span className="text-amber-300">🏅 Player of the match</span> · <strong>{m.playerOfMatch.name}</strong>
                </span>
              </Link>
            )}
          </section>
          <div className="mt-8">
            <Scorecard innings={m.scorecard} />
          </div>
        </>
      )}
    </PublicLayout>
  );
}
