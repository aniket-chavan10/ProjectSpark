import React, { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuCrown, LuHistory, LuSearch, LuTrophy } from "react-icons/lu";
import { publicApi, shortDate } from "../../api/sparkApi";
import { Alert, Badge, Button, Card, cx, EmptyState, Spinner, Tabs } from "../ui/kit";
import { field } from "../ui/classes";
import { ResultCard, useDebounced, useLoad } from "../Public/ui";

const PAGE = 12;

function Matches({ tournaments, teams, tournamentId, setTournamentId }) {
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const [teamId, setTeamId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => setPage(1), [search, teamId, tournamentId]);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    publicApi
      .matches({ q: search, tournamentId, teamId, page, pageSize: PAGE })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [search, tournamentId, teamId, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = !!(search || tournamentId || teamId);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input className={cx(field, "!pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a team or tournament" aria-label="Search results" />
        </div>
        <select className={field} aria-label="Tournament" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
          <option value="">All tournaments</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || `Tournament ${t.id}`}
            </option>
          ))}
        </select>
        <select className={field} aria-label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">
              {data.total} finished match{data.total === 1 ? "" : "es"}
              {filtered ? " found" : ""}
            </p>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => { setQ(""); setTeamId(""); setTournamentId(""); }}>
                Clear filters
              </Button>
            )}
          </div>
          {data.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {data.items.map((m) => (
                <ResultCard key={m.matchId} m={m} />
              ))}
            </div>
          ) : (
            <EmptyState icon={LuHistory} title="No finished matches">{filtered ? "Nothing matches these filters." : "Results appear here once matches are completed."}</EmptyState>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" icon={LuChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Newer
              </Button>
              <span className="text-sm font-semibold text-ink-500">
                Page {page} of {pages}
              </span>
              <Button variant="secondary" size="sm" iconRight={LuChevronRight} disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Older
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tournaments({ tournaments, onOpen }) {
  const done = tournaments.filter((t) => t.status === "completed");
  if (!tournaments.length) return <EmptyState icon={LuTrophy} title="No tournaments yet">Finished tournaments appear here with their champions.</EmptyState>;
  return (
    <Card padded={false}>
      <ul className="divide-y divide-ink-100">
        {[...done, ...tournaments.filter((t) => t.status !== "completed")].map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onOpen(String(t.id))} className="grid w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-ink-50 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink-950">{t.name || "Tournament"}</span>
                <span className="text-xs text-ink-500">
                  {shortDate(t.startDate)} to {shortDate(t.endDate)}
                  {t.venue ? ` · ${t.venue}` : ""}
                </span>
              </span>
              <span className="text-sm">
                {t.champion ? (
                  <Badge tone="amber" icon={LuCrown}>
                    {t.champion}
                  </Badge>
                ) : (
                  <span className="text-ink-400">No champion yet</span>
                )}
              </span>
              <span className="text-sm text-ink-600">{t.runnerUp ? `Runner-up ${t.runnerUp}` : ""}</span>
              <span className="tabular text-xs font-semibold text-ink-500">
                {t.teams} teams · {t.matchesPlayed} played
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Every finished match and tournament, newest first. Pick a tournament or a team to narrow it down.
export default function Results() {
  const { data: tournaments, error } = useLoad(() => publicApi.tournaments({}), []);
  const { data: teams } = useLoad(() => publicApi.teams(""), []);
  const [tab, setTab] = useState("matches");
  const [tournamentId, setTournamentId] = useState("");

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!tournaments) return <Spinner />;

  const teamList = Array.isArray(teams) ? teams : teams && (teams.items || teams.teams) ? teams.items || teams.teams : [];

  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "matches", label: "Matches", icon: LuHistory },
          { id: "tournaments", label: "Tournaments", icon: LuTrophy, count: tournaments.length },
        ]}
      />
      {tab === "matches" ? (
        <Matches tournaments={tournaments} teams={teamList.map((t) => ({ id: t.id, name: t.name || t.team_name }))} tournamentId={tournamentId} setTournamentId={setTournamentId} />
      ) : (
        <Tournaments
          tournaments={tournaments}
          onOpen={(id) => {
            setTournamentId(id);
            setTab("matches");
          }}
        />
      )}
    </div>
  );
}
