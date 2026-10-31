import React, { useState } from 'react';
import { associationApi } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { SearchBox, TableWrap, TeamLogo, Td, Th, useDebounced, useLoad } from '../Public/ui';

// Every team of the association: who runs it, how many players, where it stands, whether it is banned.
const AssociationTeams = ({ goTo }) => {
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data, error, loading } = useLoad(() => associationApi.teams(search), [search]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
      {data && data.pendingRequests > 0 && (
        <Banner tone="warn">
          <strong>{data.pendingRequests} team{data.pendingRequests === 1 ? ' is' : 's are'} waiting for your approval.</strong>{' '}
          <button type="button" className="font-semibold underline" onClick={() => goTo('teamRequests')}>Review requests</button>
        </Banner>
      )}
      <SearchBox value={q} onChange={setQ} placeholder="Search a team, village or admin" />
      {loading && <Spinner />}
      {error && <Banner tone="error">{error}</Banner>}
      {data && (
        <>
          <p className="text-sm text-slate-500">{data.items.length} teams</p>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr><Th>Team</Th><Th>Admin</Th><Th right>Players</Th><Th right>Tournaments</Th><Th right>Rank</Th><Th right>Points</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td bold>
                    <span className="flex items-center gap-3">
                      <TeamLogo team={t} size={32} />
                      <span><span className="block">{t.name}</span><span className="block text-xs font-normal text-slate-500">{t.village || ''}</span></span>
                    </span>
                  </Td>
                  <Td>
                    <span className="block">{t.admin.name || '—'}</span>
                    <span className="block text-xs text-slate-500">{[t.admin.phone, t.admin.email].filter(Boolean).join(' · ')}</span>
                  </Td>
                  <Td right>{t.players}</Td>
                  <Td right>{t.tournaments}</Td>
                  <Td right>{t.rank ? `#${t.rank}` : '—'}</Td>
                  <Td right bold>{t.points}</Td>
                  <Td>
                    {t.banned ? <Pill tone="red">Banned</Pill> : <Pill tone="green">Active</Pill>} {!t.logo && <Pill tone="amber">No logo</Pill>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </div>
  );
};

export default AssociationTeams;
