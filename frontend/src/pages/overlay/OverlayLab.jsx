import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OverlayStage from "../../components/Overlay/OverlayStage";
import { THEMES, withDefaults } from "../../components/Overlay/barConfig";
import { PremiumDebug } from "../../components/Overlay/premium/clock";
import { usePremiumIntro } from "../../components/Overlay/premium/PremiumIntro";
import { currentInnings, detectEvent } from "../../components/Scoring/scoreUtils";
import { afterWicket, beforeInnings, betweenOvers, fifty, freshMatch, hit, labData, newBatter, newBowler, openers, setFreeHit, wicket } from "./overlayLabData";

// /overlay-lab : a test bench for the broadcast themes. No match, no login, no server: a made-up match is played here, and
// every move goes through the same detectEvent / detectIntro the live overlay uses. The same picture is drawn in the Basic
// and in the Premium theme side by side, so every animation can be compared: Six, Four, Wicket, Fifty, Free hit,
// player intros, the Playing XI.

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const EVENT_MS = 4200;
const BACKDROPS = {
  stadium: "radial-gradient(1200px 520px at 50% 108%, rgba(46,160,67,.5), transparent 70%), linear-gradient(180deg, #27406b 0%, #1a2a4a 46%, #1d3a2a 100%)",
  green: "#00b140",
  dark: "#14161b",
  light: "#d8dce6",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The 1920 x 1080 picture, scaled to the width it is given. */
function Frame({ title, note, backdrop, children }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / CANVAS_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <section className="mx-auto min-w-0 w-full flex-1" style={{ maxWidth: "max(480px, calc((100vh - 250px) * 1.7778))" }}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <span className="text-[11px] text-zinc-500">{note}</span>
      </div>
      <div ref={box} className="relative w-full overflow-hidden rounded-lg ring-1 ring-zinc-700" style={{ aspectRatio: "16 / 9", background: BACKDROPS[backdrop] }}>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "bottom left" }}>{children}</div>
      </div>
    </section>
  );
}

const Btn = ({ children, onClick, tone = "zinc", active, disabled, title }) => {
  const tones = {
    zinc: "border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800",
    pink: "border-fuchsia-500/60 bg-fuchsia-600/20 text-fuchsia-100 hover:bg-fuchsia-600/40",
    cyan: "border-cyan-500/60 bg-cyan-600/20 text-cyan-100 hover:bg-cyan-600/40",
    red: "border-red-500/60 bg-red-600/20 text-red-100 hover:bg-red-600/40",
    gold: "border-amber-500/60 bg-amber-500/20 text-amber-100 hover:bg-amber-500/40",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-pressed={active} className={`rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? "ring-2 ring-white/70 " : ""}${tones[tone]}`}>
      {children}
    </button>
  );
};

const Group = ({ title, children }) => (
  <div>
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export default function OverlayLab() {
  const data = useMemo(() => labData(), []);
  const [chase, setChase] = useState(false);
  const [sb, setSb] = useState(() => freshMatch());
  const [event, setEvent] = useState(null);
  const [state, setState] = useState(null); // the operator's graphic: { scene, payload }
  const [bar, setBar] = useState(() => withDefaults({ corner: true }));
  const [view, setView] = useState("both"); // both | basic | premium
  const [backdrop, setBackdrop] = useState("stadium");
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1); // 1 = real time; the effects can be slowed down to look at them
  const [scrub, setScrub] = useState(null); // null = playing; a number = frozen at that many seconds into the stinger
  const lastEvent = useRef(null);
  const previous = useRef(sb);
  const eventTimer = useRef(null);
  const stop = useRef(false);
  const { intro, feed, clear: clearIntro } = usePremiumIntro(7000, 120);

  const note = useCallback((text) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${text}`, ...l].slice(0, 6)), []);

  // exactly what OverlayPage does with every new scoreboard
  const receive = useCallback(
    (next, what) => {
      const found = detectEvent(previous.current, next);
      feed(previous.current, next);
      previous.current = next;
      setSb(next);
      if (found) {
        const e = { ...found, holdMs: EVENT_MS };
        lastEvent.current = e;
        setEvent(e);
        clearTimeout(eventTimer.current);
        if (scrub == null) eventTimer.current = setTimeout(() => setEvent(null), EVENT_MS / speed);
      }
      if (what) note(`${what}${found ? `  → event: ${found.kind}` : ""}`);
    },
    [feed, note, speed, scrub]
  );

  // moves that need the scoreboard to be in a certain state first jump there silently (no event), then play
  const quiet = (next) => {
    previous.current = next;
    setSb(next);
  };

  useEffect(
    () => () => {
      clearTimeout(eventTimer.current);
      stop.current = true;
    },
    []
  );

  const reset = (asChase = chase) => {
    stop.current = true;
    clearTimeout(eventTimer.current);
    setEvent(null);
    setState(null);
    clearIntro();
    quiet(freshMatch({ chase: asChase }));
    setRunning(false);
    note("Match reset");
  };

  const moves = {
    six: () => receive(hit(sb, 6), "Six"),
    four: () => receive(hit(sb, 4), "Four"),
    wicket: () => receive(wicket(sb), "Wicket"),
    fifty: (mark = 50) => {
      const [before, after] = fifty(sb, mark);
      quiet(before);
      setTimeout(() => receive(after, mark === 100 ? "Hundred" : "Fifty"), 250);
    },
    freeHit: () => {
      const on = !currentInnings(sb).freeHit;
      receive(setFreeHit(sb, on), on ? "Free hit ON" : "Free hit OFF");
    },
    newBatter: () => {
      const i = currentInnings(sb);
      const start = i.currentBatsmen.length >= 2 ? afterWicket(sb) : sb;
      quiet(start);
      setTimeout(() => receive(newBatter(start), "New batter"), 250);
    },
    openers: () => {
      const blank = beforeInnings(sb);
      quiet(blank);
      setTimeout(() => receive(openers(blank), "Opening pair + opening bowler"), 250);
    },
    newBowler: () => {
      const gap = betweenOvers(sb);
      quiet(gap);
      setTimeout(() => receive(newBowler(gap), "New bowler"), 250);
    },
    squad: (teamId) => {
      setState({ scene: "squads", payload: { teamId } });
      note(teamId ? `Playing XI: team ${teamId}` : "Playing XI: both teams");
    },
    replay: () => {
      if (!lastEvent.current) return note("Nothing to replay yet: play a Six, Four, Wicket or Fifty first");
      const e = { ...lastEvent.current, key: Number(lastEvent.current.key) + 1 };
      lastEvent.current = e;
      clearTimeout(eventTimer.current);
      setEvent(e);
      if (scrub == null) eventTimer.current = setTimeout(() => setEvent(null), EVENT_MS / speed);
      note(`Replay: ${e.kind}`);
    },
    clear: () => {
      setState(null);
      clearIntro();
      setEvent(null);
      note("Graphics off");
    },
    scene: (scene, payload = {}) => {
      setState({ scene, payload });
      note(`Operator graphic: ${scene}`);
    },
  };

  // a guided run through everything, for looking at all the animations in turn
  const runAll = async () => {
    stop.current = false;
    setRunning(true);
    const base = freshMatch({ chase });
    quiet(base);
    let cur = base;
    const step = async (label, make, wait) => {
      if (stop.current) return;
      cur = make(cur) || cur;
      receive(cur, label);
      await sleep(wait);
    };
    await sleep(600);
    await step("Six", (s) => hit(s, 6), 5200);
    await step("Four", (s) => hit(s, 4), 5200);
    await step("Free hit ON", (s) => setFreeHit(s, true), 3200);
    await step("Free hit OFF", (s) => setFreeHit(s, false), 1200);
    await step("Wicket", (s) => wicket(s), 5200);
    await step("New batter", (s) => newBatter(s), 8200);
    if (!stop.current) {
      setState({ scene: "squads", payload: {} });
      note("Playing XI: both teams");
      await sleep(7500);
      setState(null);
    }
    setRunning(false);
    note(stop.current ? "Run stopped" : "Run finished");
  };

  const i = currentInnings(sb);
  const common = { sb, inning: i, data, state, event, intro, bar, tag: undefined, corner: true, scorecard: null, rankings: null };
  const shown = view === "both" ? ["basic", "premium"] : [view];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Overlay test lab</h1>
        <span className="text-xs text-zinc-500">A made-up match: nothing here is saved or sent anywhere. Both themes get exactly the same data.</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md bg-zinc-900 p-0.5 ring-1 ring-inset ring-zinc-800" role="radiogroup" aria-label="View">
            {[
              ["both", "Side by side"],
              ...THEMES.map((t) => [t.value, `${t.label} only`]),
            ].map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={`rounded px-3 py-1 text-xs font-semibold ${view === v ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            Backdrop
            <select value={backdrop} onChange={(e) => setBackdrop(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100">
              <option value="stadium">Stadium</option>
              <option value="green">Green screen</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
        </div>
      </header>

      <div className="mb-4 grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3 md:grid-cols-2 xl:grid-cols-5">
        <Group title="Events">
          <Btn tone="pink" onClick={moves.six}>
            Six
          </Btn>
          <Btn tone="cyan" onClick={moves.four}>
            Four
          </Btn>
          <Btn tone="red" onClick={moves.wicket}>
            Wicket
          </Btn>
          <Btn tone="gold" onClick={() => moves.fifty(50)}>
            Fifty
          </Btn>
          <Btn tone="gold" onClick={() => moves.fifty(100)}>
            Hundred
          </Btn>
          <Btn tone="pink" active={!!i.freeHit} onClick={moves.freeHit} title="Switch the free-hit alert on and off">
            Free hit
          </Btn>
        </Group>
        <Group title="Player intros">
          <Btn onClick={moves.newBatter}>New batter</Btn>
          <Btn onClick={moves.openers}>Opening pair + bowler</Btn>
          <Btn onClick={moves.newBowler}>New bowler</Btn>
        </Group>
        <Group title="Playing XI / operator graphics">
          <Btn onClick={() => moves.squad(null)}>Both teams</Btn>
          <Btn onClick={() => moves.squad(1)}>{data.teams[0].name}</Btn>
          <Btn onClick={() => moves.squad(2)}>{data.teams[1].name}</Btn>
          <Btn onClick={() => moves.scene("openers")} title="The operator's Openers graphic">Openers</Btn>
          <Btn onClick={() => moves.scene("bowler")} title="The operator's Bowler graphic">Bowler</Btn>
          <Btn onClick={() => moves.scene("scorecard", { innings: 1 })} title="A Basic-only graphic: Premium hands it to the Basic theme">Scorecard</Btn>
          <Btn tone="red" onClick={moves.clear}>
            Take off
          </Btn>
        </Group>
        <Group title="Review the animation">
          <Btn onClick={moves.replay} title="Play the last four / six / wicket / fifty again, same score">
            ↻ Replay event
          </Btn>
          {[1, 0.5, 0.25].map((v) => (
            <Btn key={v} active={speed === v} onClick={() => setSpeed(v)} title="Playback speed of the effects">
              {v === 1 ? "1×" : v === 0.5 ? "½×" : "¼×"}
            </Btn>
          ))}
          <label className="flex w-full items-center gap-2 text-[12px] text-zinc-400">
            <input
              type="checkbox"
              checked={scrub != null}
              onChange={(e) => {
                if (e.target.checked) setScrub(0.5);
                else {
                  setScrub(null);
                  setEvent(null);
                }
              }}
            />
            Freeze on a frame
            <input type="range" min="0" max="5.5" step="0.02" value={scrub == null ? 0 : scrub} disabled={scrub == null} onChange={(e) => setScrub(Number(e.target.value))} className="min-w-0 flex-1" aria-label="Seconds into the stinger" />
            <span className="w-10 text-right tabular-nums">{scrub == null ? "" : `${scrub.toFixed(2)}s`}</span>
          </label>
        </Group>
        <Group title="Match">
          <Btn tone="gold" onClick={runAll} disabled={running}>
            ▶ Play everything
          </Btn>
          {running && (
            <Btn
              onClick={() => {
                stop.current = true;
              }}
            >
              Stop
            </Btn>
          )}
          <Btn
            active={chase}
            onClick={() => {
              setChase(!chase);
              reset(!chase);
            }}
            title="Show the target / required rate block instead of run rate"
          >
            2nd innings (chase)
          </Btn>
          <Btn onClick={() => reset()}>Reset</Btn>
          <Btn active={!bar.events} onClick={() => setBar({ ...bar, events: !bar.events })} title="The operator's 4 · 6 · Wicket · 50 switch">
            Events {bar.events ? "on" : "off"}
          </Btn>
          <Btn active={!bar.photos} onClick={() => setBar({ ...bar, photos: !bar.photos })}>
            Photos {bar.photos ? "on" : "off"}
          </Btn>
        </Group>
      </div>

      <div className={`flex gap-4 ${view === "both" ? "flex-col xl:flex-row" : ""}`}>
        {shown.map((theme) => (
          <Frame key={theme} title={theme === "premium" ? "Premium theme" : "Basic theme"} note={theme === "premium" ? "T20 World Cup style" : "the current graphics"} backdrop={backdrop}>
            <PremiumDebug.Provider value={{ speed, scrub }}>
              <OverlayStage key={theme} theme={theme} {...common} />
            </PremiumDebug.Provider>
          </Frame>
        ))}
      </div>

      <ul className="mt-3 space-y-0.5 text-[12px] text-zinc-500" aria-label="What was played">
        {log.length === 0 && <li>Press a button above. Events play in both pictures at the same time.</li>}
        {log.map((l) => (
          <li key={l} className="tabular-nums">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
