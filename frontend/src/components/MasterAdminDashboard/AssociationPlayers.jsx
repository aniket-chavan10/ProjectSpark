import React, { useEffect, useState } from 'react';
import { associationApi, shortDate } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { PlayerPhoto, SearchBox, TableWrap, Td, Th, useDebounced } from '../Public/ui';
import { btn } from '../ui/classes';

// Every player of every team, with contact details, figures, rating and ban status.
const AssociationPlayers = ({ goTo }) => {
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    associationApi.teams('').then((r) => setTeams(r.items)).catch(() => {});
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, teamId]);
  useEffect(() => {
    let alive = true;
    setData(null);
    associationApi.players({ q: search, teamId, page }).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [search, teamId, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Players</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBox value={q} onChange={setQ} placeholder="Search by name, mobile or email" />
        <select aria-label="Team" value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm">
          <option value="">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {error && <Banner tone="error">{error}</Banner>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <p className="text-sm text-slate-500">{data.total} players</p>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr><Th>Player</Th><Th>Team</Th><Th>Contact</Th><Th right>Matches</Th><Th right>Runs</Th><Th right>Wkts</Th><Th right>Rating</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td bold><span className="flex items-center gap-3"><PlayerPhoto player={p} size={32} />{p.name}</span></Td>
                  <Td>{p.teamName || '—'}</Td>
                  <Td><span className="block">{p.mobile}</span><span className="block text-xs text-slate-500">{p.email}</span></Td>
                  <Td right>{p.matches}</Td><Td right>{p.runs}</Td><Td right>{p.wickets}</Td><Td right bold>{p.rating ?? '—'}</Td>
                  <Td>
                    {p.banned ? (
                      <button type="button" className="text-left" onClick={() => goTo('bans')}><Pill tone="red">Banned{p.bannedUntil ? ` until ${shortDate(p.bannedUntil)}` : ''}</Pill></button>
                    ) : <Pill tone="green">Active</Pill>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="flex items-center justify-between">
            <button type="button" className={btn.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span className="text-sm text-slate-500">Page {page} of {pages}</span>
            <button type="button" className={btn.secondary} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
};

export default AssociationPlayers;
