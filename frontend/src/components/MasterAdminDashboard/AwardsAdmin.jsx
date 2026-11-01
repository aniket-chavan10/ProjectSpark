import React, { useEffect, useState } from 'react';
import { associationApi } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { useDebounced } from '../Public/ui';
import { btn, card, field, label } from '../ui/classes';

const TONE = { suggested: 'amber', confirmed: 'blue', published: 'green' };

// Season awards: the system suggests winners from the data, the association confirms or changes them, then publishes.
const AwardsAdmin = () => {
  const thisYear = new Date().getFullYear();
  const [seasons, setSeasons] = useState([thisYear]);
  const [season, setSeason] = useState(thisYear);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // the award being changed
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [found, setFound] = useState([]);

  useEffect(() => {
    associationApi.awardSeasons().then((s) => {
      if (s.length) {
        setSeasons(s);
        setSeason(s[0]);
      }
    }).catch((e) => setError(e.message));
  }, []);

  const load = () => associationApi.awards(season).then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    setData(null);
    load();
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  // search for somebody else to name as the winner
  useEffect(() => {
    if (!editing || search.trim().length < 2) return setFound([]);
    const req = editing.slots ? null : editing.entries[0] && editing.entries[0].subjectType === 'team' ? associationApi.teams(search).then((r) => r.items.map((t) => ({ id: t.id, name: t.name }))) : associationApi.players({ q: search, pageSize: 8 }).then((r) => r.items.map((p) => ({ id: p.id, name: p.name, sub: p.teamName })));
    if (req) req.then(setFound).catch(() => setFound([]));
  }, [search, editing]);

  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const out = await fn();
      setDone(typeof message === 'function' ? message(out) : message);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setWinner = (a, subject) =>
    run(async () => {
      await associationApi.setAwardWinner(a.key, { season, tournamentId: a.tournamentId || 0, subjectType: a.entries[0].subjectType, subjectId: subject.id ?? subject.subjectId });
      setEditing(null);
      setQ('');
    }, 'Winner changed. Confirm and publish when you are ready.');

  const counts = data ? data.awards.reduce((n, a) => ({ ...n, [a.status]: (n[a.status] || 0) + 1 }), {}) : {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Awards</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}

      <section className={`${card} space-y-4 p-5`}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="aw-season" className={label}>Season</label>
            <select id="aw-season" className={`${field} !w-auto`} value={season} onChange={(e) => setSeason(Number(e.target.value))}>
              {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" className={btn.secondary} disabled={busy} onClick={() => run(() => associationApi.generateAwards(season), (r) => `${r.written} awards worked out from the season's matches. Awards you already confirmed were left as they are.`)}>
            Work out suggestions
          </button>
          <button type="button" className={btn.secondary} disabled={busy || !counts.suggested} onClick={() => run(() => associationApi.confirmAwards(season), (r) => `${r.confirmed} awards confirmed.`)}>
            Confirm all suggestions
          </button>
          <button type="button" className={btn.primary} disabled={busy || !counts.confirmed} onClick={() => run(() => associationApi.publishAwards(season), (r) => `${r.published} awards are now on the public site.`)}>
            Publish confirmed
          </button>
          {counts.published > 0 && (
            <>
              <button type="button" className={btn.ghost} disabled={busy} onClick={() => run(() => associationApi.unpublishAwards(season), 'The awards were taken down from the public site.')}>Take down</button>
              <a className={btn.ghost} href={`/awards/show?season=${season}`} target="_blank" rel="noreferrer">▶ Open the award show</a>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500">Suggestions come from runs, wickets, catches, strike rate, economy and the rating points of every finished match. Nothing is public until you publish it.</p>
      </section>

      {!data && !error && <Spinner />}
      {data && data.awards.length === 0 && <Banner>No awards for {season} yet. Press “Work out suggestions” once matches have finished.</Banner>}

      <div className="grid gap-4 lg:grid-cols-2">
        {(data ? data.awards : []).map((a) => {
          const id = `${a.key}:${a.tournamentId}`;
          const open = editing && `${editing.key}:${editing.tournamentId}` === id;
          return (
            <article key={id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-slate-900">{a.label}</h2>
                <Pill tone={TONE[a.status]}>{a.status}</Pill>
                {a.manual && <Pill tone="slate">chosen by you</Pill>}
                {a.tournament && <span className="text-xs text-slate-500">{a.tournament}</span>}
              </div>
              <ol className="mt-2 space-y-1">
                {a.entries.map((e) => (
                  <li key={e.subjectId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 font-bold text-slate-400">{e.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className={e.rank === 1 && !a.slots ? 'font-bold text-slate-900' : 'text-slate-700'}>{e.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{e.valueText}</span>
                    </span>
                    {!a.slots && e.rank !== 1 && a.status !== 'published' && (
                      <button type="button" className="text-xs font-semibold text-emerald-700 hover:underline" disabled={busy} onClick={() => setWinner(a, e)}>Make winner</button>
                    )}
                  </li>
                ))}
              </ol>
              {!a.slots && a.status !== 'published' && (
                <div className="mt-3">
                  {!open ? (
                    <button type="button" className={btn.ghost} onClick={() => { setEditing(a); setQ(''); }}>Pick someone else…</button>
                  ) : (
                    <div className="relative">
                      <input className={field} autoFocus placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the winner" />
                      {found.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {found.map((f) => (
                            <li key={f.id}>
                              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50" onClick={() => setWinner(a, f)}>
                                {f.name} {f.sub && <span className="text-xs text-slate-500">· {f.sub}</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button type="button" className="mt-1 text-xs text-slate-500 hover:underline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AwardsAdmin;
