import React from "react";
import { LuActivity, LuArrowRight, LuBan, LuCalendarClock, LuCalendarDays, LuCircleAlert, LuInbox, LuRadio, LuRepeat, LuTrophy, LuUserCog, LuUsers, LuUsersRound } from "react-icons/lu";
import { associationApi, publicApi, shortDate } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, CardHeader, cx, EmptyState, Spinner, Stat } from "../ui/kit";
import Hero, { HeroStat } from "../ui/Hero";
import { ColumnChart, Meter } from "../ui/charts";
import { FixtureCard, ResultCard, TeamLogo, useLoad } from "../Public/ui";

const PODIUM = [
  // [place, classes of the plinth, height]
  { place: 2, plinth: "from-ink-300 to-ink-200", h: "h-20" },
  { place: 1, plinth: "from-amber-400 to-amber-300", h: "h-28" },
  { place: 3, plinth: "from-orange-400 to-orange-300", h: "h-14" },
];

/** The top three on a podium, the rest as rows. */
function Ranking({ teams }) {
  const top = teams.slice(0, 3);
  const rest = teams.slice(3);
  return (
    <>
      <div className="mt-5 grid grid-cols-3 items-end gap-3 px-5">
        {PODIUM.map(({ place, plinth, h }) => {
          const t = top[place - 1];
          if (!t) return <div key={place} />;
          return (
            <div key={place} className="flex min-w-0 flex-col items-center text-center">
              <TeamLogo team={{ id: t.teamId, name: t.name, logo: t.logo }} size={place === 1 ? 64 : 52} />
              <p className="mt-2 w-full truncate text-sm font-bold text-ink-950">{t.name}</p>
              <p className="tabular text-xs font-semibold text-ink-500">{t.points} pts</p>
              <div className={cx("mt-2 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2 font-display text-3xl font-extrabold text-white shadow-inner", plinth, h)}>{place}</div>
            </div>
          );
        })}
      </div>
      {rest.length > 0 && (
        <ol className="divide-y divide-ink-100 border-t border-ink-100">
          {rest.map((t, i) => (
            <li key={t.teamId} className="flex items-center gap-3 px-5 py-3">
              <span className="tabular w-6 text-sm font-bold text-ink-400">{i + 4}</span>
              <TeamLogo team={{ id: t.teamId, name: t.name, logo: t.logo }} size={34} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-950">{t.name}</span>
              {t.titles > 0 && <Badge tone="amber">{t.titles} title{t.titles === 1 ? "" : "s"}</Badge>}
              <span className="tabular w-16 text-right text-sm font-bold text-ink-950">
                {t.points} <span className="text-xs font-medium text-ink-400">pts</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

const ALERT_STYLE = {
  red: "border-red-200 bg-red-50 text-red-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  green: "border-green-200 bg-green-50 text-green-900",
  slate: "border-ink-100 bg-ink-50 text-ink-800",
};

const KIND = {
  request: { icon: LuInbox, tone: "bg-amber-100 text-amber-700" },
  tournament: { icon: LuCalendarDays, tone: "bg-volt-100 text-volt-700" },
  ban: { icon: LuBan, tone: "bg-red-100 text-red-700" },
  result: { icon: LuTrophy, tone: "bg-spark-100 text-spark-700" },
  replacement: { icon: LuRepeat, tone: "bg-indigo-100 text-indigo-700" },
};

const ago = (iso) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  if (mins < 60 * 24 * 7) return `${Math.round(mins / (60 * 24))} d ago`;
  return shortDate(iso);
};

const STATUS_NAME = { pending: "Being set up", open: "Taking entries", setup_done: "Ready", allocated: "Scheduled", live: "Under way", completed: "Finished", cancelled: "Cancelled", rejected: "Rejected" };

// The association's home: the numbers, what is waiting for a decision, how the teams stand, what just happened.
export default function Overview({ goTo }) {
  const { data, error, loading } = useLoad(() => publicApi.overview(), []);
  const { data: dash, error: dashError } = useLoad(() => associationApi.dashboard(), []);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const c = dash ? dash.counts : null;
  const counts = data.counts;

  return (
    <div className="space-y-6">
      <Hero
        eyebrow="Association"
        title="Control room"
        subtitle="Teams, hosts, tournaments and results across the association, and what needs you next."
        actions={
          <>
            <Button size="lg" onClick={() => goTo("tournamentManager")} iconRight={LuArrowRight}>
              Plan a tournament
            </Button>
            <Button size="lg" variant="glass" onClick={() => goTo("schedules")} icon={LuCalendarDays}>
              Season schedule
            </Button>
            {c && c.requests > 0 && (
              <Button size="lg" variant="glass" onClick={() => goTo("teamRequests")} icon={LuInbox}>
                {c.requests} request{c.requests === 1 ? "" : "s"} waiting
              </Button>
            )}
          </>
        }
        aside={
          <>
            <HeroStat label="Teams" value={counts.teams} icon={LuUsersRound} onClick={() => goTo("all-teams")} />
            <HeroStat label="Players" value={counts.players} icon={LuUsers} onClick={() => goTo("managePlayers")} />
            <HeroStat label="Hosts" value={c ? c.hosts : "…"} icon={LuUserCog} onClick={() => goTo("hosts")} />
            <HeroStat label="Matches played" value={counts.matches} icon={LuTrophy} onClick={() => goTo("results")} />
          </>
        }
      />

      {dashError && <Alert tone="warn">The dashboard figures could not be loaded ({dashError}). The rest of the page still works.</Alert>}

      {dash && (
        <>
          {/* key numbers */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Tournaments" value={c.tournaments} hint={`${c.tournamentsDone} finished`} icon={LuCalendarDays} tone="blue" onClick={() => goTo("hosts")} />
            <Stat label="Live now" value={c.matchesLive} hint={c.matchesLive ? "Matches being scored" : "No match is live"} icon={LuRadio} tone={c.matchesLive ? "red" : "slate"} onClick={() => goTo("results")} />
            <Stat label="Waiting for approval" value={c.requests} hint="New team requests" icon={LuInbox} tone={c.requests ? "amber" : "slate"} onClick={() => goTo("teamRequests")} />
            <Stat label="Banned" value={c.bannedPlayers + c.bannedTeams} hint={`${c.bannedTeams} team${c.bannedTeams === 1 ? "" : "s"}, ${c.bannedPlayers} player${c.bannedPlayers === 1 ? "" : "s"}`} icon={LuBan} tone={c.bannedPlayers + c.bannedTeams ? "red" : "slate"} onClick={() => goTo("bans")} />
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            {/* needs attention + running tournaments */}
            <div className="space-y-6 xl:col-span-5">
              <Card>
                <CardHeader title="Needs your attention" subtitle="Things to look at, most urgent first" icon={LuCircleAlert} />
                {dash.alerts.length ? (
                  <ul className="mt-4 space-y-2">
                    {dash.alerts.map((a) => (
                      <li key={a.text}>
                        <button type="button" onClick={() => goTo(a.goTo)} className={cx("flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:brightness-95", ALERT_STYLE[a.tone] || ALERT_STYLE.slate)}>
                          <span>{a.text}</span>
                          <LuArrowRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <EmptyState icon={LuCircleAlert} title="All clear">Nothing needs a decision right now.</EmptyState>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader title="Tournaments in the next 30 days" subtitle="Matches played so far" icon={LuCalendarDays} actions={<Button variant="ghost" size="sm" onClick={() => goTo("hosts")}>All hosts</Button>} />
                {dash.running.length ? (
                  <ul className="mt-4 space-y-4">
                    {dash.running.map((t) => (
                      <li key={t.id}>
                        <Meter label={t.name || "Tournament"} value={t.matchesPlayed} max={t.matches} note={t.matches ? `${t.matchesPlayed} of ${t.matches} matches` : "No schedule yet"} />
                        <p className="mt-1 text-xs text-ink-500">
                          {t.host ? `${t.host} · ` : ""}
                          {shortDate(t.startDate)} to {shortDate(t.endDate)}
                          {t.venue ? ` · ${t.venue}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <EmptyState icon={LuCalendarClock} title="Nothing in the next 30 days">Plan one from the season schedule.</EmptyState>
                  </div>
                )}
              </Card>
            </div>

            {/* trends and activity */}
            <div className="space-y-6 xl:col-span-7">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader title="Matches played" subtitle="Last six months" icon={LuTrophy} />
                  <ColumnChart className="mt-3" data={dash.trends.matches} unit="matches" />
                </Card>
                <Card>
                  <CardHeader title="New teams" subtitle="Last six months" icon={LuUsersRound} />
                  <ColumnChart className="mt-3" data={dash.trends.teams} unit="teams" />
                </Card>
              </div>

              <Card>
                <CardHeader title="Latest activity" subtitle="Across the association" icon={LuActivity} />
                {dash.activity.length ? (
                  <ol className="mt-3 divide-y divide-ink-100">
                    {dash.activity.map((a, i) => {
                      const K = KIND[a.kind] || KIND.tournament;
                      return (
                        <li key={i}>
                          <button type="button" onClick={() => goTo(a.goTo)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-ink-50/70">
                            <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", K.tone)}>
                              <K.icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{a.text}</span>
                            {a.note && <Badge tone="slate">{a.note}</Badge>}
                            <span className="shrink-0 text-xs font-semibold text-ink-400">{ago(a.at)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="mt-3">
                    <EmptyState icon={LuActivity} title="Nothing yet">Activity shows up here as teams join and matches finish.</EmptyState>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {dash.tournamentsByStatus.length > 0 && (
            <Card>
              <CardHeader title="Tournaments by stage" subtitle="Where every tournament stands" icon={LuCalendarDays} />
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                {dash.tournamentsByStatus.map((s) => (
                  <li key={s.status}>
                    <Meter label={STATUS_NAME[s.status] || s.status} value={s.count} max={c.tournaments} note={`${s.count}`} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-12">
        <Card className="lg:col-span-2 2xl:col-span-5" padded={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Team ranking" subtitle="By association points" icon={LuTrophy} actions={<Button variant="ghost" size="sm" onClick={() => goTo("rankings")}>Points rules</Button>} />
          </div>
          {data.topTeams.length ? (
            <div className="pb-0">
              <Ranking teams={data.topTeams} />
            </div>
          ) : (
            <div className="p-5">
              <EmptyState icon={LuTrophy} title="No ranking yet">Points appear once matches are completed.</EmptyState>
            </div>
          )}
        </Card>

        <section className="space-y-3 2xl:col-span-4" aria-label="Coming up">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">Coming up</h2>
            <button type="button" onClick={() => goTo("schedules")} className="inline-flex items-center gap-1 text-sm font-bold text-spark-700 hover:underline">
              Full schedule <LuArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {data.upcoming.length ? data.upcoming.slice(0, 4).map((f) => <FixtureCard key={f.fixtureId} f={f} />) : <EmptyState icon={LuCalendarClock} title="Nothing scheduled" />}
        </section>

        <section className="space-y-3 2xl:col-span-3" aria-label="Latest results">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">Latest results</h2>
            <button type="button" onClick={() => goTo("results")} className="inline-flex items-center gap-1 text-sm font-bold text-spark-700 hover:underline">
              All <LuArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {data.recentResults.length ? data.recentResults.slice(0, 4).map((m) => <ResultCard key={m.matchId} m={m} />) : <EmptyState icon={LuTrophy} title="No results yet" />}
        </section>
      </div>
    </div>
  );
}
