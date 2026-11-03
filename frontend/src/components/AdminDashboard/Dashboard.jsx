import React from "react";
import { LuArrowRight, LuCalendarClock, LuCircleAlert, LuMapPin, LuMegaphone, LuPin, LuRepeat, LuSettings2, LuShieldAlert, LuTrendingUp, LuTrophy } from "react-icons/lu";
import { publicApi, shortDate, teamNewsApi } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Spinner, TeamLogo, cx } from "../ui/kit";
import Hero, { HeroStat } from "../ui/Hero";
import { ColumnChart, Meter } from "../ui/charts";
import { teamCode } from "../Scoring/scoreUtils";
import { FixtureCard, ResultCard, useLoad } from "../Public/ui";

const STATUS = { pending: ["Being set up", "slate"], open: ["Taking entries", "blue"], setup_done: ["Ready", "blue"], allocated: ["Scheduled", "blue"], live: ["Under way", "red"], completed: ["Finished", "green"], cancelled: ["Cancelled", "slate"] };

const ALERT_STYLE = {
  red: "border-red-200 bg-red-50 text-red-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  green: "border-green-200 bg-green-50 text-green-900",
  slate: "border-ink-100 bg-ink-50 text-ink-800",
};

const SQUAD_MIN = 11;

// What the team representative should look at first, most urgent first.
const attention = (o, unread) => {
  const list = [];
  const live = (o.hosted || []).find((t) => t.live > 0);
  if (live) list.push({ tone: "green", text: `A match of ${live.name || "your tournament"} is live right now`, go: { to: "organize", tournamentId: live.id, step: 5 } });
  (o.hosting || [])
    .filter((h) => !h.tournamentId)
    .forEach((h) => list.push({ tone: "amber", text: `Set up your tournament for ${shortDate(h.startDate)} to ${shortDate(h.endDate)}`, go: { to: "organize" } }));
  if (o.players.length < SQUAD_MIN) list.push({ tone: "amber", text: `Your squad has ${o.players.length} player${o.players.length === 1 ? "" : "s"}; a match needs ${SQUAD_MIN}`, go: { to: "players" } });
  if (!o.logo) list.push({ tone: "slate", text: "Add your team logo for scorecards and the broadcast", go: { to: "profile" } });
  if (unread > 0) list.push({ tone: "slate", text: `${unread} new notification${unread === 1 ? "" : "s"}`, go: { to: "alerts" } });
  return list;
};

// The result of one match from this team's side: W, L or T, with its own runs.
const formOf = (teamId, m) => {
  const mine = m.innings.find((i) => i.teamId === teamId);
  const other = m.teams.find((t) => t.id !== teamId);
  const res = m.winnerTeamId == null ? "T" : m.winnerTeamId === teamId ? "W" : "L";
  return { res, runs: mine ? mine.runs : 0, against: other ? other.name : "", date: m.date };
};

const FORM_TONE = { W: "bg-green-100 text-green-800 ring-green-200", L: "bg-red-100 text-red-800 ring-red-200", T: "bg-ink-100 text-ink-700 ring-ink-200" };

// The team representative's home: what needs attention, how the team is playing, the tournaments it runs, what is next.
const Dashboard = ({ overview, unread = 0, onOpenMatch, goTo, onManage }) => {
  const news = useLoad(() => teamNewsApi.announcements(), []);
  const o = overview;
  const results = useLoad(() => (o ? publicApi.matches({ teamId: o.id, pageSize: 8 }) : Promise.resolve(null)), [o && o.id]);

  if (!o) return <Spinner />;

  const todo = attention(o, unread);
  const go = (g) => (g.tournamentId ? onManage(g.tournamentId, g.step) : goTo(g.to));
  const played = results.data ? results.data.items : [];
  const form = played.map((m) => formOf(o.id, m)).reverse(); // oldest first for the chart
  const hosted = o.hosted || [];

  return (
    <div className="space-y-6">
      <Hero
        eyebrow="Team dashboard"
        leading={<TeamLogo team={o} size={84} className="!ring-4 !ring-white/20" />}
        title={o.name}
        subtitle="Where your team stands, what needs your attention and what is coming up."
        actions={
          <>
            <Button size="lg" iconRight={LuArrowRight} onClick={() => goTo("apply")}>
              Apply to a tournament
            </Button>
            <Button size="lg" variant="glass" onClick={() => goTo("squad")}>
              Manage squad
            </Button>
          </>
        }
        aside={
          <>
            <HeroStat label="Rank" value={o.rank ? `#${o.rank}` : "—"} icon={LuTrophy} onClick={() => goTo("rankings")} />
            <HeroStat label="Points" value={o.points} icon={LuShieldAlert} onClick={() => goTo("rankings")} />
            <HeroStat label="Titles" value={o.titles} icon={LuTrophy} />
            <HeroStat label="Won / played" value={`${o.won}/${o.played}`} icon={LuCalendarClock} onClick={() => goTo("results")} />
          </>
        }
      />

      {o.ban && (
        <Alert tone="error" title="Your team is banned">
          {o.ban.endsOn ? `Until ${shortDate(o.ban.endsOn)}.` : "Until the association lifts it."} You cannot register for tournaments or play matches. Reason: {o.ban.reason}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="Needs your attention" subtitle="Most urgent first" icon={LuCircleAlert} />
          {todo.length ? (
            <ul className="mt-4 space-y-2">
              {todo.map((a) => (
                <li key={a.text}>
                  <button type="button" onClick={() => go(a.go)} className={cx("flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:brightness-95", ALERT_STYLE[a.tone])}>
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

        <Card className="xl:col-span-7">
          <CardHeader
            title="Recent form"
            subtitle="Runs your team scored, last matches"
            icon={LuTrendingUp}
            actions={
              form.length > 0 && (
                <div className="flex items-center gap-1.5" aria-label="Last results, oldest first">
                  {form.map((f, i) => (
                    <span key={i} title={`${f.res === "W" ? "Won" : f.res === "L" ? "Lost" : "Tied"} against ${f.against}`} className={cx("flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold ring-1 ring-inset", FORM_TONE[f.res])}>
                      {f.res}
                    </span>
                  ))}
                </div>
              )
            }
          />
          <ColumnChart className="mt-3" height={200} unit="runs" data={form.map((f) => ({ label: teamCode(f.against) || "—", value: f.runs }))} empty="Your results appear here once you have played." />
        </Card>
      </div>

      {hosted.length > 0 && (
        <section aria-label="Tournaments you host" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">Tournaments you host</h2>
            <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-spark-700 hover:underline" onClick={() => goTo("organize")}>
              Open Organize <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {hosted.slice(0, 4).map((t) => {
              const [label, tone] = STATUS[t.status] || [t.status, "slate"];
              const over = t.status === "completed" || t.status === "cancelled";
              return (
                <Card key={t.id} className="!p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-extrabold uppercase tracking-wide text-ink-950">{t.name || "Tournament"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-500">
                        <span>
                          {shortDate(t.startDate)} to {shortDate(t.endDate)}
                        </span>
                        {t.venue && (
                          <span className="inline-flex items-center gap-1">
                            <LuMapPin className="h-3.5 w-3.5" aria-hidden="true" /> {t.venue}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge tone={tone}>{t.live > 0 ? "Live now" : label}</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Meter label="Teams" value={t.teams} max={t.slots || t.teams || 1} note={t.slots ? `${t.teams} of ${t.slots}` : `${t.teams}`} />
                    <Meter label="Matches played" value={t.matchesPlayed} max={t.matches} note={t.matches ? `${t.matchesPlayed} of ${t.matches}` : "No schedule yet"} />
                  </div>
                  {!over && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" icon={LuSettings2} onClick={() => onManage(t.id)}>
                        Manage
                      </Button>
                      <Button size="sm" variant="secondary" icon={LuRepeat} onClick={() => onManage(t.id, 2)} title="A team pulled out? Put another team in its place">
                        Replace a team
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <section aria-label="Upcoming matches" className="space-y-3 xl:col-span-7">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">Your next matches</h2>
          </div>
          {o.upcoming.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {o.upcoming.map((f) => (
                <FixtureCard key={f.fixtureId} f={f} />
              ))}
            </div>
          ) : (
            <EmptyState icon={LuCalendarClock} title="No matches scheduled">
              When a host schedules a match for your team it appears here.
            </EmptyState>
          )}
        </section>

        <section aria-label="Announcements" className="space-y-3 xl:col-span-5">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">From the association</h2>
          {news.data && news.data.length > 0 ? (
            <div className="space-y-3">
              {news.data.map((a) => (
                <Card key={a.id} className="!p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-spark-grad text-white shadow-glow">{a.pinned ? <LuPin className="h-4 w-4" /> : <LuMegaphone className="h-4 w-4" />}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-950">{a.title}</p>
                      <p className="text-xs text-ink-400">{shortDate(a.createdAt)}</p>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-ink-700">{a.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={LuMegaphone} title="Nothing new">
              Announcements from the association show up here.
            </EmptyState>
          )}
        </section>
      </div>

      {played.length > 0 && (
        <section aria-label="Latest results" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink-950">Your latest results</h2>
            <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-spark-700 hover:underline" onClick={() => goTo("results")}>
              All results <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {played.slice(0, 4).map((m) => (
              <ResultCard key={m.matchId} m={m} onOpen={() => onOpenMatch(m.matchId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
