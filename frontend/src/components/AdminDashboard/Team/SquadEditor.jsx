// Picks a team's playing XI (in batting order) and reserves from its players. Used for the tournament squad and
// for a single match. Phone first: big tap targets, one column, the save bar stays in view.
import { LuLock, LuX } from "react-icons/lu";
import React, { useMemo, useState } from "react";
import { btn, card } from "../../ui/classes";
import { Avatar, Banner, Pill } from "./common";

const fromPayload = (data) => {
  const playing = data.squad.playing;
  const reserves = data.squad.reserves;
  return {
    playing: playing.map((p) => p.playerId),
    reserves: reserves.map((p) => p.playerId),
    captainId: (playing.find((p) => p.isCaptain) || {}).playerId || null,
    keeperId: (playing.find((p) => p.isKeeper) || {}).playerId || null,
    jerseys: Object.fromEntries([...playing, ...reserves].filter((p) => p.jersey !== null && p.jersey !== undefined).map((p) => [p.playerId, String(p.jersey)])),
  };
};

// jersey boxes hold text while typing; empty ones are not sent
const toInput = (s) => ({
  playing: s.playing,
  reserves: s.reserves,
  captainId: s.captainId,
  keeperId: s.keeperId,
  jerseys: Object.fromEntries(Object.entries(s.jerseys).filter(([id, v]) => v !== "" && (s.playing.includes(Number(id)) || s.reserves.includes(Number(id))))),
});

const same = (a, b) => JSON.stringify(toInput(a)) === JSON.stringify(toInput(b));

const Counter = ({ label, value, max, tone }) => (
  <div className={`flex-1 rounded-lg border px-3 py-2 text-center ${tone}`}>
    <div className="text-xl font-extrabold leading-none">{value}<span className="text-sm font-semibold opacity-60">/{max}</span></div>
    <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
  </div>
);

const Tag = ({ on, onClick, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-pressed={on}
    className={`h-8 min-w-[2rem] rounded-md border px-1.5 text-xs font-bold transition disabled:opacity-40 ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"}`}
  >
    {children}
  </button>
);

const Jersey = ({ value, onChange, disabled, clash }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
    disabled={disabled}
    inputMode="numeric"
    placeholder="#"
    aria-label="Jersey number"
    className={`h-8 w-11 rounded-md border px-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:bg-slate-100 ${clash ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"}`}
  />
);

const IconBtn = ({ children, ...rest }) => (
  <button type="button" {...rest} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30">
    {children}
  </button>
);

const SquadEditor = ({ data, onSave, onReset, saveLabel = "Save squad" }) => {
  const { limits, players, locked } = data;
  const initial = useMemo(() => fromPayload(data), [data]);
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const dirty = !same(state, initial);
  const readOnly = !!locked;

  const set = (patch) => {
    setSaved(false);
    setState((s) => ({ ...s, ...patch }));
  };

  const xiFull = state.playing.length >= limits.playingMax;
  const benchFull = state.reserves.length >= limits.reservesMax;
  const free = players.filter((p) => !state.playing.includes(p.id) && !state.reserves.includes(p.id));

  const addPlaying = (id) => !xiFull && set({ playing: [...state.playing, id] });
  const addReserve = (id) => !benchFull && set({ reserves: [...state.reserves, id] });
  const drop = (id) =>
    set({
      playing: state.playing.filter((x) => x !== id),
      reserves: state.reserves.filter((x) => x !== id),
      captainId: state.captainId === id ? null : state.captainId,
      keeperId: state.keeperId === id ? null : state.keeperId,
    });
  const toReserve = (id) => !benchFull && set({ playing: state.playing.filter((x) => x !== id), reserves: [...state.reserves, id], captainId: state.captainId === id ? null : state.captainId, keeperId: state.keeperId === id ? null : state.keeperId });
  const toPlaying = (id) => !xiFull && set({ reserves: state.reserves.filter((x) => x !== id), playing: [...state.playing, id] });
  const move = (id, by) => {
    const i = state.playing.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= state.playing.length) return;
    const next = [...state.playing];
    [next[i], next[j]] = [next[j], next[i]];
    set({ playing: next });
  };
  const jersey = (id, value) => set({ jerseys: { ...state.jerseys, [id]: value } });

  const used = [...state.playing, ...state.reserves].map((id) => state.jerseys[id]).filter((v) => v !== undefined && v !== "");
  const clash = (id) => {
    const v = state.jerseys[id];
    return v !== undefined && v !== "" && used.filter((x) => x === v).length > 1;
  };
  const hasClash = used.length !== new Set(used).size;

  const problem = hasClash
    ? "Two players have the same jersey number."
    : state.playing.length < limits.playingMin
    ? `Choose at least ${limits.playingMin} players for the playing XI.`
    : "";

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await onSave(toInput(state));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // a plain function (not a component) so typing in a jersey box does not remount the row
  const row = (id, tint, children) => {
    const p = byId[id];
    if (!p) return null;
    return (
      <li key={id} className={`${card} p-2.5 ${tint}`}>
        <div className="flex items-center gap-3">
          <Avatar name={p.name} photo={p.photo} size={36} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{p.name}</span>
          <IconBtn onClick={() => drop(id)} disabled={readOnly} aria-label={`Take ${p.name} out of the squad`}><LuX className="h-4 w-4" /></IconBtn>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">{children}</div>
      </li>
    );
  };

  return (
    <div className="space-y-4 pb-28">
      {locked && <Banner tone="warn"><span className="inline-flex items-center gap-1.5"><LuLock className="h-4 w-4" aria-hidden="true" /> {locked}</span></Banner>}
      {error && <Banner tone="error" onClose={() => setError("")}>{error}</Banner>}
      {saved && !dirty && <Banner tone="success">Saved.</Banner>}

      <div className="flex gap-3">
        <Counter label="Playing XI" value={state.playing.length} max={limits.playingMax} tone={state.playing.length === limits.playingMax ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-900"} />
        <Counter label="Reserves" value={state.reserves.length} max={limits.reservesMax} tone={state.reserves.length === limits.reservesMax ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-900"} />
      </div>

      {players.length === 0 && <Banner tone="warn">Your team has no players yet. Add players first (My Players), then come back to pick your squad.</Banner>}

      <section aria-labelledby="xi-h">
        <h2 id="xi-h" className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Playing XI · batting order</h2>
        {state.playing.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">Tap “+ XI” on a player below to add them.</p>
        ) : (
          <ol className="space-y-2">
            {state.playing.map((id, i) =>
              row(id, "", (
              <>
                <span className="w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                <Tag on={state.captainId === id} disabled={readOnly} onClick={() => set({ captainId: state.captainId === id ? null : id })} title="Captain">C</Tag>
                <Tag on={state.keeperId === id} disabled={readOnly} onClick={() => set({ keeperId: state.keeperId === id ? null : id })} title="Wicket-keeper">WK</Tag>
                <Jersey value={state.jerseys[id] ?? ""} onChange={(v) => jersey(id, v)} disabled={readOnly} clash={clash(id)} />
                <IconBtn onClick={() => move(id, -1)} disabled={readOnly || i === 0} aria-label="Move up">▲</IconBtn>
                <IconBtn onClick={() => move(id, 1)} disabled={readOnly || i === state.playing.length - 1} aria-label="Move down">▼</IconBtn>
                <button type="button" className={`${btn.ghost} !px-2`} disabled={readOnly || benchFull} onClick={() => toReserve(id)} title={benchFull ? "The reserves are full" : "Move to reserves"}>→ Reserve</button>
              </>
              ))
            )}
          </ol>
        )}
      </section>

      <section aria-labelledby="res-h">
        <h2 id="res-h" className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Reserves</h2>
        {state.reserves.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">No reserves chosen (up to {limits.reservesMax}).</p>
        ) : (
          <ul className="space-y-2">
            {state.reserves.map((id) =>
              row(id, "bg-slate-50", (
              <>
                <Jersey value={state.jerseys[id] ?? ""} onChange={(v) => jersey(id, v)} disabled={readOnly} clash={clash(id)} />
                <button type="button" className={`${btn.ghost} !px-2`} disabled={readOnly || xiFull} onClick={() => toPlaying(id)} title={xiFull ? "The playing XI is full" : "Move to the playing XI"}>→ Playing XI</button>
              </>
              ))
            )}
          </ul>
        )}
      </section>

      {free.length > 0 && (
        <section aria-labelledby="free-h">
          <h2 id="free-h" className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Other players ({free.length})</h2>
          <ul className="space-y-2">
            {free.map((p) => (
              <li key={p.id} className={`${card} flex items-center gap-3 p-2.5 ${p.banned ? "opacity-60" : ""}`}>
                <Avatar name={p.name} photo={p.photo} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{p.name} {p.banned && <Pill tone="red">Banned</Pill>}</span>
                <button type="button" className={btn.secondary} disabled={readOnly || p.banned || xiFull} onClick={() => addPlaying(p.id)} title={xiFull ? "The playing XI is full" : undefined}>+ XI</button>
                <button type="button" className={btn.secondary} disabled={readOnly || p.banned || benchFull} onClick={() => addReserve(p.id)} title={benchFull ? "The reserves are full" : undefined}>+ Res</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* the save bar stays in view while the list scrolls (above the phone's bottom bar) */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {onReset && (
            <button type="button" className={btn.secondary} disabled={readOnly || busy || data.source !== "match"} onClick={async () => { setBusy(true); setError(""); try { await onReset(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>
              Use tournament squad
            </button>
          )}
          <div className="min-w-0 flex-1 text-right text-xs text-slate-500">{problem || (dirty ? "Unsaved changes" : "")}</div>
          <button type="button" className={btn.primary} disabled={readOnly || busy || !dirty || !!problem} onClick={save}>
            {busy ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SquadEditor;
