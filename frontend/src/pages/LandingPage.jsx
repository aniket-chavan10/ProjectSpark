import { Link } from "react-router-dom";
import { publicApi, shortDate } from "../api/sparkApi";
import { PlayerRankingTable, TeamRankingTable } from "../components/Public/Rankings";
import { Empty, ErrorBox, FixtureCard, Loading, PublicLayout, ResultCard, Section, StatBox, useLoad } from "../components/Public/ui";
import { StatusPill } from "./public/TournamentsPage";
import SponsorStrip from "../components/Public/Sponsors";

/** The public home page: what is on, what just happened, who is on top. Finished matches only (no live scores). */
export default function LandingPage() {
  const { data, error, loading } = useLoad(() => publicApi.overview(), []);

  return (
    <PublicLayout>
      <section className="-mx-4 -mt-8 mb-8 bg-ink-900 px-4 py-12 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-300">Local cricket, properly recorded</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Every match. Every team. Every run.</h1>
          <p className="mt-3 max-w-xl text-slate-300">Results, scorecards and rankings of the tournaments played under the association.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/results" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 shadow hover:bg-ink-100">
              Latest results
            </Link>
            <Link to="/rankings" className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/15">
              See the rankings
            </Link>
          </div>
          {data && (
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-slate-900 sm:grid-cols-4">
              <StatBox label="Teams" value={data.counts.teams} />
              <StatBox label="Players" value={data.counts.players} />
              <StatBox label="Tournaments" value={data.counts.tournaments} />
              <StatBox label="Matches" value={data.counts.matches} />
            </div>
          )}
        </div>
      </section>

      <SponsorStrip placement="home" className="mb-10" />

      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}

      {data && (
        <>
          {data.announcements.length > 0 && (
            <section className="mb-10 space-y-3" aria-label="Announcements">
              {data.announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-900">
                    {a.title} <span className="ml-2 text-xs font-medium text-amber-700">{shortDate(a.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-amber-900">{a.body}</p>
                </div>
              ))}
            </section>
          )}

          {data.upcoming.length > 0 && (
            <Section title="Coming up">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.upcoming.map((f) => (
                  <FixtureCard key={f.fixtureId} f={f} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Latest results" link={{ to: "/results", label: "All results" }}>
            {data.recentResults.length === 0 && <Empty>No finished matches yet.</Empty>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentResults.map((m) => (
                <ResultCard key={m.matchId} m={m} />
              ))}
            </div>
          </Section>

          {data.champions.length > 0 && (
            <Section title="Champions" link={{ to: "/tournaments", label: "All tournaments" }}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.champions.map((t) => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 text-center shadow-sm hover:shadow-md">
                    <p className="text-3xl">🏆</p>
                    <p className="mt-1 text-base font-extrabold text-slate-900">{t.champion}</p>
                    <p className="text-xs text-slate-500">{t.name}</p>
                    <div className="mt-2">
                      <StatusPill status={t.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            <Section title="Top teams" link={{ to: "/rankings", label: "Full table" }} className="lg:col-span-1">
              <TeamRankingTable items={data.topTeams} compact />
            </Section>
            <Section title="Top batters" link={{ to: "/rankings?tab=batting", label: "More" }}>
              <PlayerRankingTable category="batting" items={data.topBatters} compact />
            </Section>
            <Section title="Top bowlers" link={{ to: "/rankings?tab=bowling", label: "More" }}>
              <PlayerRankingTable category="bowling" items={data.topBowlers} compact />
            </Section>
          </div>
        </>
      )}
    </PublicLayout>
  );
}
