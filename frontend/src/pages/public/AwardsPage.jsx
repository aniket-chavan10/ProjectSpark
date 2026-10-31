import { Link, useSearchParams } from "react-router-dom";
import { publicApi } from "../../api/sparkApi";
import SponsorStrip from "../../components/Public/Sponsors";
import { Empty, ErrorBox, Loading, PlayerPhoto, PublicLayout, TeamLogo, useLoad } from "../../components/Public/ui";

export const Winner = ({ e, size = 56 }) =>
  e.subjectType === "team" ? <TeamLogo team={{ id: e.subjectId, name: e.name, logo: e.photo }} size={size} /> : <PlayerPhoto player={{ name: e.name, photo: e.photo }} size={size} />;

const href = (e) => (e.subjectType === "team" ? `/teams/${e.subjectId}` : `/players/${e.subjectId}`);

function AwardCard({ a }) {
  const winner = a.entries.find((e) => e.rank === 1);
  const rest = a.entries.filter((e) => e.rank !== 1);
  if (!winner) return null;
  if (a.slots) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{a.label}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {a.entries.map((e) => (
            <Link key={e.subjectId} to={href(e)} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-slate-200 hover:ring-emerald-400">
              <Winner e={e} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">{e.name}</span>
                <span className="block truncate text-xs text-slate-500">{(e.valueText || "").split(" · ")[0]}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{a.label}</p>
      {a.tournament && <p className="text-xs text-slate-500">{a.tournament}</p>}
      <Link to={href(winner)} className="mt-3 flex flex-col items-center gap-2 hover:opacity-90">
        <span className="relative">
          <Winner e={winner} size={72} />
          <span className="absolute -right-2 -top-2 text-xl" aria-hidden="true">🏆</span>
        </span>
        <span className="text-lg font-extrabold text-slate-900">{winner.name}</span>
        {winner.teamName && <span className="-mt-1 text-xs text-slate-500">{winner.teamName}</span>}
        <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800">{winner.valueText}</span>
      </Link>
      {rest.length > 0 && (
        <p className="mt-3 border-t border-amber-100 pt-2 text-xs text-slate-500">
          Nominees: {rest.map((e) => e.name).join(", ")}
        </p>
      )}
    </div>
  );
}

/** The awards of a season, published by the association. */
export default function AwardsPage() {
  const [params, setParams] = useSearchParams();
  const season = params.get("season") || "";
  const { data, error, loading } = useLoad(() => publicApi.awards(season), [season]);

  const seasonAwards = data ? data.awards.filter((a) => !a.tournamentId) : [];
  const byTournament = data ? data.awards.filter((a) => a.tournamentId) : [];
  const tournaments = [...new Set(byTournament.map((a) => a.tournament))];

  return (
    <PublicLayout
      title="Awards"
      subtitle="The best players and teams of the season"
      actions={
        data && data.season && seasonAwards.length > 0 ? (
          <div className="flex items-center gap-3">
            <select aria-label="Season" value={data.season} onChange={(e) => setParams({ season: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              {data.seasons.map((y) => (
                <option key={y} value={y}>
                  Season {y}
                </option>
              ))}
            </select>
            <Link to={`/awards/show?season=${data.season}`} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 shadow hover:bg-amber-300">
              ▶ Award show
            </Link>
          </div>
        ) : null
      }
    >
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {data && data.awards.length === 0 && <Empty>The awards for this season have not been announced yet.</Empty>}
      {seasonAwards.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {seasonAwards.map((a) => (
            <AwardCard key={a.key} a={a} />
          ))}
        </div>
      )}
      {tournaments.map((t) => (
        <section key={t} className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-slate-900">{t}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {byTournament.filter((a) => a.tournament === t).map((a) => (
              <AwardCard key={`${a.key}${a.tournamentId}`} a={a} />
            ))}
          </div>
        </section>
      ))}
      <SponsorStrip placement="awards" className="mt-10" />
    </PublicLayout>
  );
}
