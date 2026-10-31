import React, { useEffect, useState } from 'react';
import { associationApi, shortDate } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { useDebounced } from '../Public/ui';
import { btn, card, field, label } from '../ui/classes';

const TONE = { active: 'red', upcoming: 'amber', expired: 'slate', revoked: 'green' };

// Ban a player or a whole team for a period (or until lifted), and lift a ban early. Every ban is kept.
const Bans = () => {
  const [filter, setFilter] = useState('active');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState('team');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [found, setFound] = useState({ teams: [], players: [] });
  const [subject, setSubject] = useState(null); // { id, name }
  const [reason, setReason] = useState('');
  const [endsOn, setEndsOn] = useState('');

  const load = () => associationApi.bans({ filter }).then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (subject || search.trim().length < 2) {
      setFound({ teams: [], players: [] });
      return;
    }
    associationApi.searchBanSubjects(search).then(setFound).catch(() => {});
  }, [search, subject]);

  const choices = type === 'team' ? found.teams : found.players;

  const submit = async (e) => {
    e.preventDefault();
    if (!subject) return setError(`Search and choose the ${type} to ban.`);
    setBusy(true);
    setError('');
    setDone('');
    try {
      await associationApi.ban({ subjectType: type, subjectId: subject.id, reason, endsOn: endsOn || null });
      setDone(`${subject.name} is banned${endsOn ? ` until ${shortDate(endsOn)}` : ' until you lift it'}. Their team has been told.`);
      setSubject(null);
      setQ('');
      setReason('');
      setEndsOn('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (b) => {
    const why = window.prompt(`Lift the ban on ${b.subjectName}? You can add a note (optional):`, '');
    if (why === null) return;
    try {
      await associationApi.revokeBan(b.id, why);
      setDone(`The ban on ${b.subjectName} is lifted.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bans</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}

      <form onSubmit={submit} className={`${card} space-y-4 p-5`}>
        <h2 className="text-base font-bold text-slate-900">Ban a team or a player</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Who to ban">
          {['team', 'player'].map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => { setType(t); setSubject(null); setQ(''); }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${type === t ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {t === 'team' ? 'A team' : 'A player'}
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="ban-q" className={label}>{type === 'team' ? 'Team name' : 'Player name'}</label>
          {subject ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
              <strong>{subject.name}</strong>
              <button type="button" className="text-emerald-700 hover:underline" onClick={() => { setSubject(null); setQ(''); }}>
                Change
              </button>
            </div>
          ) : (
            <input id="ban-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters" autoComplete="off" />
          )}
          {!subject && choices.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {choices.map((c) => (
                <li key={c.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50" onClick={() => setSubject({ id: c.id, name: c.name })}>
                    {c.name} {c.teamName && <span className="text-xs text-slate-500">· {c.teamName}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ban-end" className={label}>Banned until (last day) — leave empty for no end</label>
            <input id="ban-end" type="date" min={today} className={field} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ban-why" className={label}>Reason</label>
            <input id="ban-why" className={field} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
          </div>
        </div>
        <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300" disabled={busy}>
          {busy ? 'Saving…' : 'Ban'}
        </button>
      </form>

      <div className="flex gap-2">
        {[['active', 'In force'], ['all', 'History']].map(([id, name]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
            {name}
          </button>
        ))}
      </div>

      {!list && !error && <Spinner />}
      {list && list.length === 0 && <Banner>{filter === 'active' ? 'Nobody is banned right now.' : 'No bans yet.'}</Banner>}
      <ul className="space-y-3">
        {(list || []).map((b) => (
          <li key={b.id} className={`${card} flex flex-wrap items-start justify-between gap-3 p-4`}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                {b.subjectName || `#${b.subjectId}`}
                <Pill tone="blue">{b.subjectType === 'team' ? 'Team' : 'Player'}</Pill>
                <Pill tone={TONE[b.status]}>{b.status}</Pill>
              </p>
              {b.teamName && <p className="text-xs text-slate-500">of {b.teamName}</p>}
              <p className="mt-1 text-sm text-slate-700">{b.reason}</p>
              <p className="mt-1 text-xs text-slate-500">
                {shortDate(b.startsOn)} → {b.endsOn ? shortDate(b.endsOn) : 'until lifted'}
                {b.revokedAt ? ` · lifted ${shortDate(b.revokedAt)}${b.revokeReason ? ` (${b.revokeReason})` : ''}` : ''}
              </p>
            </div>
            {b.status === 'active' || b.status === 'upcoming' ? (
              <button type="button" className={btn.secondary} onClick={() => revoke(b)}>
                Lift the ban
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Bans;
