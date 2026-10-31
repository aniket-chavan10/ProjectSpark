import React, { useEffect, useMemo, useState } from 'react';
import { associationApi, shortDate } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { btn, card, field, label } from '../ui/classes';

const STATUS_TONE = { pending: 'amber', allocated: 'blue', completed: 'green', cancelled: 'slate' };
const STAGE = { group: 'Group', semi: 'Semi-final', third_place: 'Third place', final: 'Final' };

// The association's calendar: the season plan (reserved hosting dates, which can be moved or cancelled)
// and every match of every tournament, by day.
const AssociationSchedules = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [moving, setMoving] = useState(null); // { id, startDate, days }
  const [busy, setBusy] = useState(false);

  const load = () => associationApi.schedules({ tournamentId }).then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, message) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await fn();
      setDone(message);
      setMoving(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (r) => {
    const reason = window.prompt(`Cancel the dates of ${r.host || 'this team'} (${shortDate(r.startDate)} – ${shortDate(r.endDate)})? You can give a reason (optional):`, '');
    if (reason === null) return;
    act(() => associationApi.cancelReservation(r.id, reason), 'Cancelled. The hosting team has been told.');
  };

  const tournaments = useMemo(() => {
    if (!data) return [];
    const seen = new Map();
    data.fixtures.forEach((f) => seen.set(f.tournamentId, f.tournament));
    return [...seen.entries()];
  }, [data]);

  const days = useMemo(() => {
    const by = new Map();
    (data ? data.fixtures : []).forEach((f) => {
      if (!by.has(f.date)) by.set(f.date, []);
      by.get(f.date).push(f);
    });
    return [...by.entries()];
  }, [data]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Schedules</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}
      {!data && !error && <Spinner />}

      {data && (
        <section aria-label="Season plan">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Season plan — who hosts when</h2>
          {data.reservations.length === 0 && <Banner>No dates reserved yet. Reserve dates for a hosting team in Tournaments.</Banner>}
          <ul className="space-y-2">
            {data.reservations.map((r) => (
              <li key={r.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-900">{shortDate(r.startDate)} – {shortDate(r.endDate)}</span>
                  <span className="text-sm text-slate-700">{r.host || 'Host not found'}</span>
                  <Pill tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Pill>
                  {r.tournament && <span className="text-xs text-slate-500">{r.tournament}</span>}
                  {r.status === 'pending' && (
                    <span className="ml-auto flex gap-2">
                      <button type="button" className={btn.secondary} onClick={() => setMoving({ id: r.id, startDate: r.startDate, days: r.days })}>Move</button>
                      <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => cancel(r)}>Cancel</button>
                    </span>
                  )}
                </div>
                {moving && moving.id === r.id && (
                  <form className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3" onSubmit={(e) => { e.preventDefault(); act(() => associationApi.moveReservation(r.id, { startDate: moving.startDate, reservedDays: moving.days }), 'Moved. The hosting team has been told.'); }}>
                    <div>
                      <label className={label} htmlFor="mv-start">New first day</label>
                      <input id="mv-start" type="date" className={field} value={moving.startDate} onChange={(e) => setMoving({ ...moving, startDate: e.target.value })} required />
                    </div>
                    <div>
                      <label className={label} htmlFor="mv-days">Days</label>
                      <input id="mv-days" type="number" min={1} max={7} className={`${field} w-24`} value={moving.days} onChange={(e) => setMoving({ ...moving, days: e.target.value })} />
                    </div>
                    <button type="submit" className={btn.primary} disabled={busy}>Save</button>
                    <button type="button" className={btn.secondary} onClick={() => setMoving(null)}>Close</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section aria-label="Matches">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">All matches</h2>
            <select aria-label="Tournament" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
              <option value="">All tournaments</option>
              {tournaments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          {days.length === 0 && <Banner>No matches scheduled yet.</Banner>}
          <div className="space-y-4">
            {days.map(([date, list]) => (
              <div key={date} className={`${card} overflow-hidden`}>
                <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">{shortDate(date)} <span className="font-normal text-slate-500">· {list.length} matches</span></p>
                <ul className="divide-y divide-slate-100">
                  {list.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
                      <span className="w-12 font-semibold tabular-nums text-emerald-700">{f.time}</span>
                      <span className="min-w-0 flex-1 text-slate-800">{f.team1 || 'TBD'} <span className="text-slate-400">vs</span> {f.team2 || 'TBD'}</span>
                      <span className="text-xs text-slate-500">{f.tournament} · {STAGE[f.stage] || f.stage}{f.group ? ` ${f.group}` : ''} · #{f.matchNo}</span>
                      {f.venue && <span className="text-xs text-slate-500">📍 {f.venue}</span>}
                      <Pill tone={f.status === 'completed' ? 'green' : f.status === 'ongoing' ? 'red' : 'slate'}>{f.status}</Pill>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AssociationSchedules;
