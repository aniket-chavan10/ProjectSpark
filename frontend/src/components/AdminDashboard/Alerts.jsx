import React, { useEffect, useState } from 'react';
import { shortDate, teamNewsApi } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from './Team/common';
import { btn } from '../ui/classes';

const KIND = {
  match_scheduled: { icon: '📅', tone: 'blue', name: 'Match' },
  season_plan: { icon: '🗓️', tone: 'blue', name: 'Season' },
  match_result: { icon: '🏏', tone: 'green', name: 'Result' },
  tournament_winner: { icon: '🏆', tone: 'amber', name: 'Winner' },
  announcement: { icon: '📢', tone: 'amber', name: 'Announcement' },
  ban: { icon: '⛔', tone: 'red', name: 'Ban' },
  ban_revoked: { icon: '✅', tone: 'green', name: 'Ban lifted' },
};

const when = (d) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : `${shortDate(t)} ${t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

// Everything the team should know: matches scheduled, results, winners, announcements, bans.
const Alerts = ({ onOpenMatch, onUnread, goTo }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    teamNewsApi
      .notifications({ limit: 100 })
      .then((d) => {
        setData(d);
        if (onUnread) onUnread(d.unread);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markAll = async () => {
    const r = await teamNewsApi.markRead().catch((e) => setError(e.message));
    if (r) {
      setData((d) => ({ ...d, unread: 0, items: d.items.map((i) => ({ ...i, read: true })) }));
      if (onUnread) onUnread(0);
    }
  };

  const open = async (n) => {
    if (!n.read) {
      const r = await teamNewsApi.markRead([n.id]).catch(() => null);
      if (r) {
        setData((d) => ({ ...d, unread: r.unread, items: d.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)) }));
        if (onUnread) onUnread(r.unread);
      }
    }
    if (n.link && n.link.startsWith('match:')) onOpenMatch(Number(n.link.split(':')[1]));
    else if (n.link === 'announcements') goTo('dashboard');
    else if (n.link && n.link.startsWith('tournament:')) goTo('results');
  };

  if (!data && !error) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Notifications {data && data.unread > 0 && <span className="ml-1 text-base font-semibold text-emerald-700">({data.unread} new)</span>}
        </h1>
        {data && data.unread > 0 && (
          <button type="button" className={btn.secondary} onClick={markAll}>
            Mark all as read
          </button>
        )}
      </div>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {data && data.items.length === 0 && <Banner>Nothing yet. You will be told here when matches are scheduled, results come in, and the association has news.</Banner>}
      <ul className="space-y-2">
        {(data ? data.items : []).map((n) => {
          const k = KIND[n.type] || { icon: '🔔', tone: 'slate', name: 'News' };
          const actionable = n.link && (n.link.startsWith('match:') || n.link.startsWith('tournament:') || n.link === 'announcements');
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  n.read ? 'border-slate-200 bg-white' : 'border-emerald-300 bg-emerald-50'
                } ${actionable ? 'hover:border-emerald-400' : 'cursor-default'}`}
              >
                <span className="text-xl leading-none" aria-hidden="true">{k.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm ${n.read ? 'font-semibold' : 'font-bold'} text-slate-900`}>{n.title}</span>
                    <Pill tone={k.tone}>{k.name}</Pill>
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-slate-600">{n.body}</span>}
                  <span className="mt-1 block text-xs text-slate-400">{when(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" aria-label="Unread" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Alerts;
