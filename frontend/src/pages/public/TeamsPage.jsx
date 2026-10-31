import { useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../api/sparkApi";
import { Empty, ErrorBox, Loading, PublicLayout, SearchBox, TeamLogo, useDebounced, useLoad } from "../../components/Public/ui";

/** Every team of the association. */
export default function TeamsPage() {
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { data, error, loading } = useLoad(() => publicApi.teams(search), [search]);

  return (
    <PublicLayout title="Teams" subtitle="The teams that play under the association">
      <div className="mb-6">
        <SearchBox value={q} onChange={setQ} placeholder="Search a team or village" />
      </div>
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {data && data.length === 0 && <Empty>No team found.</Empty>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data || []).map((t) => (
          <Link
            key={t.id}
            to={`/teams/${t.id}`}
            className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <TeamLogo team={t} size={72} />
            <p className="mt-3 w-full truncate text-base font-bold text-slate-900">{t.name}</p>
            {t.village && <p className="text-xs text-slate-500">{t.village}</p>}
            <div className="mt-3 flex w-full justify-around border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                <strong className="block text-base text-slate-900">{t.rank ? `#${t.rank}` : "—"}</strong>Rank
              </span>
              <span>
                <strong className="block text-base text-slate-900">{t.points}</strong>Points
              </span>
              <span>
                <strong className="block text-base text-slate-900">{t.titles}</strong>Titles
              </span>
            </div>
          </Link>
        ))}
      </div>
    </PublicLayout>
  );
}
