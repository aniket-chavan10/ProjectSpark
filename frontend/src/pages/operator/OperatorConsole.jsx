import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  LuCircleDot,
  LuCircleX,
  LuClapperboard,
  LuClipboardList,
  LuCoins,
  LuContactRound,
  LuEyeOff,
  LuFlag,
  LuHandshake,
  LuKeyRound,
  LuMedal,
  LuMessageSquareText,
  LuStar,
  LuSwords,
  LuTarget,
  LuTimer,
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
import { BAR_PRESETS, THEMES, isPreset, withDefaults } from "../../components/Overlay/barConfig";
import { cx } from "../../components/ui/kit";

// The graphics desk. The person running the on-air graphics works here, apart from the scorer, on a link the scorer
// copied (it carries a key for this match only). Everything is on one screen, no scrolling:
//   left    the program monitor (what viewers see) and the score bar: which parts of it show
//   middle  the graphics rack: one click puts a graphic on air (number keys do too, Esc takes everything off)
//   right   the options a graphic needs (which team, which innings, which player, a message) and the player of the match

const SCENES = [
  { id: "preview", group: "Before the match", icon: LuClapperboard, name: "Match preview" },
  { id: "squads", group: "Before the match", icon: LuUsers, name: "Playing XI" },
  { id: "toss", group: "Before the match", icon: LuCoins, name: "Toss" },
  { id: "openers", group: "Before the match", icon: LuSwords, name: "Openers" },
  { id: "batters", group: "In play", icon: LuUserRound, name: "Batters" },
  { id: "bowler", group: "In play", icon: LuCircleDot, name: "Bowler" },
  { id: "player", group: "In play", icon: LuContactRound, name: "Player card" },
  { id: "over_summary", group: "In play", icon: LuTimer, name: "End of over" },
  { id: "partnership", group: "In play", icon: LuHandshake, name: "Partnership" },
  { id: "last_wicket", group: "In play", icon: LuCircleX, name: "Fall of wicket" },
  { id: "target", group: "In play", icon: LuTarget, name: "Target" },
  { id: "scorecard", group: "Scorecards", icon: LuClipboardList, name: "Scorecard" },
  { id: "summary", group: "Scorecards", icon: LuStar, name: "Top performers" },
  { id: "result", group: "After the match", icon: LuFlag, name: "Result" },
  { id: "potm", group: "After the match", icon: LuMedal, name: "Player of the match" },
  { id: "rankings", group: "After the match", icon: LuTrophy, name: "Top teams" },
  { id: "message", group: "Your own", icon: LuMessageSquareText, name: "Message" },
];

const GROUPS = [...new Set(SCENES.map((s) => s.group))];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y", "u"];
const HIDE_AFTER = [
  { value: "", label: "Hold" },
  { value: 6, label: "6s" },
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 25, label: "25s" },
];

const field = "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-spark-500 focus:outline-none focus:ring-1 focus:ring-spark-500";

/** A titled block of the desk. */
function Panel({ title, aside, children, className }) {
  return (
    <section className={cx("rounded-lg border border-zinc-800 bg-zinc-900", className)}>
      <div className="flex h-9 items-center justify-between border-b border-zinc-800 px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{title}</h2>
        {aside}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/** A row of choices where exactly one is picked. */
function Segmented({ value, onChange, options, label, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-md bg-zinc-950 p-0.5 ring-1 ring-inset ring-zinc-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cx("min-w-0 flex-1 truncate rounded px-2 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40", value === o.value ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-100")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** An on/off switch with its label. */
function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-zinc-200 hover:bg-zinc-800/70 disabled:opacity-40">
      <span className="truncate">{label}</span>
      <span className={cx("relative h-[18px] w-8 shrink-0 rounded-full transition-colors", checked ? "bg-green-500" : "bg-zinc-700")}>
        <span className={cx("absolute top-0.5 h-[14px] w-[14px] rounded-full bg-white shadow transition-all", checked ? "left-[16px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function Gate({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <LuKeyRound className="h-6 w-6 text-spark-400" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <div className="mt-2 text-sm text-zinc-400">{children}</div>
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
  const [which, setWhich] = useState("both");
  const [innings, setInnings] = useState(1);
  const [pick, setPick] = useState({ role: "striker" }); // the player card: { role } follows the play, { playerId } is fixed
  const [text, setText] = useState("");
  const [subtext, setSubtext] = useState("");
  const [potm, setPotm] = useState("");
  const [savedPotm, setSavedPotm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const previewRef = useRef(null);
  const [scale, setScale] = useState(0.3);

  const bar = withDefaults(live && live.bar);

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
    return watchMatch(matchId, { onScoreboard: setSb, onOverlay: (s) => s && s.scene && setLive(s), onStatus: setLink });
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

  const fail = (e) => {
    if (e.status === 401 || e.status === 403) setFatal(e.message);
    else setError(e.message);
  };

  const take = useCallback(
    async (scene) => {
      setBusy(true);
      setError("");
      try {
        const payload = scene === "squads" ? { teamId: teamId || null } : scene === "scorecard" ? { innings } : scene === "batters" ? { which } : scene === "player" ? pick : scene === "message" ? { text, subtext } : {};
        const next = await api.setScene(matchId, { scene, payload, autoHide: scene === "none" || autoHide === "" ? null : Number(autoHide) });
        setLive(next);
      } catch (e) {
        fail(e);
      } finally {
        setBusy(false);
      }
    },
    [api, matchId, teamId, innings, which, pick, text, subtext, autoHide]
  );

  // the score bar: the change shows at once on the desk and is then confirmed by the server
  const setBar = async (change) => {
    setLive((l) => ({ ...(l || { scene: "none", payload: {} }), bar: { ...bar, ...change } }));
    setError("");
    try {
      const next = await api.setBar(matchId, change);
      setLive(next);
    } catch (e) {
      fail(e);
      load();
    }
  };

  // keyboard: number keys and q w e r t y u take a graphic, Escape / H takes everything off
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
    return data.teams.map((t) => {
      const squad = data.squads[t.id];
      return { team: t, list: squad ? squad.playing.map((p) => ({ id: p.player_id, name: p.players_name })) : [] };
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
        <p className="mt-3 text-xs text-zinc-500">Ask the scorer for a new operator link.</p>
      </Gate>
    );
  }

  const onAir = live && live.scene !== "none" ? SCENES.find((s) => s.id === live.scene) : null;
  const shown = live && live.shownAt ? new Date(live.shownAt).getTime() : null;
  const left = onAir && live.autoHide && shown ? Math.max(0, live.autoHide - (now - shown) / 1000) : null;
  const suggested = data && data.suggestedPlayerOfMatch;
  const title = data ? data.teams.map((t) => t.name).join(" v ") : "Loading…";
  const fixedPlayer = pick.playerId ? String(pick.playerId) : "";
  const barIsMinimal = isPreset(bar, BAR_PRESETS.minimal);
  const barIsFull = isPreset(bar, BAR_PRESETS.full);
  const premium = bar.theme === "premium";

  return (
    <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ---------------------------------- top bar ---------------------------------- */}
      <header className="relative flex h-12 shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-900 px-4">
        <SparkMark size={26} />
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Graphics desk</span>
          <h1 className="truncate text-sm font-semibold text-zinc-100">
            {title}
            {data && data.tournament ? <span className="ml-3 font-normal text-zinc-500">{data.tournament.name}</span> : null}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {onAir ? (
            <span className="inline-flex items-center gap-2 rounded bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" /> On air · {onAir.name}
              {left !== null && <span className="tabular ml-1 font-semibold text-red-100">{Math.ceil(left)}s</span>}
            </span>
          ) : (
            <span className="rounded bg-zinc-800 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Score bar only</span>
          )}
          <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", link === "connected" ? "text-emerald-400" : "text-amber-400")}>
            {link === "connected" ? <LuWifi className="h-4 w-4" aria-hidden="true" /> : <LuWifiOff className="h-4 w-4" aria-hidden="true" />}
            {link === "connected" ? "Connected" : "Reconnecting"}
          </span>
        </div>
        {left !== null && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-red-500 transition-[width] duration-200 ease-linear" style={{ width: `${(left / live.autoHide) * 100}%` }} aria-hidden="true" />}
      </header>

      {error && (
        <div role="alert" className="shrink-0 border-b border-red-900 bg-red-950/60 px-4 py-1.5 text-[13px] text-red-200">
          {error}
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(0,0.85fr)] lg:overflow-hidden">
        {/* ------------------------------ program + score bar ------------------------------ */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <Panel title="Program" aside={<span className="text-[11px] text-zinc-500">What viewers see</span>}>
            <div ref={previewRef} className="relative w-full overflow-hidden rounded bg-[repeating-conic-gradient(#1c1f26_0%_25%,#14161b_0%_50%)] [background-size:20px_20px] ring-1 ring-zinc-700" style={{ aspectRatio: "16 / 9" }}>
              <iframe title="Program" src={`/overlay/${matchId}`} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: "1920px", height: "1080px", transform: `scale(${scale})` }} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" disabled={busy || !onAir} onClick={() => take("none")} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                <LuEyeOff className="h-4 w-4" aria-hidden="true" /> Take off
                <kbd className="rounded bg-black/25 px-1.5 text-[10px] font-semibold">Esc</kbd>
              </button>
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Auto take off</span>
                <div className="w-56">
                  <Segmented label="Take off after" value={autoHide} onChange={setAutoHide} options={HIDE_AFTER} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Score bar"
            className="min-h-0 flex-1"
            aside={
              <div className="flex items-center gap-1">
                <div role="radiogroup" aria-label="Theme" className="mr-1 flex items-center gap-1 border-r border-zinc-700 pr-2.5">
                  <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Theme</span>
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={bar.theme === t.value}
                      onClick={() => setBar({ theme: t.value })}
                      className={cx("rounded px-2 py-0.5 text-[11px] font-semibold", bar.theme === t.value ? (t.value === "premium" ? "bg-fuchsia-600 text-white" : "bg-zinc-700 text-white") : "text-zinc-400 hover:text-white")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setBar(BAR_PRESETS.full)} className={cx("rounded px-2 py-0.5 text-[11px] font-semibold", barIsFull ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white")}>
                  Full
                </button>
                <button type="button" onClick={() => setBar(BAR_PRESETS.minimal)} className={cx("rounded px-2 py-0.5 text-[11px] font-semibold", barIsMinimal ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white")}>
                  Score only
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              <div className="grid grid-cols-[1.7fr_1fr] gap-2">
                <div>
                  <p className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Batters in the bar</p>
                  <Segmented
                    label="Batters in the bar"
                    value={bar.batters}
                    onChange={(v) => setBar({ batters: v })}
                    disabled={!bar.visible}
                    options={[
                      { value: "both", label: "Both" },
                      { value: "striker", label: "Striker" },
                      { value: "nonStriker", label: "Non-striker" },
                      { value: "none", label: "Off" },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500" title={premium ? "The Premium theme always plays them in the bar and as a stinger" : undefined}>
                    4 · 6 · Wicket · 50 play
                  </p>
                  <Segmented
                    label="Where four, six, wicket and fifty play"
                    value={bar.eventStyle}
                    onChange={(v) => setBar({ eventStyle: v })}
                    disabled={!bar.visible || !bar.events || premium}
                    options={[
                      { value: "bar", label: "In the bar" },
                      { value: "banner", label: "Above" },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <Switch checked={bar.visible} onChange={(v) => setBar({ visible: v })} label="Show the score bar" />
                <Switch checked={bar.events} onChange={(v) => setBar({ events: v })} label="4 · 6 · Wicket · 50" disabled={!bar.visible} />
                <Switch checked={bar.bowler} onChange={(v) => setBar({ bowler: v })} label="Bowler" disabled={!bar.visible} />
                <Switch checked={bar.thisOver} onChange={(v) => setBar({ thisOver: v })} label="This over" disabled={!bar.visible} />
                <Switch checked={bar.info} onChange={(v) => setBar({ info: v })} label="Target / run rate" disabled={!bar.visible} />
                <Switch checked={bar.photos} onChange={(v) => setBar({ photos: v })} label="Player photos" disabled={!bar.visible} />
                <Switch checked={bar.corner} onChange={(v) => setBar({ corner: v })} label="Corner tag" />
              </div>
            </div>
          </Panel>
        </div>

        {/* ------------------------------------ rack ------------------------------------ */}
        <Panel title="Graphics" className="flex min-h-0 min-w-0 flex-col [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:overflow-y-auto" aside={<span className="text-[11px] text-zinc-500">Click or press the key</span>}>
          <div className="flex h-full flex-col justify-between gap-2">
            {GROUPS.map((g) => (
              <div key={g}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{g}</p>
                <div className="grid grid-cols-2 gap-1.5">
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
                        title={needsText ? "Type the message first" : s.name}
                        className={cx(
                          "relative flex h-[clamp(2.5rem,5.4vh,3.5rem)] items-center gap-2.5 rounded-md border px-2.5 text-left text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spark-500 disabled:cursor-not-allowed disabled:opacity-40",
                          active ? "border-red-500 bg-red-600 text-white" : "border-zinc-700 bg-zinc-800/60 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800"
                        )}
                      >
                        <s.icon className={cx("h-4 w-4 shrink-0", active ? "text-white" : "text-zinc-400")} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                        <kbd className={cx("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", active ? "bg-black/25 text-white" : "bg-zinc-950 text-zinc-400")}>{hotkey}</kbd>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ---------------------------------- options ---------------------------------- */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <Panel title="Options for the graphic" className="min-h-0">
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Playing XI of</p>
                <Segmented label="Playing XI of" value={teamId} onChange={setTeamId} options={[{ value: "", label: "Both" }, ...(data ? data.teams.map((t) => ({ value: String(t.id), label: t.name })) : [])]} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Batters</p>
                <Segmented
                  label="Batters"
                  value={which}
                  onChange={setWhich}
                  options={[
                    { value: "both", label: "Both" },
                    { value: "striker", label: "Striker" },
                    { value: "nonStriker", label: "Non-striker" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Scorecard of</p>
                <Segmented
                  label="Scorecard of"
                  value={innings}
                  onChange={setInnings}
                  options={[
                    { value: 1, label: "1st innings" },
                    { value: 2, label: "2nd innings" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Player card</p>
                <Segmented
                  label="Player card"
                  value={pick.role || "id"}
                  onChange={(v) => setPick(v === "id" ? (fixedPlayer ? { playerId: Number(fixedPlayer) } : { role: "striker" }) : { role: v })}
                  options={[
                    { value: "striker", label: "Striker" },
                    { value: "nonStriker", label: "Non-striker" },
                    { value: "bowler", label: "Bowler" },
                  ]}
                />
                <select aria-label="Choose any player" className={cx(field, "mt-1.5")} value={fixedPlayer} onChange={(e) => setPick(e.target.value ? { playerId: Number(e.target.value) } : { role: "striker" })}>
                  <option value="">…or choose any player</option>
                  {players.map((g) => (
                    <optgroup key={g.team.id} label={g.team.name}>
                      {g.list.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Message</p>
                <input aria-label="Message" className={field} maxLength={140} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Drinks break" />
                <input aria-label="Smaller line" className={cx(field, "mt-1.5")} maxLength={200} value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="Smaller line (optional)" />
              </div>
            </div>
          </Panel>

          <Panel title="Player of the match">
            <div className="flex gap-2">
              <select
                aria-label="Player of the match"
                className={field}
                value={potm}
                onChange={(e) => {
                  setPotm(e.target.value);
                  setSavedPotm(false);
                }}
              >
                <option value="">Choose…</option>
                {players.map((g) => (
                  <optgroup key={g.team.id} label={g.team.name}>
                    {g.list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {suggested && suggested.id === p.id ? " · suggested" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="button" disabled={busy || !potm} onClick={savePotm} className="shrink-0 rounded-md bg-spark-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-spark-500 disabled:bg-zinc-800 disabled:text-zinc-500">
                {savedPotm ? "Saved" : "Save"}
              </button>
            </div>
            {suggested && !potm && (
              <button type="button" onClick={() => setPotm(String(suggested.id))} className="mt-2 text-xs font-semibold text-spark-400 hover:underline">
                Use suggestion: {suggested.name}
              </button>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}
