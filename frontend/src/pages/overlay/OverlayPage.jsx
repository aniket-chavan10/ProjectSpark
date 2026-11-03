import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import scoringApi from "../../api/scoringApi";
import { overlayApi, publicApi } from "../../api/sparkApi";
import { watchMatch } from "../../api/matchSocket";
import { AnimatePresence } from "framer-motion";
import ScoreBug from "../../components/Overlay/ScoreBug";
import SceneLayer, { CornerBug, NEEDS_RANKINGS, NEEDS_SCORECARD, USES_TOP } from "../../components/Overlay/Scenes";
import { BroadcastStyles, photoLookup } from "../../components/Overlay/bc";
import { currentInnings, detectEvent } from "../../components/Scoring/scoreUtils";

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const BACKGROUNDS = { green: "#00b140", dark: "#1f2937", light: "#e5e7eb" };
const EVENT_MS = 4200;

/**
 * /overlay/:matchId  -  for the streaming software (OBS: Browser source, 1920x1080, transparent).
 * The score bar runs along the bottom; the operator's desk can put more on air (squads, openers, scorecard ...).
 * ?bg=green|dark|light shows a colour behind it for testing; ?tag=Text replaces the "Match 5" tag; ?event=8 sets how long banners stay;
 * ?corner=0 hides the tournament / LIVE tag in the top-left corner.
 */
export default function OverlayPage() {
  const { matchId } = useParams();
  const [params] = useSearchParams();
  const bg = BACKGROUNDS[params.get("bg")] || "transparent";
  const tag = params.get("tag") || undefined;
  const corner = params.get("corner") !== "0";
  const eventMs = (Number(params.get("event")) || 0) * 1000 || EVENT_MS; // ?event=8 keeps the four / six / wicket banner up for 8 seconds

  const [sb, setSb] = useState(null);
  const [event, setEvent] = useState(null);
  const [problem, setProblem] = useState("");
  const [data, setData] = useState(null); // teams, squads, player of the match
  const [state, setState] = useState(null); // what the operator wants on air
  const [scorecard, setScorecard] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [scale, setScale] = useState(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
  const previous = useRef(null);
  const timer = useRef(null);
  const hideTimer = useRef(null);
  const connected = useRef(false);

  // transparent page, condensed broadcast font
  useEffect(() => {
    const oldHtml = document.documentElement.style.background;
    const oldBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap";
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
    previous.current = next;
    setSb(next);
    setProblem("");
    if (found) {
      setEvent(found);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setEvent(null), eventMs);
    }
  };

  // the operator's choice. A scene with "hide after" goes away by itself; a reload keeps what is left of the time.
  const showScene = (next, fresh) => {
    clearTimeout(hideTimer.current);
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
  const photoOf = photoLookup(sb, data);

  return (
    <div style={{ position: "fixed", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "bottom left" }}>
        <BroadcastStyles />
        <AnimatePresence>{corner && sb && !USES_TOP.includes(scene) && <CornerBug key="corner" data={data} sb={sb} />}</AnimatePresence>
        <SceneLayer state={state} data={data} sb={sb} inning={inning} scorecard={scorecard} rankings={rankings} />
        {sb && inning && <ScoreBug sb={sb} inning={inning} event={event} tournamentTag={tag} photoOf={photoOf} />}
        {problem && <div style={{ position: "absolute", left: 96, bottom: 52, color: "#fff", background: "rgba(220,38,38,.85)", padding: "12px 24px", borderRadius: 8, fontFamily: "sans-serif", fontSize: 24 }}>{problem}</div>}
      </div>
    </div>
  );
}
