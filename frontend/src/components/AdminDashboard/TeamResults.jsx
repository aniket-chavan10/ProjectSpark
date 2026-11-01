import React, { useEffect, useState } from 'react';
import { publicApi, shortDate } from '../../api/sparkApi';
import { btn } from '../ui/classes';
import Scorecard from '../Public/Scorecard';
import { Empty, Loading, Medal, ResultCard, SearchBox, Tabs, useDebounced, useLoad } from '../Public/ui';
import { Banner } from './Team/common';

// Results for the team: its own matches with scorecards, a search across every finished match,
// and who won each tournament.
const TeamResults = ({ teamId, openMatchId, clearOpen }) => {
  const [tab, setTab] = useState('mine');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [matchId, setMatchId] = useState(openMatchId || null);

  useEffect(() => {
    if (openMatchId) setMatchId(openMatchId);
  }, [openMatchId]);

  const mine = useLoad(() => (tab === 'mine' && teamId ? publicApi.matches({ teamId, q: search, pageSize: 30 }) : Promise.resolve(null)), [tab, teamId, search]);
  const all = useLoad(() => (tab === 'all' ? publicApi.matches({ q: search, pageSize: 30 }) : Promise.resolve(null)), [tab, search]);
  const tournaments = useLoad(() => (tab === 'winners' ? publicApi.tournaments({}) : Promise.resolve(null)), [tab]);
  const detail = useLoad(() => (matchId ? publicApi.match(matchId) : Promise.resolve(null)), [matchId]);

  const back = () => {
    setMatchId(null);
    if (clearOpen) clearOpen();
  };

  if (matchId) {
    return (
      <div className="space-y-4">
        <button type="button" className={btn.secondary} onClick={back}>
          ← Back to results
        </button>
        {detail.loading && <Loading />}
        {detail.error && <Banner tone="error">{detail.error}</Banner>}
        {detail.data && (
          <>
            <div className="rounded-xl bg-slate-900 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                {detail.data.tournament} · {detail.data.stageLabel} · {shortDate(detail.data.date)}
              </p>
              <p className="mt-2 text-lg font-bold">{detail.data.teams.map((t) => t.name).join(' vs ')}</p>
              <p className="text-amber-300">{detail.data.result}</p>
              {detail.data.playerOfMatch && <p className="mt-1 text-sm text-slate-300">Player of the match: {detail.data.playerOfMatch.name}</p>}
            </div>
            <Scorecard innings={detail.data.scorecard} />
          </>
        )}
      </div>
    );
  }

  const list = tab === 'mine' ? mine : all;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Results</h1>
      <Tabs
        tabs={[
          { id: 'mine', name: 'My matches' },
          { id: 'all', name: 'All matches' },
          { id: 'winners', name: 'Tournament winners' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab !== 'winners' && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder={tab === 'mine' ? 'Search by opponent or tournament' : 'Search any team or tournament'} />
          {list.loading && <Loading />}
          {list.error && <Banner tone="error">{list.error}</Banner>}
          {list.data && list.data.items.length === 0 && <Empty>No finished matches found.</Empty>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(list.data ? list.data.items : []).map((m) => (
              <ResultCard key={m.matchId} m={m} onOpen={() => setMatchId(m.matchId)} />
            ))}
          </div>
        </>
      )}

      {tab === 'winners' && (
        <>
          {tournaments.loading && <Loading />}
          {tournaments.data && tournaments.data.length === 0 && <Empty>No tournaments yet.</Empty>}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {(tournaments.data || []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold text-slate-900">{t.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{shortDate(t.startDate)}</span>
                </span>
                {t.champion ? (
                  <span className="text-slate-700">
                    <Medal position={1} /> <strong>{t.champion}</strong>
                    {t.runnerUp ? <span className="text-slate-500"> · <Medal position={2} /> {t.runnerUp}</span> : null}
                  </span>
                ) : (
                  <span className="text-slate-400">Not finished</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default TeamResults;
