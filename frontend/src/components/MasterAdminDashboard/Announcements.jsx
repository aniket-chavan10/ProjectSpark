import React, { useEffect, useState } from 'react';
import { associationApi, shortDate } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { btn, card, field, label } from '../ui/classes';

const blank = { title: '', body: '', pinned: false, expiresOn: '' };

// Announcements from the association head: shown on every team's dashboard and on the public home page,
// and each team also gets a notification.
const Announcements = () => {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = () => associationApi.announcements().then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setDone('');
    try {
      const body = { ...form, expiresOn: form.expiresOn || null };
      if (editing) await associationApi.updateAnnouncement(editing, body);
      else await associationApi.postAnnouncement(body);
      setDone(editing ? 'Announcement updated.' : 'Announcement posted. Every team has been notified.');
      setForm(blank);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (a) => {
    setEditing(a.id);
    setForm({ title: a.title, body: a.body, pinned: a.pinned, expiresOn: a.expiresOn || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (a) => {
    if (!window.confirm(`Remove "${a.title}"? Teams will no longer see it.`)) return;
    try {
      await associationApi.removeAnnouncement(a.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}

      <form onSubmit={submit} className={`${card} space-y-4 p-5`}>
        <h2 className="text-base font-bold text-slate-900">{editing ? 'Edit announcement' : 'New announcement'}</h2>
        <div>
          <label htmlFor="an-title" className={label}>Title</label>
          <input id="an-title" className={field} value={form.title} onChange={set('title')} maxLength={150} required />
        </div>
        <div>
          <label htmlFor="an-body" className={label}>Message</label>
          <textarea id="an-body" className={field} rows={4} value={form.body} onChange={set('body')} maxLength={4000} required />
        </div>
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label htmlFor="an-exp" className={label}>Show until (optional)</label>
            <input id="an-exp" type="date" className={field} value={form.expiresOn} onChange={set('expiresOn')} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.pinned} onChange={set('pinned')} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            Pin to the top
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" className={btn.primary} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Post to all teams'}
          </button>
          {editing && (
            <button type="button" className={btn.secondary} onClick={() => { setEditing(null); setForm(blank); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {!list && !error && <Spinner />}
      <ul className="space-y-3">
        {(list || []).map((a) => (
          <li key={a.id} className={`${card} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">{a.title}</h3>
              {a.pinned && <Pill tone="amber">Pinned</Pill>}
              {a.expired && <Pill tone="slate">Expired</Pill>}
              <span className="ml-auto text-xs text-slate-500">
                {shortDate(a.createdAt)}
                {a.expiresOn ? ` · until ${shortDate(a.expiresOn)}` : ''}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={btn.ghost} onClick={() => edit(a)}>Edit</button>
              <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50" onClick={() => remove(a)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {list && list.length === 0 && <Banner>No announcements yet.</Banner>}
    </div>
  );
};

export default Announcements;
