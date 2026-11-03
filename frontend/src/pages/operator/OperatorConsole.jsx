import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  LuCircleDot,
  LuClapperboard,
  LuTimer,
  LuCircleX,
  LuClipboardList,
  LuCoins,
  LuEyeOff,
  LuFlag,
  LuHandshake,
  LuKeyRound,
  LuMedal,
  LuMessageSquareText,
  LuStar,
  LuSwords,
  LuTarget,
  LuTrophy,
  LuUserRound,
  LuUsers,
  LuWifi,
  LuWifiOff,
} from "react-icons/lu";
import scoringApi from "../../api/scoringApi";
import { watchMatch } from "../../api/matchSocket";
import { operatorApi } from "../../api/sparkApi";
import { SparkMark } from "../../components/layout/AppShell";
import { cx } from "../../components/ui/kit";

// The person running the on-air graphics works here, apart from the scorer. They open it from the link the scorer
// copied (it carries a key for this match only). Whatever is taken here appears on /overlay/:matchId within a moment.

const SCENES = [
  { id: "preview", group: "Before the match", icon: LuClapperboard, name: "Match preview", hint: "Teams, venue, stage" },
  { id: "squads", group: "Before the match", icon: LuUsers, name: "Playing XI", hint: "Both teams, or one" },
  { id: "toss", group: "Before the match", icon: LuCoins, name: "Toss", hint: "Who won, what they chose" },
  { id: "openers", group: "Before the match", icon: LuSwords, name: "Openers", hint: "Opening batters and bowler" },
  { id: "batters", group: "In play", icon: LuUserRound, name: "Batters", hint: "The two at the crease" },
  { id: "bowler", group: "In play", icon: LuCircleDot, name: "Bowler", hint: "Figures and this over" },
  { id: "over_summary", group: "In play", icon: LuTimer, name: "End of over", hint: "Balls, runs, the bowler" },
  { id: "partnership", group: "In play", icon: LuHandshake, name: "Partnership", hint: "Runs together" },
  { id: "last_wicket", group: "In play", icon: LuCircleX, name: "Fall of wicket", hint: "The last wicket" },
  { id: "target", group: "In play", icon: LuTarget, name: "Target", hint: "What is needed" },
  { id: "scorecard", group: "Scorecards", icon: LuClipboardList, name: "Scorecard", hint: "An innings in full" },
  { id: "summary", group: "Scorecards", icon: LuStar, name: "Top performers", hint: "Best bat and ball" },
  { id: "result", group: "After the match", icon: LuFlag, name: "Result", hint: "Final score and winner" },
  { id: "potm", group: "After the match", icon: LuMedal, name: "Player of the match", hint: "After you choose one" },
  { id: "rankings", group: "After the match", icon: LuTrophy, name: "Top teams", hint: "Association ranking" },
  { id: "message", group: "Your own", icon: LuMessageSquareText, name: "Message", hint: "Any text you type" },
];

const GROUPS = [...new Set(SCENES.map((s) => s.group))];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y"];

const HIDE_AFTER = [
  { value: "", label: "Until I hide it" },
  { value: 6, label: "6 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 25, label: "25 seconds" },
  { value: 40, label: "40 seconds" },
];

const inputCls = "block w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400";

function Panel({ title, children, aside }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 shadow-pop">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-300">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Gate({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-ink-900 p-8 text-center shadow-pop">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <LuKeyRound className="h-6 w-6 text-emerald-300" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <div className="mt-2 text-sm text-ink-300">{children}</div>
      </div>
    </div>
  );
}

export default function OperatorConsole() {
  const { matchId } = useParams();
  const [params] = useSearchParams();

  // the key arrives in the link; keep it for this tab so a refresh works, and take it out of the address bar
  const storeKey = `spark-operator-key:${matchId}`;
  const key = useMemo(() => {
    const fromLink = params.get("key");
    try {
      if (fromLink) {
        sessionStorage.setItem(storeKey, fromLink);
        const url = new URL(window.location.href);
        url.searchParams.delete("key");
        window.history.replaceState({}, "", url.pathname + url.search);
        return fromLink;
      }
      return sessionStorage.getItem(storeKey) || "";
    } catch {
      return fromLink || "";
    }
  }, [params, storeKey]);

  const api = useMemo(() => operatorApi(key), [key]);
  const allowed = !!key || !!localStorage.getItem("authToken");

  const [data, setData] = useState(null);
  const [sb, setSb] = useState(null);
  const [live, setLive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState("");
  const [link, setLink] = useState("connecting");
  const [autoHide, setAutoHide] = useState(10);
  const [teamId, setTeamId] = useState("");
  const [innings, setInnings] = useState(1);
  const [text, setText] = useState("");
  const [subtext, setSubtext] = useState("");
  const [potm, setPotm] = useState("");
  const [savedPotm, setSavedPotm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const previewRef = useRef(null);
  const [scale, setScale] = useState(0.3);

  const load = useCallback(() => {
    api
      .get(matchId)
      .then((d) => {
        setData(d);
        setLive(d.state);
        setPotm((p) => p || (d.playerOfMatch ? String(d.playerOfMatch.id) : ""));
      })
      .catch((e) => setFatal(e.message));
  }, [api, matchId]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return undefined;
    scoringApi.getScoreboard(matchId).then(setSb).catch(() => {});
    return watchMatch(matchId, { onScoreboard: setSb, onOverlay: setLive, onStatus: setLink });
  }, [allowed, matchId]);

  // the squads and the suggested player of the match change once play starts and ends
  useEffect(() => {
    if (sb && sb.status === "completed") load();
  }, [sb && sb.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const box = previewRef.current;
    if (!box || typeof ResizeObserver === "undefined") return undefined;
    const fit = () => setScale(box.clientWidth / 1920);
    fit();
    const watcher = new ResizeObserver(fit);
    watcher.observe(box);
    return () => watcher.disconnect();
  }, [data]);

  const take = useCallback(
    async (scene) => {
      setBusy(true);
      setError("");
      try {
        const payload = scene === "squads" ? { teamId: teamId || null } : scene === "scorecard" ? { innings } : scene === "message" ? { text, subtext } : {};
        const next = await api.setScene(matchId, { scene, payload, autoHide: scene === "none" || autoHide === "" ? null : Number(autoHide) });
        setLive(next);
      } catch (e) {
        if (e.status === 401 || e.status === 403) setFatal(e.message);
        else setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [api, matchId, teamId, innings, text, subtext, autoHide]
  );

  // keyboard: 1-9 0 q w e r take a graphic, Escape / H takes everything off
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "h") {
        e.preventDefault();
        take("none");
        return;
      }
      const at = KEYS.indexOf(k);
      if (at >= 0 && SCENES[at]) {
        if (SCENES[at].id === "message" && !text.trim()) return;
        e.preventDefault();
        take(SCENES[at].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [take, text]);

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
      await api.setPlayerOfMatch(matchId, potm);
      setSavedPotm(true);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <Gate title="Open your operator link">
        The scorer makes this link in the scoring console (Broadcast, Operator console). Open it from the message they sent you.
      </Gate>
    );
  }
  if (fatal) {
    return (
      <Gate title="This link no longer works">
        {fatal}
        <p className="mt-3 text-xs text-ink-400">Ask the scorer for a new operator link.</p>
      </Gate>
    );
  }

  const onAir = live && live.scene !== "none" ? SCENES.find((s) => s.id === live.scene) : null;
  const shown = live && live.shownAt ? new Date(live.shownAt).getTime() : null;
  const left = onAir && live.autoHide && shown ? Math.max(0, live.autoHide - (now - shown) / 1000) : null;
  const suggested = data && data.suggestedPlayerOfMatch;
  const title = data ? data.teams.map((t) => t.name).join(" v ") : "Loading…";

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/90 backdrop-blur">
        <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 xl:px-10">
          <SparkMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Operator console</p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}{data && data.tournament ? <span className="ml-2 font-normal text-ink-400">{data.tournament.name}</span> : null}</h1>
          </div>

          {onAir ? (
            <div className="hidden items-center gap-3 rounded-xl bg-red-600/15 px-4 py-2 ring-1 ring-inset ring-red-500/40 sm:flex">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" /> On air
              </span>
              <span className="text-sm font-semibold">{onAir.name}</span>
              {left !== null && <span className="tabular text-sm text-red-200">{Math.ceil(left)}s</span>}
            </div>
          ) : (
            <span className="hidden rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-300 ring-1 ring-inset ring-white/10 sm:inline">Score bar only</span>
          )}

          <span className={cx("hidden items-center gap-1.5 text-xs font-medium md:inline-flex", link === "connected" ? "text-emerald-300" : "text-amber-300")}>
            {link === "connected" ? <LuWifi className="h-4 w-4" aria-hidden="true" /> : <LuWifiOff className="h-4 w-4" aria-hidden="true" />}
            {link === "connected" ? "Connected" : "Reconnecting"}
          </span>
        </div>
        {left !== null && <div className="h-0.5 bg-red-500/80 transition-[width] duration-200 ease-linear" style={{ width: `${(left / live.autoHide) * 100}%` }} aria-hidden="true" />}
      </header>

      <main className="w-full space-y-5 px-4 py-5 sm:px-6 xl:px-10">
        {error && (
          <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_34rem] 2xl:grid-cols-[minmax(0,1fr)_44rem]">
          <div className="space-y-5 xl:order-1">
            {GROUPS.map((g) => (
              <Panel key={g} title={g}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {SCENES.filter((s) => s.group === g).map((s) => {
                    const active = live && live.scene === s.id;
                    const needsText = s.id === "message" && !text.trim();
                    const hotkey = KEYS[SCENES.indexOf(s)];
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={busy || needsText}
                        onClick={() => take(s.id)}
                        title={needsText ? "Type the message first" : s.hint}
                        className={cx(
                          "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40",
                          active ? "border-red-400 bg-red-500/15 ring-1 ring-red-400/60" : "border-white/10 bg-white/[0.03] hover:border-emerald-400/60 hover:bg-white/[0.07]"
                        )}
                      >
                        <span className="flex w-full items-start justify-between">
                          <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-red-500 text-white" : "bg-white/10 text-emerald-300 group-hover:bg-emerald-500/20")}>
                            <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                          <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-ink-300">{hotkey}</kbd>
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{s.name}</span>
                          <span className="block text-xs text-ink-300">{s.hint}</span>
                        </span>
                        {active && <span className="absolute right-3 bottom-3 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">On air</span>}
                      </button>
                    );
                  })}
                </div>
              </Panel>
            ))}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-[5.5rem] xl:order-2 xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto xl:pr-1">
            <Panel title="Program: what viewers see" aside={<span className="text-[11px] text-ink-400">Updates live</span>}>
              <div ref={previewRef} className="relative w-full overflow-hidden rounded-xl bg-[repeating-conic-gradient(#1a2339_0%_25%,#111827_0%_50%)] [background-size:24px_24px] ring-1 ring-white/10" style={{ aspectRatio: "16 / 9" }}>
                <iframe title="Program" src={`/overlay/${matchId}`} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: "1920px", height: "1080px", transform: `scale(${scale})` }} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" disabled={busy || !onAir} onClick={() => take("none")} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">
                  <LuEyeOff className="h-4 w-4" aria-hidden="true" /> Hide graphics
                  <kbd className="ml-1 rounded bg-black/25 px-1.5 text-[11px]">Esc</kbd>
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <label htmlFor="op-hide" className="text-xs text-ink-300">
                    Take it off after
                  </label>
                  <select id="op-hide" className={`${inputCls} !w-auto`} value={autoHide} onChange={(e) => setAutoHide(e.target.value)}>
                    {HIDE_AFTER.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>

            <Panel title="Options for the next graphic">
              <div className="space-y-4">
                {data && (
                  <div>
                    <label className={labelCls} htmlFor="op-team">
                      Playing XI of
                    </label>
                    <select id="op-team" className={inputCls} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                      <option value="">Both teams</option>
                      {data.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelCls} htmlFor="op-inn">
                    Scorecard of
                  </label>
                  <select id="op-inn" className={inputCls} value={innings} onChange={(e) => setInnings(Number(e.target.value))}>
                    <option value={1}>1st innings</option>
                    <option value={2}>2nd innings</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="op-text">
                    Message
                  </label>
                  <input id="op-text" className={inputCls} maxLength={140} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Drinks break" />
                  <input aria-label="Smaller line" className={`${inputCls} mt-2`} maxLength={200} value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="Smaller line (optional)" />
                </div>
              </div>
            </Panel>

            <Panel title="Player of the match">
              <label className={labelCls} htmlFor="op-potm">
                Choose the player
              </label>
              <select
                id="op-potm"
                className={inputCls}
                value={potm}
                onChange={(e) => {
                  setPotm(e.target.value);
                  setSavedPotm(false);
                }}
              >
                <option value="">Choose…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.team}){suggested && suggested.id === p.id ? " · suggested" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy || !potm} onClick={savePotm} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40">
                  {savedPotm ? "Saved" : "Save"}
                </button>
                {suggested && !potm && (
                  <button type="button" onClick={() => setPotm(String(suggested.id))} className="text-xs font-semibold text-emerald-300 hover:underline">
                    Use suggestion: {suggested.name}
                  </button>
                )}
              </div>
            </Panel>

            <p className="px-1 text-xs leading-relaxed text-ink-400">The score bar always stays at the bottom. Graphics appear over the live picture and leave by themselves when you set a time.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
