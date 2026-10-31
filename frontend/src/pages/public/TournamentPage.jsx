import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi, shortDate } from "../../api/sparkApi";
import { PlayerRankingTable } from "../../components/Public/Rankings";
import { Empty, ErrorBox, Loading, Medal, PublicLayout, Section, Tabs, TeamLogo, useLoad } from "../../components/Public/ui";
import { StatusPill } from "./TournamentsPage";

const STAGES = [
  ["final", "Final"],
  ["third_place", "Third-place match"],
  ["semi", "Semi-finals"],
  ["group", "Group matches"],
];

function FixtureRow({ f }) {
  const body = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">#{f.matchNo}</span>
      <span className="min-w-0 flex-1 font-semibold text-slate-800">
        {f.team1 ? f.team1.name : "To be decided"} <span className="font-normal text-slate-400">vs</span> {f.team2 ? f.team2.name : "To be decided"}
      </span>
      <span className="text-xs text-slate-500">{f.stage === "group" ? f.stageLabel : ""}</span>
      <span className={`text-xs font-semibold ${f.status === "completed" ? "text-emerald-700" : "text-slate-500"}`}>
        {f.status === "completed" ? f.result : f.date ? `${shortDate(f.date)} ${f.time || ""}` : "Not scheduled"}
      </span>
    </div>
  );
  return f.matchId ? (
    <Link to={`/matches/${f.matchId}`} className="block hover:bg-emerald-50">
      {body}
    </Link>
  ) : (
    body
  );
}

/** One tournament: winners, points earned, every match, the best players. */
export default function TournamentPage() {
  const { id } = useParams();
  const { data: t, error, loading } = useLoad(() => publicApi.tournament(id), [id]);
  const [tab, setTab] = useState("overview");

  return (
    <PublicLayout>
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {t && (
        <>
          <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{t.name}</h1>
              <StatusPill status={t.status} />
            </div>
            <p className="mt-1 text-sm text-slate-300">
              {shortDate(t.startDate)} – {shortDate(t.endDate)}
              {t.venue ? ` · ${t.venue}` : ""} · {t.teams} teams
            </p>
            {t.positions.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {t.positions.map((p) => (
                  <Link key={p.position} to={`/teams/${p.teamId}`} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15">
                    <span className="text-2xl">
                      <Medal position={p.position} />
                    </span>
                    <TeamLogo team={{ id: p.teamId, name: p.teamName, logo: p.logo }} size={40} />
                    <span className="min-w-0 truncate font-bold">{p.teamName}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="mt-6">
            <Tabs
              tabs={[
                { id: "overview", name: "Matches" },
                { id: "points", name: "Points earned" },
                { id: "players", name: "Top players" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          {tab === "overview" && (
            <>
              {t.fixtures.length === 0 && <Empty>The match schedule has not been published yet.</Empty>}
              {STAGES.map(([stage, title]) => {
                const list = t.fixtures.filter((f) => f.stage === stage);
                if (!list.length) return null;
                return (
                  <Section key={stage} title={title}>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {list.map((f) => (
                        <FixtureRow key={f.fixtureId} f={f} />
                      ))}
                    </div>
                  </Section>
                );
              })}
            </>
          )}

          {tab === "points" &&
            (t.pointsEarned.length === 0 ? (
              <Empty>No points yet. Teams earn points for every round they clear.</Empty>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {t.pointsEarned.map((p, i) => (
                  <div key={p.teamId} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                    <span className="flex items-center gap-3">
                      <span className="w-6 font-bold text-slate-400">{i + 1}</span>
                      <Link to={`/teams/${p.teamId}`} className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline">
                        {p.teamName}
                      </Link>
                    </span>
                    <strong className="tabular-nums">{p.points} pts</strong>
                  </div>
                ))}
              </div>
            ))}

          {tab === "players" && (
            <div className="space-y-8">
              <Section title="Top run scorers">
                <PlayerRankingTable category="batting" items={t.topBatters} compact />
              </Section>
              <Section title="Top wicket takers">
                <PlayerRankingTable category="bowling" items={t.topBowlers} compact />
              </Section>
            </div>
          )}
        </>
      )}
    </PublicLayout>
  );
}
