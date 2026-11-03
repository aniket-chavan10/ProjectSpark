import React, { useEffect, useState } from 'react';
import { associationApi, shortDate } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { PlayerPhoto, SearchBox, TableWrap, Td, Th, useDebounced } from '../Public/ui';
import { btn } from '../ui/classes';
import { LuBan, LuChevronDown, LuList, LuUsersRound } from 'react-icons/lu';
import { Badge, cx, PlayerAvatar, Tabs, TeamLogo } from '../ui/kit';

// Every player of every team, with contact details, figures, rating and ban status.
const PlayersList = ({ goTo }) => {
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
                  <Td>{p.teamId ? <button type="button" className="font-semibold text-spark-700 hover:underline" onClick={() => goTo('all-teams', p.teamId)}>{p.teamName || '—'}</button> : (p.teamName || '—')}</Td>
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

// Every player grouped under their team: open a team to see its whole squad.
const TeamWise = ({ goTo }) => {
  const [q, setQ] = useState('');
  const [players, setPlayers] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [openIds, setOpenIds] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, first] = await Promise.all([associationApi.teams(''), associationApi.players({ page: 1, pageSize: 100 })]);
        let items = first.items;
        const pages = Math.min(Math.ceil(first.total / first.pageSize), 20);
        for (let pg = 2; pg <= pages; pg += 1) items = items.concat((await associationApi.players({ page: pg, pageSize: 100 })).items);
        if (alive) {
          setTeams(t.items);
          setPlayers(items);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!players) return <Spinner label="Loading every squad…" />;

  const text = q.trim().toLowerCase();
  const groups = teams
    .map((t) => ({ t, list: players.filter((p) => p.teamId === t.id && (!text || `${p.name} ${p.mobile} ${t.name}`.toLowerCase().includes(text))) }))
    .filter((g) => !text || g.list.length > 0);
  const toggle = (id) => setOpenIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} placeholder="Find a player or a team" />
      <p className="text-sm text-slate-500">{groups.length} teams · {players.length} players</p>
      <div className="space-y-3">
        {groups.map(({ t, list }) => {
          const open = text ? true : openIds.has(t.id);
          return (
            <section key={t.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => toggle(t.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <TeamLogo team={{ id: t.id, name: t.name, logo: t.logo }} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-extrabold uppercase tracking-wide text-ink-950">{t.name}</span>
                    <span className="block text-xs font-semibold text-ink-500">{t.players} player{t.players === 1 ? '' : 's'}{t.players < 11 ? ` · ${11 - t.players} short of a squad` : ''}</span>
                  </span>
                </button>
                {!open && list.length > 0 && (
                  <span className="hidden -space-x-2 sm:flex" aria-hidden="true">
                    {list.slice(0, 8).map((p) => <PlayerAvatar key={p.id} name={p.name || ''} photo={p.photo} id={p.id} size={30} ring />)}
                  </span>
                )}
                {t.banned && <Badge tone="red" icon={LuBan}>Banned</Badge>}
                <button type="button" className="text-sm font-bold text-spark-700 hover:underline" onClick={() => goTo('all-teams', t.id)}>Team page</button>
                <button type="button" onClick={() => toggle(t.id)} aria-label={open ? 'Hide players' : 'Show players'} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50">
                  <LuChevronDown className={cx('h-5 w-5 transition', open && 'rotate-180')} aria-hidden="true" />
                </button>
              </div>
              {open && (
                <ul className="grid gap-px border-t border-ink-100 bg-ink-100 sm:grid-cols-2 xl:grid-cols-3">
                  {list.length === 0 && <li className="bg-white px-4 py-3 text-sm text-ink-500 sm:col-span-2 xl:col-span-3">No players yet.</li>}
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 bg-white px-4 py-3">
                      <PlayerAvatar name={p.name || ''} photo={p.photo} id={p.id} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-950">{p.name}</p>
                        <p className="truncate text-xs text-ink-500">{p.mobile}{p.matches ? ` · ${p.matches} matches · ${p.runs} runs · ${p.wickets} wkts` : ''}</p>
                      </div>
                      {p.banned && <Badge tone="red">Banned</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

const AssociationPlayers = ({ goTo }) => {
  const [view, setView] = useState('list');
  return (
    <div className="space-y-5">
      <Tabs value={view} onChange={setView} tabs={[{ id: 'list', label: 'All players', icon: LuList }, { id: 'teams', label: 'Team by team', icon: LuUsersRound }]} />
      {view === 'list' ? <PlayersList goTo={goTo} /> : <TeamWise goTo={goTo} />}
    </div>
  );
};

export default AssociationPlayers;
