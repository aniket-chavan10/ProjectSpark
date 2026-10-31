import { useSearchParams } from "react-router-dom";
import { publicApi } from "../../api/sparkApi";
import { CATEGORIES, PlayerRankingTable, RATING_CATEGORIES, RatingTable, TeamRankingTable } from "../../components/Public/Rankings";
import { ErrorBox, Loading, PublicLayout, Tabs, useLoad } from "../../components/Public/ui";

const TABS = [{ id: "teams", name: "Teams" }, { id: "ratings", name: "Player ratings" }, ...CATEGORIES];

/** Team ranking by points, and the best players by role (batters, bowlers, all-rounders, keepers). */
export default function RankingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "teams";
  const season = params.get("season") || "";
  const set = (patch) => setParams({ tab, ...(season ? { season } : {}), ...patch });

  const teams = useLoad(() => (tab === "teams" ? publicApi.teamRankings(season) : Promise.resolve(null)), [tab, season]);
  const players = useLoad(() => (tab !== "teams" && tab !== "ratings" ? publicApi.playerRankings(tab, season) : Promise.resolve(null)), [tab, season]);
  const rated = useLoad(() => (tab === "ratings" ? publicApi.ratings(params.get("by") || "overall", season) : Promise.resolve(null)), [tab, season, params.get("by")]);
  const seasons = useLoad(() => publicApi.teamRankings(), []);

  const state = tab === "teams" ? teams : tab === "ratings" ? rated : players;
  const by = params.get("by") || "overall";
  const years = seasons.data ? seasons.data.seasons : [];

  return (
    <PublicLayout title="Rankings" subtitle={tab === "teams" ? "Points for every round a team clears in a tournament" : tab === "ratings" ? "A rating out of 1000, built from every match: runs, wickets, catches, strike rate and economy against the match, recent form and the strength of the opposition" : "The best players of the association"}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <Tabs tabs={TABS} value={tab} onChange={(id) => set({ tab: id })} />
        <select
          aria-label="Season"
          value={season}
          onChange={(e) => {
            const next = { tab };
            if (e.target.value) next.season = e.target.value;
            setParams(next);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">All time</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Season {y}
            </option>
          ))}
        </select>
      </div>

      {state.loading && <Loading />}
      {state.error && <ErrorBox>{state.error}</ErrorBox>}
      {tab === "ratings" && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Rating type">
          {RATING_CATEGORIES.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={by === c.id} onClick={() => setParams({ tab, by: c.id, ...(season ? { season } : {}) })}
              className={`rounded-md px-3 py-1 text-sm font-semibold ${by === c.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {state.data && tab === "teams" && <TeamRankingTable items={state.data.items} />}
      {state.data && tab === "ratings" && <RatingTable items={state.data.items} />}
      {state.data && tab !== "teams" && tab !== "ratings" && <PlayerRankingTable category={tab} items={state.data.items} />}
    </PublicLayout>
  );
}
