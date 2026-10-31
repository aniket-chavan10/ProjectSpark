import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import scoringApi from "../../api/scoringApi";
import { watchMatch } from "../../api/matchSocket";
import ScoreBug from "../../components/Overlay/ScoreBug";
import { currentInnings, detectEvent } from "../../components/Scoring/scoreUtils";

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const BACKGROUNDS = { green: "#00b140", dark: "#1f2937", light: "#e5e7eb" };
const EVENT_MS = 4200;

/**
 * /overlay/:matchId  -  for the streaming software (OBS: Browser source, 1920x1080, transparent).
 * Only the score bar along the bottom is drawn; the rest stays transparent.
 * ?bg=green|dark|light shows a colour behind it for testing.
 */
export default function OverlayPage() {
  const { matchId } = useParams();
  const [params] = useSearchParams();
  const bg = BACKGROUNDS[params.get("bg")] || "transparent";
  const tag = params.get("tag") || undefined;

  const [sb, setSb] = useState(null);
  const [event, setEvent] = useState(null);
  const [problem, setProblem] = useState("");
  const [scale, setScale] = useState(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
  const previous = useRef(null);
  const timer = useRef(null);
  const connected = useRef(false);

  // transparent page, condensed broadcast font
  useEffect(() => {
    const oldHtml = document.documentElement.style.background;
    const oldBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&display=swap";
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
      timer.current = setTimeout(() => setEvent(null), EVENT_MS);
    }
  };

  useEffect(() => {
    let alive = true;
    const load = () =>
      scoringApi
        .getScoreboard(matchId)
        .then((d) => alive && receive(d))
        .catch((e) => alive && !previous.current && setProblem(e.message));
    load();
    const stop = watchMatch(matchId, {
      onScoreboard: receive,
      onStatus: (s) => {
        connected.current = s === "connected";
        if (s === "connected") load(); // catch up after a drop
      },
    });
    // a safety net: if the socket is down, keep polling
    const poll = setInterval(() => !connected.current && load(), 6000);
    return () => {
      alive = false;
      stop();
      clearInterval(poll);
      clearTimeout(timer.current);
    };
  }, [matchId]);

  const inning = sb ? currentInnings(sb) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "bottom left" }}>
        {sb && inning && <ScoreBug sb={sb} inning={inning} event={event} tournamentTag={tag} />}
        {problem && <div style={{ position: "absolute", left: 96, bottom: 52, color: "#fff", background: "rgba(220,38,38,.85)", padding: "12px 24px", borderRadius: 8, fontFamily: "sans-serif", fontSize: 24 }}>{problem}</div>}
      </div>
    </div>
  );
}
