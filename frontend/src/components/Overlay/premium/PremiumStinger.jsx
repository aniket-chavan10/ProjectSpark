import { Live, easeOutCubic, easeOutExpo, lerp, seg, useClock } from "./clock";
import { EVENT, FONT, caps } from "./pm";

// The stinger: the word in the middle of the picture when a four, six, wicket or fifty happens.
// Restrained on purpose, the way a broadcast package is: one clean move in, a steady hold, one clean move out.
//
//   0.00  a soft shade comes up behind, so the word reads over any picture
//   0.00  two slanted lines in the event's colour draw out from the middle
//   0.12  the word rises into place from under a mask
//   2.05  everything fades out the way it came
//
// A four, a six and a wicket are the animation and nothing else: no batter, no bowler, no figures. That is what viewers
// are used to, and the who and how come afterwards (the new batter, the fall of wicket). A fifty or a hundred is not a
// stinger at all: it is about the player, so it has its own card (PremiumMilestone).

export const STINGER_MS = 2500;
const T = STINGER_MS / 1000;
const EXIT = 2.05;
const CY = 500; // the vertical centre of the stinger

/** 0 while on air, then 1 as the graphic leaves. */
const leaving = (s) => easeOutCubic(seg(s, EXIT, T - 0.05));

const WORD_SIZE = (word) => (word.length <= 4 ? 220 : word.length <= 5 ? 190 : word.length <= 6 ? 165 : 135);

/** A slanted line that draws out from the middle. */
function Line({ t, color, width, height, delay = 0, glow = true }) {
  return (
    <Live
      t={t}
      at={(s) => ({ transform: `skewX(-20deg) scaleX(${easeOutExpo(seg(s, delay, delay + 0.55)) * (1 - leaving(s))})` })}
      style={{ width, height, background: color, boxShadow: glow ? `0 0 22px ${color}66` : "none", transform: "skewX(-20deg) scaleX(0)" }}
    />
  );
}

/**
 * @param event  { kind: four | six | wicket ... } (detectEvent)
 */
export default function PremiumStinger({ event }) {
  const k = EVENT[event.kind] || EVENT.four;
  const word = String(k.word || event.title || "").toUpperCase();
  const size = WORD_SIZE(word);
  const t = useClock(T);

  // keep the whole stack centred on the picture
  const height = 5 + 12 + (size * 0.92 + 14) + 6 + 3;
  const top = CY - height / 2;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: FONT, color: "#fff" }}>
      {/* a soft shade behind, so the word reads over any picture */}
      <Live
        t={t}
        at={(s) => ({ opacity: String(easeOutCubic(seg(s, 0, 0.35)) * (1 - leaving(s))) })}
        style={{ position: "absolute", left: 0, right: 0, top: CY - 220, height: 440, background: "linear-gradient(180deg, rgba(4,6,28,0) 0%, rgba(4,6,28,.58) 28%, rgba(4,6,28,.58) 72%, rgba(4,6,28,0) 100%)", opacity: 0 }}
      />

      <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Line t={t} color={k.color} width={880} height={5} />

        {/* the word, rising from under a mask */}
        <div style={{ overflow: "hidden", padding: "10px 40px 4px", marginTop: 12 }}>
          <Live
            t={t}
            at={(s) => {
              const e = easeOutExpo(seg(s, 0.12, 0.62));
              return { transform: `translateY(${lerp(105, 0, e) + leaving(s) * -30}%)`, opacity: String(1 - leaving(s)) };
            }}
            style={{ ...caps, fontWeight: 800, fontStyle: "italic", fontSize: size, lineHeight: 0.92, letterSpacing: 4, color: "#fff", textShadow: `0 6px 26px rgba(0,0,0,.45), 0 0 46px ${k.color}55`, transform: "translateY(105%)" }}
          >
            {word}
          </Live>
        </div>

        <div style={{ marginTop: 6 }}>
          <Line t={t} color={k.color} width={640} height={3} delay={0.08} glow={false} />
        </div>

      </div>
    </div>
  );
}
