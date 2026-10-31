import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { overlayApi } from "../../api/sparkApi";
import { btn, card, field, label } from "../ui/classes";

// The operator's control for the broadcast screen: pick what to put on air (squads, openers, bowler, scorecard ...)
// and for how long. Whatever is chosen shows on /overlay/:matchId within a moment, over the live score bar.

const SCENES = [
  { id: "squads", icon: "👥", name: "Playing XI", hint: "Both teams, or one" },
  { id: "toss", icon: "🪙", name: "Toss", hint: "Who won, what they chose" },
  { id: "openers", icon: "🏏", name: "Openers", hint: "Opening batters and bowler" },
  { id: "batters", icon: "🧢", name: "Batters", hint: "The two at the crease" },
  { id: "bowler", icon: "🎯", name: "Bowler", hint: "Figures and this over" },
  { id: "partnership", icon: "🤝", name: "Partnership", hint: "Runs together" },
  { id: "last_wicket", icon: "☝️", name: "Fall of wicket", hint: "Last wicket" },
  { id: "target", icon: "🎯", name: "Target", hint: "What is needed" },
  { id: "scorecard", icon: "📋", name: "Scorecard", hint: "An innings in full" },
  { id: "summary", icon: "⭐", name: "Top performers", hint: "Best bat and ball" },
  { id: "result", icon: "🏁", name: "Result", hint: "Final score and winner" },
  { id: "potm", icon: "🏅", name: "Player of match", hint: "After you choose one" },
  { id: "rankings", icon: "🏆", name: "Top teams", hint: "Association ranking" },
  { id: "message", icon: "💬", name: "Message", hint: "Your own text" },
];

const HIDE_AFTER = [
  { value: "", label: "Until I hide it" },
  { value: 6, label: "6 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 25, label: "25 seconds" },
  { value: 40, label: "40 seconds" },
];

export default function OverlayDesk({ matchId, sb }) {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(null); // what is on air now
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);
  const [autoHide, setAutoHide] = useState(10);
  const [teamId, setTeamId] = useState(""); // squads: "" = both
  const [innings, setInnings] = useState(1);
  const [text, setText] = useState("");
  const [subtext, setSubtext] = useState("");
  const [potm, setPotm] = useState("");
  const [savedPotm, setSavedPotm] = useState(false);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.3);

  const load = useCallback(() => {
    overlayApi
      .get(matchId)
      .then((d) => {
        setData(d);
        setLive(d.state);
        setPotm((p) => p || (d.playerOfMatch ? String(d.playerOfMatch.id) : ""));
      })
      .catch((e) => setError(e.message));
  }, [matchId]);

  useEffect(load, [load]);
  // the squads and the suggested player of the match change once play starts and ends
  useEffect(() => {
    if (sb.status === "completed") load();
  }, [sb.status, load]);

  const show = async (scene) => {
    setBusy(true);
    setError("");
    try {
      const payload = scene === "squads" ? { teamId: teamId || null } : scene === "scorecard" ? { innings } : scene === "message" ? { text, subtext } : {};
      const next = await overlayApi.setScene(matchId, { scene, payload, autoHide: scene === "none" || autoHide === "" ? null : Number(autoHide) });
      setLive(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const players = useMemo(() => {
    if (!data) return [];
    return data.teams.flatMap((t) => {
      const squad = data.squads[t.id];
      return squad ? squad.playing.map((p) => ({ id: p.player_id, name: p.players_name, team: t.name })) : [];
    });
  }, [data]);

  const savePotm = async () => {
    if (!potm) return;
    setBusy(true);
    setError("");
    try {
      await overlayApi.setPlayerOfMatch(matchId, potm);
      setSavedPotm(true);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // the preview is the real 1920 x 1080 page, shrunk to the width of its box
  useEffect(() => {
    const box = previewRef.current;
    if (!open || !box || typeof ResizeObserver === "undefined") return undefined;
    const fit = () => setPreviewScale(box.clientWidth / 1920);
    fit();
    const watcher = new ResizeObserver(fit);
    watcher.observe(box);
    return () => watcher.disconnect();
  }, [open]);

  const onAir = live && live.scene !== "none" ? SCENES.find((s) => s.id === live.scene) : null;
  const suggested = data && data.suggestedPlayerOfMatch;

  return (
    <section className={`${card} overflow-hidden`} aria-label="Overlay desk">
      <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span aria-hidden="true">📺</span> Overlay desk
        </span>
        <span className="flex items-center gap-2">
          {onAir ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" /> ON AIR · {onAir.name}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Score bar only</span>
          )}
          <span className="text-slate-400" aria-hidden="true">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data && (
              <div className="col-span-2 sm:col-span-1">
                <label className={label} htmlFor="od-team">Squads of</label>
                <select id="od-team" className={field} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">Both teams</option>
                  {data.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={label} htmlFor="od-inn">Scorecard of</label>
              <select id="od-inn" className={field} value={innings} onChange={(e) => setInnings(Number(e.target.value))}>
                <option value={1}>1st innings</option>
                <option value={2}>2nd innings</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="od-hide">Take it off the screen</label>
              <select id="od-hide" className={field} value={autoHide} onChange={(e) => setAutoHide(e.target.value)}>
                {HIDE_AFTER.map((o) => (
                  <option key={o.label} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {SCENES.map((s) => {
              const active = live && live.scene === s.id;
              const needsText = s.id === "message" && !text.trim();
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy || needsText}
                  onClick={() => show(s.id)}
                  title={needsText ? "Type the message first" : s.hint}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                    active ? "border-red-400 bg-red-50 ring-1 ring-red-300" : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">
                    <span aria-hidden="true">{s.icon}</span> {s.name}
                  </span>
                  <span className="text-xs text-slate-500">{s.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="od-text">Message (for the “Message” button)</label>
              <input id="od-text" className={field} maxLength={140} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Drinks break" />
            </div>
            <div>
              <label className={label} htmlFor="od-sub">Smaller line (optional)</label>
              <input id="od-sub" className={field} maxLength={200} value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="e.g. Play resumes in 5 minutes" />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
            <div className="min-w-[14rem] flex-1">
              <label className={label} htmlFor="od-potm">Player of the match</label>
              <select id="od-potm" className={field} value={potm} onChange={(e) => { setPotm(e.target.value); setSavedPotm(false); }}>
                <option value="">Choose…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.team}){suggested && suggested.id === p.id ? " · suggested" : ""}</option>
                ))}
              </select>
            </div>
            <button type="button" className={btn.secondary} disabled={busy || !potm} onClick={savePotm}>
              {savedPotm ? "Saved ✓" : "Save"}
            </button>
            {suggested && !potm && (
              <button type="button" className={btn.ghost} onClick={() => setPotm(String(suggested.id))}>
                Use suggestion: {suggested.name}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">The big screens appear over the live picture; the score bar always stays at the bottom.</p>
            <button type="button" className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300" disabled={busy || !onAir} onClick={() => show("none")}>
              Hide now
            </button>
          </div>

          <div>
            <p className={label}>Preview</p>
            <div ref={previewRef} className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-800" style={{ aspectRatio: "16 / 9" }}>
              <iframe title="Overlay preview" src={`/overlay/${matchId}?bg=dark`} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: "1920px", height: "1080px", transform: `scale(${previewScale})` }}/>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
