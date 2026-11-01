import React from "react";
import { LuArrowRight, LuBuilding2, LuCalendarClock, LuMegaphone, LuPin, LuShieldAlert, LuTrophy } from "react-icons/lu";
import { publicApi, shortDate, teamNewsApi } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Spinner, Stat, TeamLogo } from "../ui/kit";
import { FixtureCard, ResultCard, useLoad } from "../Public/ui";

// The team representative's home: standing in the rankings, the association's announcements, what is next.
const Dashboard = ({ overview, onOpenMatch, goTo }) => {
  const news = useLoad(() => teamNewsApi.announcements(), []);
  const o = overview;
  const results = useLoad(() => (o ? publicApi.matches({ teamId: o.id, pageSize: 3 }) : Promise.resolve(null)), [o && o.id]);

  if (!o) return <Spinner />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team dashboard"
        title={
          <span className="flex items-center gap-3">
            <TeamLogo team={o} size={44} />
            {o.name}
          </span>
        }
        subtitle="Where your team stands, what is coming up and what the association wants you to know."
        actions={
          <>
            <Button variant="secondary" onClick={() => goTo("squad")}>
              Manage squad
            </Button>
            <Button iconRight={LuArrowRight} onClick={() => goTo("apply")}>
              Apply to a tournament
            </Button>
          </>
        }
      />

      {o.ban && (
        <Alert tone="error" title="Your team is banned">
          {o.ban.endsOn ? `Until ${shortDate(o.ban.endsOn)}.` : "Until the association lifts it."} You cannot register for tournaments or play matches. Reason: {o.ban.reason}
        </Alert>
      )}

      {!o.logo && (
        <Alert tone="warn" title="Add your team logo">
          It appears on scorecards, rankings and the broadcast.{" "}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => goTo("profile")}>
            Add it now
          </button>
        </Alert>
      )}

      {o.hosting && o.hosting.length > 0 && (
        <Card className="border-brand-200 bg-brand-50/60">
          <CardHeader icon={LuBuilding2} title="You are hosting" subtitle="Dates the association has reserved for your tournament." />
          <ul className="mt-3 space-y-1.5 text-sm text-brand-950">
            {o.hosting.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">
                  {shortDate(h.startDate)} – {shortDate(h.endDate)}
                </span>
                {h.tournamentId ? <Badge tone="green">Tournament created</Badge> : <Badge tone="amber">Create it in Organize</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Standing" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-900">Where you stand</h2>
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline" onClick={() => goTo("rankings")}>
            Full rankings <LuArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Rank" value={o.rank ? `#${o.rank}` : "—"} icon={LuTrophy} tone="amber" />
          <Stat label="Points" value={o.points} icon={LuShieldAlert} tone="green" />
          <Stat label="Titles" value={o.titles} icon={LuTrophy} tone="indigo" />
          <Stat label="Won / played" value={`${o.won}/${o.played}`} icon={LuCalendarClock} tone="blue" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section aria-label="Upcoming matches" className="space-y-3 lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-900">Your next matches</h2>
          {o.upcoming.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
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

        <section aria-label="Announcements" className="space-y-3 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">From the association</h2>
          {news.data && news.data.length > 0 ? (
            <div className="space-y-3">
              {news.data.map((a) => (
                <Card key={a.id} className="!p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">{a.pinned ? <LuPin className="h-4 w-4" /> : <LuMegaphone className="h-4 w-4" />}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-500">{shortDate(a.createdAt)}</p>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
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

      {results.data && results.data.items.length > 0 && (
        <section aria-label="Latest results" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">Your latest results</h2>
            <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline" onClick={() => goTo("results")}>
              All results <LuArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.data.items.map((m) => (
              <ResultCard key={m.matchId} m={m} onOpen={() => onOpenMatch(m.matchId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
