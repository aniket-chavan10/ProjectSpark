import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import scoringApi from "../../api/scoringApi";
import { overlayApi, publicApi } from "../../api/sparkApi";
import { watchMatch } from "../../api/matchSocket";
import OverlayStage from "../../components/Overlay/OverlayStage";
import { NEEDS_RANKINGS, NEEDS_SCORECARD } from "../../components/Overlay/Scenes";
import { pickTheme, withDefaults } from "../../components/Overlay/barConfig";
import { usePremiumIntro } from "../../components/Overlay/premium/PremiumIntro";
import { currentInnings, detectEvent } from "../../components/Scoring/scoreUtils";

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const BACKGROUNDS = { green: "#00b140", dark: "#1f2937", light: "#e5e7eb" };
const EVENT_MS = 4200;

/**
 * /overlay/:matchId  -  for the streaming software (OBS: Browser source, 1920x1080, transparent).
 * The score bar runs along the bottom; the operator's desk can put more on air (squads, openers, scorecard ...)
 * and decides which parts of the bar show (batters, bowler, this over, photos ...).
 * ?bg=green|dark|light shows a colour behind it for testing; ?tag=Text replaces the "Match 5" tag; ?event=8 sets how long banners stay;
 * ?corner=0 hides the tournament / LIVE tag in the top-left corner; ?scale=0.75 draws the 1920 x 1080 picture at a fixed size
 * instead of fitting it to the window.
 * ?theme=premium|basic picks the look of the graphics for this page; without it the operator's choice (desk, "Theme") is followed.
 */
export default function OverlayPage() {
  const { matchId } = useParams();
  const [params] = useSearchParams();
  const bg = BACKGROUNDS[params.get("bg")] || "transparent";
  const tag = params.get("tag") || undefined;
  const corner = params.get("corner") !== "0";
  const fixedScale = Number(params.get("scale")) || 0;
  const urlTheme = params.get("theme");
  const eventMs = (Number(params.get("event")) || 0) * 1000 || EVENT_MS; // ?event=8 keeps the four / six / wicket banner up for 8 seconds

  const [sb, setSb] = useState(null);
  const [event, setEvent] = useState(null);
  const [problem, setProblem] = useState("");
  const [data, setData] = useState(null); // teams, squads, player of the match
  const [state, setState] = useState(null); // what the operator wants on air
  const [bar, setBar] = useState(withDefaults()); // which parts of the score bar show
  const [scorecard, setScorecard] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [scale, setScale] = useState(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
  const previous = useRef(null);
  const timer = useRef(null);
  const hideTimer = useRef(null);
  const connected = useRef(false);
  const { intro, feed: feedIntro } = usePremiumIntro(); // who just came in (the Premium theme shows it; the Basic one ignores it)

  // transparent page, condensed broadcast font
  useEffect(() => {
    const oldHtml = document.documentElement.style.background;
    const oldBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&display=swap";
    document.head.appendChild(link);
    return () => {
      document.documentElement.style.background = oldHtml;
      document.body.style.background = oldBody;
      link.remove();
    };
  }, []);

  useEffect(() => {
    const onResize = () => setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // every new scoreboard: work out what just happened (four, six, wicket, fifty ...) and show it for a few seconds
  const receive = (next) => {
    const found = detectEvent(previous.current, next);
    feedIntro(previous.current, next);
    previous.current = next;
    setSb(next);
    setProblem("");
    if (found) {
      setEvent({ ...found, holdMs: eventMs }); // holdMs: how long it stays up (the Premium bar counts it down)
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setEvent(null), eventMs);
    }
  };

  // the operator's choice. A scene with "hide after" goes away by itself; a reload keeps what is left of the time.
  const showScene = (next, fresh) => {
    clearTimeout(hideTimer.current);
    if (next && next.bar) setBar(withDefaults(next.bar));
    if (!next || next.scene === "none") return setState(null);
    let remaining = null;
    if (next.autoHide) {
      remaining = next.autoHide * 1000;
      if (!fresh && next.shownAt) remaining -= Date.now() - new Date(next.shownAt).getTime();
      if (remaining <= 0) return setState(null);
    }
    setState(next);
    if (remaining !== null) hideTimer.current = setTimeout(() => setState(null), remaining);
  };

  useEffect(() => {
    let alive = true;
    const load = () =>
      scoringApi
        .getScoreboard(matchId)
        .then((d) => alive && receive(d))
        .catch((e) => alive && !previous.current && setProblem(e.message));
    const loadDesk = () =>
      overlayApi
        .get(matchId)
        .then((d) => {
          if (!alive) return;
          setData(d);
          showScene(d.state, false);
        })
        .catch(() => {});
    load();
    loadDesk();
    const stop = watchMatch(matchId, {
      onScoreboard: receive,
      onOverlay: (s) => alive && showScene(s, true),
      onStatus: (s) => {
        connected.current = s === "connected";
        if (s === "connected") {
          load(); // catch up after a drop
          loadDesk();
        }
      },
    });
    // a safety net: if the socket is down, keep polling
    const poll = setInterval(() => {
      if (connected.current) return;
      load();
      loadDesk();
    }, 6000);
    return () => {
      alive = false;
      stop();
      clearInterval(poll);
      clearTimeout(timer.current);
      clearTimeout(hideTimer.current);
    };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // the full scorecard / ranking table, only while a scene needs them (and fresh after every ball)
  const scene = state ? state.scene : "none";
  const lastBall = sb ? currentInnings(sb).lastBallId : 0;
  useEffect(() => {
    if (!NEEDS_SCORECARD.includes(scene)) return undefined;
    let alive = true;
    scoringApi
      .getScorecard(matchId)
      .then((c) => alive && setScorecard(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [scene, matchId, lastBall]);
  useEffect(() => {
    if (!NEEDS_RANKINGS.includes(scene)) return;
    publicApi
      .teamRankings()
      .then((r) => setRankings(r.items))
      .catch(() => setRankings([]));
  }, [scene]);

  const inning = sb ? currentInnings(sb) : null;
  const theme = pickTheme(urlTheme, bar);

  return (
    <div style={{ position: "fixed", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: CANVAS_W, height: CANVAS_H, transform: `scale(${fixedScale || scale})`, transformOrigin: "bottom left" }}>
        <OverlayStage key={theme} theme={theme} sb={sb} inning={inning} data={data} state={state} event={event} intro={intro} bar={bar} tag={tag} corner={corner} scorecard={scorecard} rankings={rankings} />
        {problem && <div style={{ position: "absolute", left: 96, bottom: 52, color: "#fff", background: "rgba(220,38,38,.85)", padding: "12px 24px", borderRadius: 8, fontFamily: "sans-serif", fontSize: 24 }}>{problem}</div>}
      </div>
    </div>
  );
}
