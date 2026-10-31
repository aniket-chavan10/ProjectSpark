// My Players: the team admin adds, edits and removes the players of their own team. Works on a phone.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import teamAdminApi from "../../../api/teamAdminApi";
import { btn, card, field, label } from "../../ui/classes";
import { Avatar, Banner, Empty, Pill, Sheet, Spinner } from "./common";

const blank = { name: "", mobile: "", email: "", photo: null };

const PlayerForm = ({ player, onSaved, onClose }) => {
  const editing = !!player;
  const [form, setForm] = useState(player ? { name: player.name, mobile: player.mobile || "", email: player.email || "", photo: null } : blank);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("That photo is too big. Choose one under 5 MB.");
      return;
    }
    setError("");
    setForm((f) => ({ ...f, photo: file }));
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = editing ? await teamAdminApi.updatePlayer(player.id, form) : await teamAdminApi.addPlayer(form);
      onSaved(saved, editing);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Sheet title={editing ? "Edit player" : "Add a player"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex items-center gap-4">
          <Avatar name={form.name} photo={preview || (player && player.photo)} size={64} />
          <label className={`${btn.secondary} cursor-pointer`}>
            {form.photo || (player && player.photo) ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="sr-only" onChange={pick} />
          </label>
        </div>

        <div>
          <label htmlFor="pl-name" className={label}>Name</label>
          <input id="pl-name" className={field} value={form.name} onChange={set("name")} autoComplete="off" required minLength={2} maxLength={60} placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="pl-mobile" className={label}>Mobile number</label>
          <input id="pl-mobile" className={field} value={form.mobile} onChange={set("mobile")} inputMode="numeric" autoComplete="off" required placeholder="10 digit number" />
        </div>
        <div>
          <label htmlFor="pl-email" className={label}>Email <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <input id="pl-email" type="email" className={field} value={form.email} onChange={set("email")} autoComplete="off" placeholder="name@example.com" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" className={`${btn.secondary} flex-1`} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={`${btn.primary} flex-1`} disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Add player"}</button>
        </div>
      </form>
    </Sheet>
  );
};

const PlayersScreen = () => {
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null); // null = closed, {} = add, { player } = edit
  const [removing, setRemoving] = useState(null); // id waiting for confirmation
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setPlayers(await teamAdminApi.listPlayers());
    } catch (err) {
      setError(err.message);
      setPlayers([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (players || []).filter((p) => !q || p.name.toLowerCase().includes(q) || (p.mobile || "").includes(q));
  }, [players, query]);

  const saved = (player, wasEdit) => {
    setPlayers((list) => (wasEdit ? list.map((p) => (p.id === player.id ? player : p)) : [...list, player]).sort((a, b) => a.name.localeCompare(b.name)));
    setNotice(wasEdit ? `${player.name} updated` : `${player.name} added to your team`);
    setForm(null);
  };

  const remove = async (player) => {
    setBusyId(player.id);
    setError("");
    try {
      await teamAdminApi.removePlayer(player.id);
      setPlayers((list) => list.filter((p) => p.id !== player.id));
      setNotice(`${player.name} removed`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Players</h1>
          <p className="text-sm text-slate-500">{players ? `${players.length} in your team` : " "}</p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setForm({})}>+ Add player</button>
      </div>

      {error && <Banner tone="error" onClose={() => setError("")}>{error}</Banner>}
      {notice && <Banner tone="success" onClose={() => setNotice("")}>{notice}</Banner>}

      {players && players.length > 5 && (
        <input className={field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or mobile" aria-label="Search players" />
      )}

      {players === null ? (
        <Spinner />
      ) : players.length === 0 ? (
        <Empty title="No players yet">Add your players first. Then you can pick your playing XI and reserves for the tournament.</Empty>
      ) : shown.length === 0 ? (
        <Empty icon="🔍" title="No player matches that" />
      ) : (
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.id} className={`${card} p-3`}>
              <div className="flex items-center gap-3">
                <Avatar name={p.name} photo={p.photo} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{p.name} {p.banned && <Pill tone="red">Banned</Pill>}</p>
                  {p.mobile && <a href={`tel:${p.mobile}`} className="text-sm text-slate-500">{p.mobile}</a>}
                </div>
                {removing !== p.id && (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className={btn.ghost} onClick={() => setForm({ player: p })} aria-label={`Edit ${p.name}`}>Edit</button>
                    <button type="button" className={`${btn.ghost} !text-red-600 hover:!bg-red-50`} onClick={() => setRemoving(p.id)} aria-label={`Remove ${p.name}`}>Remove</button>
                  </div>
                )}
              </div>
              {removing === p.id && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-800">Remove {p.name} from your team?</span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" className={btn.secondary} onClick={() => setRemoving(null)} disabled={busyId === p.id}>No</button>
                    <button type="button" className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" onClick={() => remove(p)} disabled={busyId === p.id}>
                      {busyId === p.id ? "…" : "Yes, remove"}
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {form && <PlayerForm player={form.player} onSaved={saved} onClose={() => setForm(null)} />}
    </div>
  );
};

export default PlayersScreen;
