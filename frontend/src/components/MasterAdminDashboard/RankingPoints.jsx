import React, { useEffect, useState } from 'react';
import { associationApi, publicApi } from '../../api/sparkApi';
import { TeamRankingTable } from '../Public/Rankings';
import { Banner, Spinner } from '../AdminDashboard/Team/common';
import { btn, card, field } from '../ui/classes';

// The team ranking and the points a team earns for each round it clears.
// Changing a value only affects new results until "Recalculate" re-scores every finished match.
const RankingPoints = () => {
  const [rules, setRules] = useState(null);
  const [draft, setDraft] = useState({});
  const [table, setTable] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTable = () => publicApi.teamRankings().then((r) => setTable(r.items)).catch((e) => setError(e.message));
  useEffect(() => {
    associationApi
      .pointsRules()
      .then((r) => {
        setRules(r);
        setDraft(Object.fromEntries(r.map((x) => [x.ruleKey, x.points])));
      })
      .catch((e) => setError(e.message));
    loadTable();
  }, []);

  const changed = rules && rules.some((r) => Number(draft[r.ruleKey]) !== r.points);

  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const out = await fn();
      setDone(typeof message === 'function' ? message(out) : message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(
      async () => {
        const saved = await associationApi.savePointsRules(rules.map((r) => ({ ruleKey: r.ruleKey, points: Number(draft[r.ruleKey]) })));
        setRules(saved);
      },
      'Saved. New results use these points; press “Recalculate” to apply them to matches already played.'
    );

  const recalc = () => {
    if (!window.confirm('Re-score every finished match with the current points? The ranking will be rebuilt.')) return;
    return run(() => associationApi.recalculate().then(async (r) => { await loadTable(); return r; }), (r) => `Done: ${r.matches} matches and ${r.tournaments} tournaments rebuilt.`);
  };

  const release = () => {
    if (!window.confirm('Tell every team the season schedule (who hosts which dates)?')) return;
    return run(() => associationApi.releaseSeasonPlan(), (r) => (r.dates ? `Sent to ${r.notified} teams (${r.dates} hosting dates).` : 'There are no upcoming reserved dates to announce yet.'));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Rankings and points</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}

      <section className={`${card} p-5`}>
        <h2 className="text-base font-bold text-slate-900">Points a team earns</h2>
        <p className="mb-4 text-sm text-slate-600">A team gets the points of a round when it wins a match in that round. A champion collects every round on the way, so the final is worth the most.</p>
        {!rules && <Spinner />}
        <div className="grid gap-3 sm:grid-cols-2">
          {(rules || []).map((r) => (
            <label key={r.ruleKey} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700">{r.label}</span>
              <input
                type="number"
                min={0}
                max={1000}
                className={`${field} w-24 text-right`}
                value={draft[r.ruleKey] ?? ''}
                onChange={(e) => setDraft({ ...draft, [r.ruleKey]: e.target.value })}
                aria-label={r.label}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={btn.primary} disabled={busy || !changed} onClick={save}>
            Save points
          </button>
          <button type="button" className={btn.secondary} disabled={busy} onClick={recalc}>
            Recalculate everything
          </button>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className="text-base font-bold text-slate-900">Season schedule</h2>
        <p className="mb-3 text-sm text-slate-600">When the plan of hosting dates is ready, send it to every team.</p>
        <button type="button" className={btn.secondary} disabled={busy} onClick={release}>
          Release the season schedule to all teams
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold text-slate-900">Current team ranking (all time)</h2>
        {!table && !error && <Spinner />}
        {table && <TeamRankingTable items={table} />}
      </section>
    </div>
  );
};

export default RankingPoints;
