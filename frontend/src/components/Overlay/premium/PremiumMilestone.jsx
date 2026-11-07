import { Photo, shades } from "../bc";
import { Live, easeOutCubic, easeOutExpo, lerp, seg, useClock } from "./clock";
import { EVENT, FONT, P, PARA, PLATE_BG, PLATE_EDGE, PmName, StatTile, caps, fitText, num } from "./pm";

// The milestone card: a fifty or a hundred. Unlike a four, a six or a wicket, this one is about the player (a personal
// achievement), so it is a proper card: the player's photo standing out of it, the milestone word, the name, and the
// figures of the innings so far (runs, balls, fours, sixes, strike rate). It stays up longer than a stinger.
//
//   0.00  the plate wipes open from the left
//   0.12  the photo slides in
//   0.25  the word rises into place from under a mask, a line draws under it
//   0.40  the name fades in; the figures follow one after another
//   5.00  the card fades out

export const MILESTONE_MS = 5500;
const T = MILESTONE_MS / 1000;
const EXIT = 5.0;

const W = 1240; // the plate
const H = 320;
const POP = 74; // how far the photo stands out above the plate
const PHOTO_W = 330;
const TOP = 330;

const leaving = (s) => easeOutCubic(seg(s, EXIT, T - 0.04));

/**
 * @param event   { kind: "milestone", title: "FIFTY" | "HUNDRED", name, detail, stats: { runs, balls, fours, sixes, strikeRate }, teamId } (detectEvent)
 * @param photo   the player's picture
 * @param number  his shirt number
 */
export default function PremiumMilestone({ event, photo, number }) {
  const k = EVENT.milestone;
  const word = String(event.title || "FIFTY").toUpperCase();
  const st = event.stats || {};
  const t = useClock(T);
  const size = word.length > 5 ? 74 : 92;
  const team = shades(event.teamId);

  const fade = (a, b, dx = 0, dy = 0) => (s) => {
    const e = easeOutExpo(seg(s, a, b));
    return { opacity: String(e), transform: `translate(${lerp(dx, 0, e)}px, ${lerp(dy, 0, e)}px)` };
  };
  const tiles = [
    ["RUNS", num(st.runs), 132],
    ["BALLS", num(st.balls), 132],
    ["FOURS", num(st.fours), 132],
    ["SIXES", num(st.sixes), 132],
    ["STRIKE RATE", num(st.strikeRate), 214],
  ];

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: FONT, color: "#fff" }}>
      <Live t={t} at={(s) => ({ opacity: String(1 - leaving(s)), transform: `translateY(${leaving(s) * -14}px)` })} style={{ position: "absolute", left: (1920 - W) / 2, top: TOP, width: W, height: H, filter: "drop-shadow(0 26px 40px rgba(0,0,0,.55))" }}>
        {/* the plate */}
        <Live t={t} at={(s) => ({ clipPath: `inset(0 ${(1 - easeOutExpo(seg(s, 0, 0.6))) * 100}% 0 0)` })} style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: PLATE_BG, boxShadow: PLATE_EDGE, clipPath: PARA(36), overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${k.color}, #fff6c8 50%, ${k.color})` }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: PHOTO_W + 40, background: `linear-gradient(100deg, ${team.base} 0%, ${team.dark} 100%)`, opacity: 0.85 }} />
          </div>
        </Live>

        {/* the photo, standing out of the plate */}
        <Live t={t} at={fade(0.12, 0.65, -50)} style={{ position: "absolute", left: 34, bottom: 0, width: PHOTO_W, height: H + POP, opacity: 0 }}>
          <Photo src={photo} name={event.name} teamId={event.teamId} w={PHOTO_W} h={H + POP} position="50% 8%" style={{ clipPath: "polygon(30px 0, 100% 0, calc(100% - 26px) 100%, 0 100%)" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(4,6,28,.7) 100%)" }} />
            {number != null && number !== "" && <span style={{ position: "absolute", right: 38, top: 12, ...caps, fontWeight: 800, fontSize: 56, color: "rgba(255,255,255,.92)", textShadow: "0 2px 14px rgba(0,0,0,.55)" }}>{number}</span>}
          </Photo>
        </Live>

        {/* the words and the figures */}
        <div style={{ position: "absolute", left: PHOTO_W + 84, right: 60, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
            <div style={{ overflow: "hidden", padding: "6px 24px 2px 0" }}>
              <Live
                t={t}
                at={(s) => ({ transform: `translateY(${lerp(105, 0, easeOutExpo(seg(s, 0.25, 0.75)))}%)` })}
                style={{ ...caps, fontWeight: 800, fontStyle: "italic", fontSize: size, lineHeight: 0.92, letterSpacing: 4, color: k.color, textShadow: `0 0 36px ${k.color}44`, transform: "translateY(105%)" }}
              >
                {word}
              </Live>
            </div>
            <Live t={t} at={fade(0.4, 0.8, 16)} style={{ ...caps, fontWeight: 600, fontSize: 28, letterSpacing: 5, color: P.soft, paddingBottom: 12, whiteSpace: "nowrap", opacity: 0 }}>
              {event.detail}
            </Live>
          </div>
          <Live t={t} at={(s) => ({ transform: `scaleX(${easeOutExpo(seg(s, 0.3, 0.85))})` })} style={{ height: 3, margin: "6px 0 14px", background: `linear-gradient(90deg, ${k.color}, rgba(255,255,255,.15))`, transformOrigin: "left center", transform: "scaleX(0)" }} />

          <Live t={t} at={fade(0.4, 0.85, 30)} style={{ opacity: 0 }}>
            <PmName name={event.name} size={fitText(event.name, 60, 14)} />
          </Live>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {tiles.map(([label, value, w], i) => (
              <Live key={label} t={t} at={fade(0.55 + i * 0.07, 0.95 + i * 0.07, 0, 18)} style={{ opacity: 0 }}>
                <StatTile k={label} v={value} w={w} size={46} accent={i === 4 ? P.gold : k.color} />
              </Live>
            ))}
          </div>
        </div>
      </Live>
    </div>
  );
}
