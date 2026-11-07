import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { photoLookup } from "../bc";
import { useDebug } from "./clock";
import SceneLayer, { USES_TOP } from "../Scenes";
import PremiumIntro, { introItems, sceneIntro } from "./PremiumIntro";
import PremiumScoreBug from "./PremiumScoreBug";
import PremiumSquad from "./PremiumSquad";
import PremiumMilestone, { MILESTONE_MS } from "./PremiumMilestone";
import PremiumStinger, { STINGER_MS } from "./PremiumStinger";
import { FONT, P, PLATE_BG, PLATE_EDGE, PremiumStyles, accentLine, cascade, caps, keep, openFrom, personLookup, popIn, slideIn } from "./pm";

// The Premium broadcast theme, as one component. It takes the same things the Basic theme is given:
//   sb, inning        the live scoreboard and its current innings
//   data              the overlay data (teams, squads, career figures ...)
//   state             what the operator put on air: { scene, payload }
//   event             the four / six / wicket / fifty that just happened (detectEvent)
//   bar               the operator's switches for the score bar
// plus `intro`, the player(s) who just came in (usePremiumIntro), which the Basic theme simply never looks at.
//
// What the Premium theme restyles: the score bug, the stinger for a four / six / wicket / fifty, the player intro cards
// (also what the operator's Openers / Batters / Bowler / Player graphics show here) and the Playing XI. Every other
// scene (scorecard, result, rankings ...) is still drawn by the Basic theme, so nothing the operator can put on air is missing.

/** The tournament and LIVE tag in the top-left corner. */
function PremiumCorner({ data, sb }) {
  const name = data && data.tournament ? data.tournament.name : sb ? `${sb.teams.team1.name} v ${sb.teams.team2.name}` : "";
  const live = sb && sb.status !== "completed";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={keep} style={{ position: "absolute", left: 60, top: 46, fontFamily: FONT, color: "#fff", filter: "drop-shadow(0 12px 22px rgba(0,0,0,.5))" }}>
      <motion.div variants={openFrom("left")}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, height: 56, padding: "0 40px 0 22px", background: PLATE_BG, boxShadow: PLATE_EDGE, clipPath: "polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: accentLine() }} />
          <motion.div variants={cascade(0.2, 0.08)} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {live && (
              <motion.span variants={popIn} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(100deg, ${P.magenta}, #c4136f)`, padding: "3px 14px 2px", ...caps, fontWeight: 800, fontSize: 21, letterSpacing: 3 }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: "#fff", animation: "pm-live 1.4s ease-in-out infinite" }} />
                Live
              </motion.span>
            )}
            <motion.span variants={slideIn(-20)} style={{ ...caps, fontWeight: 800, fontSize: 28, letterSpacing: 3, whiteSpace: "nowrap" }}>
              {name}
            </motion.span>
            {sb && (
              <motion.span variants={slideIn(-20)} style={{ ...caps, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: P.cyan, whiteSpace: "nowrap" }}>
                Match {sb.matchNo}
              </motion.span>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PremiumBroadcastOverlay({ sb, inning, data, state, event, intro, bar, tag, corner = true, scorecard, rankings }) {
  const scene = state ? state.scene : "none";
  const payload = (state && state.payload) || {};
  const fullScreen = scene === "squads"; // the squad graphic takes the whole picture, so the ribbon steps aside
  const photoOf = photoLookup(sb, data);
  const person = personLookup(sb, data);

  // the stinger (or, for a fifty / hundred, the milestone card) plays for its own time from the moment the event is seen,
  // whatever happens to `event` after that
  const [stinger, setStinger] = useState(null);
  const stingerTimer = useRef(null);
  const eventKey = event ? event.key : null;
  const { speed, scrub } = useDebug(); // the test lab can slow the stinger down or freeze it on a frame; on air these never change
  useEffect(() => {
    if (!event || !bar.events) return;
    clearTimeout(stingerTimer.current);
    setStinger(event);
    if (scrub == null) stingerTimer.current = setTimeout(() => setStinger(null), (event.kind === "milestone" ? MILESTONE_MS : STINGER_MS) / speed);
  }, [eventKey, bar.events]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (scrub == null) return undefined;
    clearTimeout(stingerTimer.current); // frozen on a frame: stay until the lab lets go
    return () => setStinger(null);
  }, [scrub == null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(stingerTimer.current), []);

  // intro cards: the ones that just came in, or the cards the operator asked for with Openers / Batters / Bowler / Player
  const asked = data && inning ? sceneIntro(scene, payload, { inning }) : null;
  const cards = asked || intro;
  const items = data && sb && inning && cards && !fullScreen ? introItems(cards, { sb, inning, data }) : [];
  const basicScene = !asked && scene !== "squads" && scene !== "none";

  return (
    <>
      <PremiumStyles />
      <AnimatePresence>{corner && bar.corner && sb && !fullScreen && !USES_TOP.includes(scene) && <PremiumCorner key="corner" data={data} sb={sb} />}</AnimatePresence>

      {/* every scene Premium does not restyle is drawn by the Basic theme */}
      <SceneLayer state={basicScene ? state : null} data={data} sb={sb} inning={inning} scorecard={scorecard} rankings={rankings} />

      <AnimatePresence>{data && sb && fullScreen && <PremiumSquad key={`squad-${payload.teamId || "both"}`} data={data} sb={sb} payload={payload} />}</AnimatePresence>

      <AnimatePresence mode="wait">{items.length > 0 && <PremiumIntro key={cards.key} items={items} data={data} />}</AnimatePresence>

      <AnimatePresence>{bar.visible && sb && inning && !fullScreen && <PremiumScoreBug key="bug" sb={sb} inning={inning} event={event} tournamentTag={tag} photoOf={photoOf} bar={bar} />}</AnimatePresence>

      <AnimatePresence>
        {stinger && bar.events && !fullScreen && (stinger.kind === "milestone" ? <PremiumMilestone key={stinger.key} event={stinger} photo={photoOf(stinger.playerId)} number={(person(stinger.playerId) || {}).number} /> : <PremiumStinger key={stinger.key} event={stinger} />)}
      </AnimatePresence>
    </>
  );
}
