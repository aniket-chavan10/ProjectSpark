import React from 'react';
import { shortDate, teamNewsApi } from '../../api/sparkApi';
import { Banner, Spinner } from './Team/common';
import { FixtureCard, ResultCard, StatBox, useLoad } from '../Public/ui';
import { publicApi } from '../../api/sparkApi';

// The team representative's home: standing in the rankings, the association's announcements, what is next.
const Dashboard = ({ onOpenMatch, goTo }) => {
  const overview = useLoad(() => teamNewsApi.overview(), []);
  const news = useLoad(() => teamNewsApi.announcements(), []);
  const o = overview.data;
  const results = useLoad(() => (o ? publicApi.matches({ teamId: o.id, pageSize: 3 }) : Promise.resolve(null)), [o && o.id]);

  if (overview.loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{o ? o.name : 'Dashboard'}</h1>
      {overview.error && <Banner tone="error">{overview.error}</Banner>}

      {o && o.ban && (
        <Banner tone="error">
          <strong>Your team is banned</strong> {o.ban.endsOn ? `until ${shortDate(o.ban.endsOn)}` : 'until the association lifts it'}. You cannot register for tournaments or play matches. Reason: {o.ban.reason}
        </Banner>
      )}

      {o && !o.logo && (
        <Banner tone="warn">
          <strong>Add your team logo.</strong> It appears on scorecards, rankings and the broadcast.{' '}
          <button type="button" className="font-semibold underline" onClick={() => goTo('profile')}>Add it now</button>
        </Banner>
      )}

      {o && o.hosting && o.hosting.length > 0 && (
        <section aria-label="Hosting" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-sm font-bold text-sky-900">🏟️ You are hosting</p>
          <ul className="mt-1 space-y-1 text-sm text-sky-900">
            {o.hosting.map((h) => (
              <li key={h.id}>
                {shortDate(h.startDate)} – {shortDate(h.endDate)}{' '}
                {h.tournamentId ? <span className="text-sky-700">· tournament created</span> : <span className="text-sky-700">· reserved for you, create the tournament in Organize</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {news.data && news.data.length > 0 && (
        <section aria-label="Announcements" className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">From the association</h2>
          {news.data.map((a) => (
            <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">
                {a.pinned ? '📌 ' : '📢 '}
                {a.title} <span className="ml-1 text-xs font-medium text-amber-700">{shortDate(a.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-amber-900">{a.body}</p>
            </div>
          ))}
        </section>
      )}

      {o && (
        <section aria-label="Standing">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-slate-900">Where you stand</h2>
            <button type="button" className="text-sm font-semibold text-emerald-700 hover:underline" onClick={() => goTo('rankings')}>Full rankings →</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Rank" value={o.rank ? `#${o.rank}` : '—'} />
            <StatBox label="Points" value={o.points} />
            <StatBox label="Titles" value={o.titles} />
            <StatBox label="Won / played" value={`${o.won}/${o.played}`} />
          </div>
        </section>
      )}

      {o && o.upcoming.length > 0 && (
        <section aria-label="Upcoming matches">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Your next matches</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {o.upcoming.map((f) => (
              <FixtureCard key={f.fixtureId} f={f} />
            ))}
          </div>
        </section>
      )}

      {results.data && results.data.items.length > 0 && (
        <section aria-label="Latest results">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your latest results</h2>
            <button type="button" className="text-sm font-semibold text-emerald-700 hover:underline" onClick={() => goTo('results')}>
              All results →
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.data.items.map((m) => (
              <ResultCard key={m.matchId} m={m} onOpen={() => onOpenMatch(m.matchId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
