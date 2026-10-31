import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { shortDate, teamNewsApi } from '../../api/sparkApi';
import { RatingTable } from '../Public/Rankings';
import { Empty, Loading, StatBox, TableWrap, TeamLogo, Td, Th, useLoad } from '../Public/ui';
import { Banner } from './Team/common';

// "Where do we stand": the whole ranking table with this team's row marked, where its points came from,
// how its own players are rated, and the dates reserved for it to host.
const TeamRankings = ({ teamId }) => {
  const [season, setSeason] = useState('');
  const { data, error, loading } = useLoad(() => teamNewsApi.rankings(season), [season]);

  if (loading && !data) return <Loading />;
  if (error) return <Banner tone="error">{error}</Banner>;
  if (!data) return null;
  const { mine, table } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Rankings</h1>
        <select aria-label="Season" value={season} onChange={(e) => setSeason(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
          <option value="">All time</option>
          {data.seasons.map((y) => (
            <option key={y} value={y}>Season {y}</option>
          ))}
        </select>
      </div>

      <section aria-label="Your standing" className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-5 text-white">
        {mine ? (
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Your rank</p>
              <p className="text-5xl font-extrabold">#{mine.rank} <span className="text-lg font-medium text-slate-300">of {data.teamCount}</span></p>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-3 text-slate-900 sm:max-w-md">
              <StatBox label="Points" value={mine.points} />
              <StatBox label="Titles" value={mine.titles} />
              <StatBox label="Won / played" value={`${mine.won}/${mine.played}`} />
            </div>
          </div>
        ) : (
          <p className="text-slate-200">Your team has no points yet. Points are earned for every round you win in a tournament.</p>
        )}
      </section>

      <section aria-label="Team ranking">
        <h2 className="mb-2 text-lg font-bold text-slate-900">All teams</h2>
        <TableWrap>
          <thead className="bg-slate-50">
            <tr><Th>#</Th><Th>Team</Th><Th right>Played</Th><Th right>Won</Th><Th right>Titles</Th><Th right>Points</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.slice(0, 50).map((r) => (
              <tr key={r.teamId} className={r.teamId === Number(teamId) ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' : ''}>
                <Td bold>{r.rank}</Td>
                <Td bold>
                  <span className="flex items-center gap-3">
                    <TeamLogo team={{ id: r.teamId, name: r.name, logo: r.logo }} size={26} />
                    {r.name} {r.teamId === Number(teamId) && <span className="rounded bg-emerald-600 px-1.5 text-[10px] font-bold uppercase text-white">You</span>}
                  </span>
                </Td>
                <Td right>{r.played}</Td><Td right>{r.won}</Td><Td right>{r.titles}</Td><Td right bold>{r.points}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {table.length === 0 && <Empty>No ranking yet.</Empty>}
      </section>

      <section aria-label="Where your points came from">
        <h2 className="mb-2 text-lg font-bold text-slate-900">Where your points came from</h2>
        {data.breakdown.length === 0 && <Empty>Nothing yet.</Empty>}
        <div className="grid gap-3 sm:grid-cols-2">
          {data.breakdown.map((t) => (
            <div key={t.tournamentId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <Link to={`/tournaments/${t.tournamentId}`} className="font-bold text-slate-900 hover:text-emerald-700 hover:underline">{t.name}</Link>
                <span className="text-lg font-extrabold tabular-nums text-emerald-700">{t.total}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {t.parts.map((p) => (
                  <li key={p.rule} className="flex justify-between"><span>{p.label}</span><span className="tabular-nums">+{p.points}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Your players">
        <h2 className="mb-2 text-lg font-bold text-slate-900">Your players, by rating</h2>
        <RatingTable items={data.players} compact />
        <p className="mt-2 text-xs text-slate-500">A rating out of 1000 from every match played. Open a player on the public site to see the details.</p>
      </section>

      {data.hosting.length > 0 && (
        <section aria-label="Hosting dates">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Dates you are hosting</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {data.hosting.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold text-slate-800">{shortDate(h.startDate)} – {shortDate(h.endDate)}</span>
                <span className="text-slate-500">{h.tournamentId ? 'Tournament created' : 'Reserved for you'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default TeamRankings;
