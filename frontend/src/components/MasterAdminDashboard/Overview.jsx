import React, { useEffect, useState } from "react";
import { LuArrowRight, LuCalendarDays, LuInbox, LuTrophy, LuUsers, LuUsersRound } from "react-icons/lu";
import { publicApi } from "../../api/sparkApi";
import masterAdminApi from "../../api/masterAdminApi";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Spinner, Stat } from "../ui/kit";
import { FixtureCard, ResultCard, TeamLogo, useLoad } from "../Public/ui";

// The association's home: the numbers, what is waiting for a decision, how the teams stand.
export default function Overview({ goTo }) {
  const { data, error, loading } = useLoad(() => publicApi.overview(), []);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    masterAdminApi
      .getAllVillages()
      .then((r) => setPending((r.data || []).filter((v) => v.status === "pending").length))
      .catch(() => setPending(null));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const c = data.counts;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Association" title="Overview" subtitle="Teams, tournaments and results across the association." actions={<Button onClick={() => goTo("tournamentManager")} iconRight={LuArrowRight}>Plan a tournament</Button>} />

      {pending > 0 && (
        <Alert tone="warn" title={`${pending} team request${pending === 1 ? "" : "s"} waiting`}>
          Villages have asked to join. <button type="button" className="font-semibold underline underline-offset-2" onClick={() => goTo("teamRequests")}>Review them</button>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Teams" value={c.teams} icon={LuUsersRound} tone="green" onClick={() => goTo("all-teams")} />
        <Stat label="Players" value={c.players} icon={LuUsers} tone="blue" onClick={() => goTo("managePlayers")} />
        <Stat label="Tournaments" value={c.tournaments} icon={LuCalendarDays} tone="indigo" onClick={() => goTo("schedules")} />
        <Stat label="Matches played" value={c.matches} icon={LuTrophy} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" padded={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Team ranking" subtitle="By association points" icon={LuTrophy} actions={<Button variant="ghost" size="sm" onClick={() => goTo("rankings")}>Points rules</Button>} />
          </div>
          {data.topTeams.length ? (
            <ol className="mt-3 divide-y divide-slate-100">
              {data.topTeams.map((t, i) => (
                <li key={t.teamId} className="flex items-center gap-3 px-5 py-3">
                  <span className="tabular w-6 text-sm font-bold text-slate-400">{i + 1}</span>
                  <TeamLogo team={{ id: t.teamId, name: t.name, logo: t.logo }} size={34} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{t.name}</span>
                  {t.titles > 0 && <Badge tone="amber">{t.titles} title{t.titles === 1 ? "" : "s"}</Badge>}
                  <span className="tabular w-16 text-right text-sm font-bold text-slate-900">{t.points} <span className="text-xs font-medium text-slate-400">pts</span></span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-5">
              <EmptyState icon={LuTrophy} title="No ranking yet">Points appear once matches are completed.</EmptyState>
            </div>
          )}
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Coming up</h2>
          {data.upcoming.length ? data.upcoming.slice(0, 3).map((f) => <FixtureCard key={f.fixtureId} f={f} />) : <EmptyState icon={LuInbox} title="Nothing scheduled" />}
        </div>
      </div>

      {data.recentResults.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Latest results</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.recentResults.slice(0, 3).map((m) => (
              <ResultCard key={m.matchId} m={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
