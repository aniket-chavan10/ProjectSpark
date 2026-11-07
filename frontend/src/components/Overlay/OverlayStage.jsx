import { AnimatePresence } from "framer-motion";
import ScoreBug from "./ScoreBug";
import SceneLayer, { CornerBug, USES_TOP } from "./Scenes";
import { BroadcastStyles, photoLookup } from "./bc";
import PremiumBroadcastOverlay from "./premium/PremiumBroadcastOverlay";

/**
 * Everything drawn on the 1920 x 1080 picture, in the theme asked for:
 *   theme="basic"    the standard graphics (corner tag, scenes, score bar)
 *   theme="premium"  the TV-style package (see premium/PremiumBroadcastOverlay)
 * Both are given exactly the same match data, so switching the theme never changes what is shown, only how.
 * The overlay page and the test lab both draw their picture through this.
 */
export default function OverlayStage({ theme = "basic", sb, inning, data, state, event, intro, bar, tag, corner = true, scorecard, rankings }) {
  if (theme === "premium") {
    return <PremiumBroadcastOverlay sb={sb} inning={inning} data={data} state={state} event={event} intro={intro} bar={bar} tag={tag} corner={corner} scorecard={scorecard} rankings={rankings} />;
  }
  const scene = state ? state.scene : "none";
  const photoOf = photoLookup(sb, data);
  return (
    <>
      <BroadcastStyles />
      <AnimatePresence>{corner && bar.corner && sb && !USES_TOP.includes(scene) && <CornerBug key="corner" data={data} sb={sb} />}</AnimatePresence>
      <SceneLayer state={state} data={data} sb={sb} inning={inning} scorecard={scorecard} rankings={rankings} />
      <AnimatePresence>{bar.visible && sb && inning && <ScoreBug key="bug" sb={sb} inning={inning} event={event} tournamentTag={tag} photoOf={photoOf} bar={bar} />}</AnimatePresence>
    </>
  );
}
