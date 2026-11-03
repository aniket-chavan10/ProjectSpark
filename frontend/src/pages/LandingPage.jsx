import { Link } from "react-router-dom";
import { LuArrowRight, LuCalendarCog, LuChartNoAxesColumn, LuMapPin, LuMegaphone, LuRadio, LuTrophy, LuUsers } from "react-icons/lu";
import { publicApi, shortDate } from "../api/sparkApi";
import { PlayerRankingTable, TeamRankingTable } from "../components/Public/Rankings";
import { Empty, ErrorBox, FixtureCard, Loading, PublicLayout, ResultCard, Section, TeamLogo, useLoad } from "../components/Public/ui";
import SponsorStrip from "../components/Public/Sponsors";

// the next match, as a glass card on the dark banner
function NextMatch({ f }) {
  const [a, b] = f.teams;
  return (
    <div className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-inset ring-white/15 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em]">
        <span className="flex items-center gap-2 text-spark-300">
          <span className="h-2 w-2 rounded-full bg-spark-400 shadow-[0_0_10px_2px_rgba(255,122,26,.7)]" aria-hidden="true" />
          Next match
        </span>
        <span className="text-ink-200">
          {shortDate(f.date)}
          {f.time ? ` · ${f.time}` : ""}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {[a, b].map((t, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center gap-2 text-center">
            <TeamLogo team={t} size={64} />
            <span className="w-full break-words font-display text-lg font-extrabold uppercase leading-tight tracking-wide sm:text-xl">{t ? t.name : "To be decided"}</span>
          </div>
        ))}
        <span className="order-none col-start-2 row-start-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-extrabold text-ink-200 ring-1 ring-inset ring-white/15">VS</span>
      </div>
      <p className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs font-semibold text-ink-200">
        <span className="min-w-0 truncate">
          {f.tournament}
          {f.stageLabel ? ` · ${f.stageLabel}` : ""}
        </span>
        {f.venue && (
          <span className="inline-flex items-center gap-1">
            <LuMapPin className="h-3.5 w-3.5" aria-hidden="true" /> {f.venue}
          </span>
        )}
      </p>
    </div>
  );
}

const AUDIENCE = [
  {
    icon: LuUsers,
    title: "For teams",
    text: "Register your village, keep your squad ready and see every match your team plays, with scorecards and rankings.",
    link: { to: "/sign-up", label: "Register a team" },
  },
  {
    icon: LuCalendarCog,
    title: "For hosts",
    text: "Reserve your dates with the association, build groups and the schedule, and replace a team that pulls out, at any time.",
    link: { to: "/sign-in", label: "Team admin login" },
  },
  {
    icon: LuChartNoAxesColumn,
    title: "For fans",
    text: "Follow results, scorecards, player rankings and awards, including matches decided in a super over.",
    link: { to: "/results", label: "See the results" },
  },
];

/** The public home page: what is on, what just happened, who is on top. Finished matches only (no live scores). */
export default function LandingPage() {
  const { data, error, loading } = useLoad(() => publicApi.overview(), []);
  const next = data && data.upcoming && data.upcoming[0];

  const hero = (
    <section className="relative overflow-hidden bg-stadium text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60 [background-size:48px_48px] [mask-image:linear-gradient(105deg,black,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-spark-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-6 left-0 h-14 w-2/3 -skew-x-12 overflow-hidden opacity-60" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-r from-spark-600/60 via-spark-500/20 to-transparent" />
      </div>
      <div className="pointer-events-none absolute right-0 top-14 h-9 w-2/5 -skew-x-12 overflow-hidden opacity-50" aria-hidden="true">
        <div className="run-stripes h-full w-full bg-gradient-to-l from-volt-500/60 via-volt-500/10 to-transparent" />
      </div>
      <div className="relative mx-auto grid max-w-[1600px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:px-10 lg:py-20">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-spark-300">
            <span className="h-0.5 w-8 bg-spark-grad" aria-hidden="true" />
            Local cricket, properly recorded
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide sm:text-7xl 2xl:text-8xl">
            Every match. Every team. <span className="text-gradient-spark">Every run.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-200">Results, scorecards and rankings of the tournaments played under the association, scored ball by ball.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/results" className="inline-flex items-center gap-2 rounded-xl bg-spark-grad px-6 py-3.5 text-[15px] font-bold text-white shadow-glow transition hover:brightness-110">
              Latest results <LuArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/rankings" className="inline-flex items-center rounded-xl bg-white/10 px-6 py-3.5 text-[15px] font-bold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15">
              See the rankings
            </Link>
          </div>
        </div>

        {data && (
          <div className="w-full space-y-3 lg:w-[26rem] 2xl:w-[30rem]">
            {next && <NextMatch f={next} />}
            <dl className="grid grid-cols-4 divide-x divide-white/10 rounded-2xl bg-white/[0.05] py-3.5 ring-1 ring-inset ring-white/10 backdrop-blur">
              {[
                ["Teams", data.counts.teams],
                ["Players", data.counts.players],
                ["Tournaments", data.counts.tournaments],
                ["Matches", data.counts.matches],
              ].map(([k, v]) => (
                <div key={k} className="px-1 text-center sm:px-3">
                  <dd className="font-display text-2xl font-extrabold leading-none">{v}</dd>
                  <dt className="mt-1 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-300 sm:text-[10px] sm:tracking-[0.14em]">{k}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <PublicLayout hero={hero}>
      <SponsorStrip placement="home" className="mb-10" />

      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}

      {data && (
        <>
          {data.announcements.length > 0 && (
            <section className="mb-10 space-y-3" aria-label="Announcements">
              {data.announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-4 rounded-2xl border border-spark-200 bg-gradient-to-r from-spark-50 to-white px-5 py-4 shadow-card">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-spark-grad text-white shadow-glow">
                    <LuMegaphone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink-950">
                      {a.title} <span className="ml-2 text-xs font-semibold text-ink-400">{shortDate(a.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{a.body}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {data.upcoming.length > 0 && (
            <Section title="Coming up">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {data.upcoming.map((f) => (
                  <FixtureCard key={f.fixtureId} f={f} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Latest results" link={{ to: "/results", label: "All results" }}>
            {data.recentResults.length === 0 && <Empty>No finished matches yet.</Empty>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {data.recentResults.map((m) => (
                <ResultCard key={m.matchId} m={m} />
              ))}
            </div>
          </Section>

          {data.champions.length > 0 && (
            <Section title="Champions" link={{ to: "/tournaments", label: "All tournaments" }}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.champions.map((t) => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="group relative overflow-hidden rounded-2xl bg-ink-950 p-5 text-center text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-raised">
                    <span className="absolute inset-x-0 top-0 h-1 bg-spark-grad" aria-hidden="true" />
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-spark-grad text-white shadow-glow">
                      <LuTrophy className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 truncate font-display text-2xl font-extrabold uppercase tracking-wide">{t.champion}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-ink-300">Champions · {t.name}</p>
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

      <section className="mb-4 mt-4" aria-label="Who Spark is for">
        <div className="mb-3">
          <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink-950">One place for the whole season</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {AUDIENCE.map((a) => (
            <div key={a.title} className="flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-spark-50 text-spark-600 ring-1 ring-inset ring-spark-100">
                <a.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">{a.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{a.text}</p>
              <Link to={a.link.to} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-spark-700 hover:underline">
                {a.link.label} <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>

        <div className="relative mt-6 overflow-hidden rounded-3xl bg-stadium px-6 py-10 text-white sm:px-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-spark-500/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-4 left-0 h-10 w-1/2 -skew-x-12 overflow-hidden opacity-60" aria-hidden="true">
            <div className="run-stripes h-full w-full bg-gradient-to-r from-spark-600/60 via-spark-500/20 to-transparent" />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-spark-300">
                <LuRadio className="h-4 w-4" aria-hidden="true" /> Live scoring and broadcast graphics
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">Is your village on Spark?</h2>
              <p className="mt-3 text-ink-200">Send a request to join the association. Once it is approved, your team admin gets a login.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-spark-grad px-6 py-3.5 text-[15px] font-bold text-white shadow-glow transition hover:brightness-110">
                Register a team <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/sign-in" className="inline-flex items-center rounded-xl bg-white/10 px-6 py-3.5 text-[15px] font-bold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15">
                Team admin login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
