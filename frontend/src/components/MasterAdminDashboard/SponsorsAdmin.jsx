import React, { useEffect, useState } from 'react';
import { associationApi, fileUrl } from '../../api/sparkApi';
import { Banner, Pill, Spinner } from '../AdminDashboard/Team/common';
import { btn, card, field, label } from '../ui/classes';

const TIERS = [['title', 'Title sponsor (largest, one)'], ['gold', 'Gold'], ['silver', 'Silver'], ['partner', 'Partner']];
const PLACES = [['home', 'Home page'], ['footer', 'Footer of every page'], ['results', 'Results pages'], ['awards', 'Awards page']];
const blank = { name: '', link: '', tagline: '', tier: 'partner', placements: ['home', 'footer'], startsOn: '', endsOn: '', order: 0, active: true, logo: null };

// Sponsors shown on the public pages: logo, link, how prominent, where, and for which dates.
const SponsorsAdmin = () => {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = () => associationApi.sponsors().then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const togglePlace = (p) => setForm({ ...form, placements: form.placements.includes(p) ? form.placements.filter((x) => x !== p) : [...form.placements, p] });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setDone('');
    try {
      const body = new FormData();
      ['name', 'link', 'tagline', 'tier', 'startsOn', 'endsOn', 'order'].forEach((k) => body.append(k, form[k] ?? ''));
      body.append('placements', form.placements.join(','));
      body.append('active', form.active ? 'true' : 'false');
      if (form.logo) body.append('logo', form.logo);
      await associationApi.saveSponsor(editing, body);
      setDone(editing ? 'Sponsor updated.' : 'Sponsor added. It is on the public pages now.');
      setForm(blank);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, link: s.link || '', tagline: s.tagline || '', tier: s.tier, placements: s.placements, startsOn: s.startsOn || '', endsOn: s.endsOn || '', order: s.order, active: s.active, logo: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name} from the site?`)) return;
    try {
      await associationApi.removeSponsor(s.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Sponsors</h1>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {done && <Banner tone="success" onClose={() => setDone('')}>{done}</Banner>}

      <form onSubmit={submit} className={`${card} space-y-4 p-5`}>
        <h2 className="text-base font-bold text-slate-900">{editing ? 'Edit sponsor' : 'Add a sponsor'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="sp-name">Name</label>
            <input id="sp-name" className={field} value={form.name} onChange={set('name')} required maxLength={120} />
          </div>
          <div>
            <label className={label} htmlFor="sp-link">Website (optional)</label>
            <input id="sp-link" className={field} value={form.link} onChange={set('link')} placeholder="example.com" />
          </div>
          <div>
            <label className={label} htmlFor="sp-tag">Tagline (optional)</label>
            <input id="sp-tag" className={field} value={form.tagline} onChange={set('tagline')} maxLength={160} />
          </div>
          <div>
            <label className={label} htmlFor="sp-logo">Logo (jpg, png or gif, up to 2 MB)</label>
            <input id="sp-logo" type="file" accept="image/png,image/jpeg,image/gif" className={field} onChange={(e) => setForm({ ...form, logo: e.target.files[0] || null })} />
          </div>
          <div>
            <label className={label} htmlFor="sp-tier">How prominent</label>
            <select id="sp-tier" className={field} value={form.tier} onChange={set('tier')}>
              {TIERS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="sp-order">Order within its level (smaller first)</label>
            <input id="sp-order" type="number" className={field} value={form.order} onChange={set('order')} />
          </div>
          <div>
            <label className={label} htmlFor="sp-from">Show from (optional)</label>
            <input id="sp-from" type="date" className={field} value={form.startsOn} onChange={set('startsOn')} />
          </div>
          <div>
            <label className={label} htmlFor="sp-to">Show until (optional)</label>
            <input id="sp-to" type="date" className={field} value={form.endsOn} onChange={set('endsOn')} />
          </div>
        </div>
        <fieldset>
          <legend className={label}>Where it is shown</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PLACES.map(([id, name]) => (
              <label key={id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.placements.includes(id)} onChange={() => togglePlace(id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /> {name}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={set('active')} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /> Active
            </label>
          </div>
        </fieldset>
        <div className="flex gap-3">
          <button type="submit" className={btn.primary} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add sponsor'}</button>
          {editing && <button type="button" className={btn.secondary} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </form>

      {!list && !error && <Spinner />}
      {list && list.length === 0 && <Banner>No sponsors yet. When you add one it appears on the public pages you choose.</Banner>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(list || []).map((s) => (
          <li key={s.id} className={`${card} flex gap-3 p-4`}>
            <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
              {s.logo ? <img src={fileUrl(s.logo)} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">no logo</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">{s.name} <Pill tone="blue">{s.tier}</Pill> {!s.active && <Pill tone="slate">hidden</Pill>}</p>
              <p className="truncate text-xs text-slate-500">{s.link || 'no website'}</p>
              <p className="text-xs text-slate-500">
                {s.placements.join(', ')}
                {s.startsOn || s.endsOn ? ` · ${s.startsOn || '…'} → ${s.endsOn || '…'}` : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className={btn.ghost} onClick={() => edit(s)}>Edit</button>
                <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50" onClick={() => remove(s)}>Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SponsorsAdmin;
