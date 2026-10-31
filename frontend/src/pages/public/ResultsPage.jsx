import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { publicApi } from "../../api/sparkApi";
import SponsorStrip from "../../components/Public/Sponsors";
import { Empty, ErrorBox, Loading, PublicLayout, ResultCard, SearchBox, useDebounced, useLoad } from "../../components/Public/ui";

/** All finished matches. Type a team or tournament name to find one. */
export default function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const tournamentId = params.get("tournament") || "";
  const search = useDebounced(q);
  const [extra, setExtra] = useState([]); // pages after the first
  const [page, setPage] = useState(1);

  const tournaments = useLoad(() => publicApi.tournaments({}), []);
  const first = useLoad(() => publicApi.matches({ q: search, tournamentId, page: 1 }), [search, tournamentId]);

  useEffect(() => {
    setExtra([]);
    setPage(1);
  }, [search, tournamentId]);

  const more = async () => {
    const next = await publicApi.matches({ q: search, tournamentId, page: page + 1 });
    setExtra((e) => [...e, ...next.items]);
    setPage(page + 1);
  };

  const items = first.data ? [...first.data.items, ...extra] : [];
  const total = first.data ? first.data.total : 0;

  return (
    <PublicLayout title="Results" subtitle="Every finished match, with its full scorecard">
      <SponsorStrip placement="results" heading={false} className="mb-6" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={q} onChange={setQ} placeholder="Search a team or tournament" />
        <select
          aria-label="Tournament"
          value={tournamentId}
          onChange={(e) => setParams(e.target.value ? { tournament: e.target.value } : {})}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">All tournaments</option>
          {(tournaments.data || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {first.loading && <Loading />}
      {first.error && <ErrorBox>{first.error}</ErrorBox>}
      {!first.loading && !first.error && items.length === 0 && <Empty>No finished matches found.</Empty>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <ResultCard key={m.matchId} m={m} />
        ))}
      </div>
      {items.length < total && (
        <div className="mt-6 text-center">
          <button type="button" onClick={more} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Show more ({total - items.length} left)
          </button>
        </div>
      )}
    </PublicLayout>
  );
}
