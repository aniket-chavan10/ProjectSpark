import { Link, useParams } from "react-router-dom";
import { publicApi, shortDate } from "../../api/sparkApi";
import { Empty, ErrorBox, Loading, PlayerPhoto, PublicLayout, Section, StatBox, TableWrap, Td, Th, useLoad } from "../../components/Public/ui";

/** A player's career figures and last matches. */
export default function PlayerPage() {
  const { id } = useParams();
  const { data: p, error, loading } = useLoad(() => publicApi.player(id), [id]);

  return (
    <PublicLayout>
      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {p && (
        <>
          <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-ink-900 p-6 text-white shadow">
            <PlayerPhoto player={p} size={88} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{p.name}</h1>
              <p className="text-sm text-slate-300">
                {p.role}
                {p.teamName && (
                  <>
                    {" · "}
                    <Link to={`/teams/${p.teamId}`} className="hover:underline">
                      {p.teamName}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </section>

          {p.rating && (
            <Section title="Rating" className="mt-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[["Overall", "overall"], ["Batting", "batting"], ["Bowling", "bowling"], ["All-rounder", "allrounder"], ["Fielding", "fielding"]].map(([name, key]) => (
                  <StatBox key={key} label={`${name}${p.rating.ranks && p.rating.ranks[key] ? ` · #${p.rating.ranks[key]}` : ""}`} value={p.rating[key] ?? "—"} />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Out of 1000. Last five matches: {p.rating.form} points.</p>
            </Section>
          )}
          {p.matches === 0 ? (
            <div className="mt-8">
              <Empty>No finished matches yet.</Empty>
            </div>
          ) : (
            <>
              <Section title="Batting" className="mt-8">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  <StatBox label="Matches" value={p.matches} />
                  <StatBox label="Runs" value={p.runs} />
                  <StatBox label="Average" value={p.average ?? "—"} />
                  <StatBox label="Strike rate" value={p.strikeRate ?? "—"} />
                  <StatBox label="Highest" value={p.highest} />
                  <StatBox label="50s / 100s" value={`${p.fifties}/${p.hundreds}`} />
                </div>
              </Section>
              <Section title="Bowling and fielding">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  <StatBox label="Wickets" value={p.wickets} />
                  <StatBox label="Overs" value={p.overs} />
                  <StatBox label="Economy" value={p.economy ?? "—"} />
                  <StatBox label="Best" value={p.bestWickets} />
                  <StatBox label="Catches" value={p.catches} />
                  <StatBox label="Stumpings" value={p.stumpings} />
                </div>
              </Section>
              <Section title="Recent matches">
                <TableWrap>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Match</Th>
                      <Th right>Bat</Th>
                      <Th right>Bowl</Th>
                      <Th right>Field</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.recent.map((r) => (
                      <tr key={r.matchId} className="hover:bg-slate-50">
                        <Td>
                          <Link to={`/matches/${r.matchId}`} className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline">
                            {r.against || `Match ${r.matchId}`}
                          </Link>
                          <span className="block text-xs text-slate-500">
                            {r.tournament} · {shortDate(r.date)}
                          </span>
                        </Td>
                        <Td right bold>
                          {r.batted ? `${r.runs}${r.notOut ? "*" : ""} (${r.balls})` : "—"}
                        </Td>
                        <Td right bold>
                          {r.overs !== "0.0" ? `${r.wickets}/${r.runsConceded} (${r.overs})` : "—"}
                        </Td>
                        <Td right>{r.catches || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </Section>
            </>
          )}
        </>
      )}
    </PublicLayout>
  );
}
