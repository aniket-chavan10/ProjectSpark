import { Link, useParams } from "react-router-dom";
import { publicApi } from "../../api/sparkApi";
import { Empty, ErrorBox, FixtureCard, Loading, Medal, PlayerPhoto, PublicLayout, ResultCard, Section, StatBox, TeamLogo, useLoad } from "../../components/Public/ui";

/** One team: standing, honours, squad, form. */
export default function TeamPage() {
  const { id } = useParams();
  const { data: t, error, loading } = useLoad(() => publicApi.team(id), [id]);
  const results = useLoad(() => publicApi.matches({ teamId: id, pageSize: 6 }), [id]);

  return (
    <PublicLayout>
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {t && (
        <>
          <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow">
            <TeamLogo team={t} size={88} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{t.name}</h1>
              {t.village && <p className="text-sm text-slate-300">{t.village}</p>}
            </div>
            <div className="grid w-full grid-cols-4 gap-3 text-slate-900 sm:w-auto">
              <StatBox label="Rank" value={t.rank ? `#${t.rank}` : "—"} />
              <StatBox label="Points" value={t.points} />
              <StatBox label="Titles" value={t.titles} />
              <StatBox label="Won" value={`${t.won}/${t.played}`} />
            </div>
          </section>

          <div className="mt-8" />
          {t.upcoming.length > 0 && (
            <Section title="Upcoming matches">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {t.upcoming.map((f) => (
                  <FixtureCard key={f.fixtureId} f={f} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Recent results" link={{ to: "/results", label: "All results" }}>
            {results.data && results.data.items.length === 0 && <Empty>No finished matches yet.</Empty>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(results.data ? results.data.items : []).map((m) => (
                <ResultCard key={m.matchId} m={m} />
              ))}
            </div>
          </Section>

          {t.honours.length > 0 && (
            <Section title="Honours">
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {t.honours.map((h) => (
                  <li key={`${h.tournamentId}-${h.position}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-8 text-lg">
                      <Medal position={h.position} />
                    </span>
                    <Link to={`/tournaments/${h.tournamentId}`} className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline">
                      {h.tournament}
                    </Link>
                    <span className="ml-auto text-slate-500">{h.year}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Players">
            {t.players.length === 0 ? (
              <Empty>No players listed.</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {t.players.map((p) => (
                  <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-400">
                    <PlayerPhoto player={p} size={44} />
                    <span className="truncate text-sm font-semibold text-slate-800">{p.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </PublicLayout>
  );
}
