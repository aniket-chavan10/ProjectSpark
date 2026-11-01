import { useState } from "react";
import { Link } from "react-router-dom";
import { fileUrl, publicApi, shortDate } from "../../api/sparkApi";
import { Empty, ErrorBox, Loading, PublicLayout, SearchBox, useDebounced, useLoad } from "../../components/Public/ui";

export const STATUS = {
  completed: ["Completed", "bg-emerald-100 text-emerald-800"],
  live: ["Live now", "bg-red-100 text-red-700"],
  in_progress: ["In progress", "bg-brand-100 text-brand-800"],
  upcoming: ["Upcoming", "bg-amber-100 text-amber-800"],
};

export const StatusPill = ({ status }) => {
  const [text, cls] = STATUS[status] || STATUS.upcoming;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{text}</span>;
};

/** Every tournament, newest first, with its champion when it is over. */
export default function TournamentsPage() {
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { data, error, loading } = useLoad(() => publicApi.tournaments({ q: search }), [search]);

  return (
    <PublicLayout title="Tournaments" subtitle="Seasons, winners and every match played">
      <div className="mb-6">
        <SearchBox value={q} onChange={setQ} placeholder="Search a tournament or ground" />
      </div>
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {data && data.length === 0 && <Empty>No tournament found.</Empty>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(data || []).map((t) => (
          <Link key={t.id} to={`/tournaments/${t.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <div className="h-28 bg-ink-800" style={t.banner ? { backgroundImage: `url(${fileUrl(t.banner)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{t.name}</h2>
                <StatusPill status={t.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {shortDate(t.startDate)} – {shortDate(t.endDate)}
                {t.venue ? ` · ${t.venue}` : ""}
              </p>
              {t.champion ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Champions <strong>{t.champion}</strong>
                  {t.runnerUp ? <span className="text-amber-800"> · Runners-up {t.runnerUp}</span> : null}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {t.teams} teams · {t.matchesPlayed} matches played
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </PublicLayout>
  );
}
