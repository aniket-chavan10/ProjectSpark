// Broadcast kit: the look and the motion every on-air graphic is built from.
// Everything is drawn on a fixed 1920 x 1080 canvas (see OverlayPage), so sizes are canvas pixels.
//
// The look: deep navy-violet plates, a hot spark-orange accent, team colours on slanted slabs, running diagonal
// lines inside the colour slabs, and a light that sweeps across a graphic now and then.
// The motion: a graphic is built from layers. Coloured slabs wipe in first, one after another and each from a
// little further away (parallax), then the plate, then the content arrives in a staggered cascade.
// Leaving runs the other way and is quicker than arriving.

import { motion } from "framer-motion";
import { fileUrl } from "../../api/sparkApi";
import { teamCode, teamColor } from "../Scoring/scoreUtils";

export const FONT = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', Impact, sans-serif";
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN = [0.55, 0, 0.75, 0.2];

export const C = {
  ink: "#05071c",
  navy: "#0c1040",
  navy2: "#171d5c",
  violet: "#2b1f7d",
  line: "rgba(255,255,255,.14)",
  muted: "#98a0d2",
  soft: "#d6daf7",
  text: "#ffffff",
  accent: "#ff6a1a", // spark orange
  gold: "#ffb21a",
  volt: "#22cdef",
  green: "#22c55e",
  red: "#ef3b3b",
  four: "#1f8fff",
  six: "#c026d3",
};

export const caps = { fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1.5 };

export const SPARK = "linear-gradient(110deg, #ff4d0a 0%, #ff7a1a 50%, #ffb21a 100%)";
export const GLASS = "linear-gradient(180deg, #161c5a 0%, #0c1040 55%, #070a26 100%)";
export const PLATE = "linear-gradient(100deg, #0b0f38 0%, #141a52 60%, #1d1666 100%)";
export const SLANT = (px = 18) => `polygon(0 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;
export const SLANT_L = (px = 18) => `polygon(${px}px 0, 100% 0, 100% 100%, 0 100%)`;
export const PARA = (px = 18) => `polygon(${px}px 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;
export const SHADOW = "0 24px 50px rgba(0,0,0,.55)";
export const teamGrad = (id, angle = 110) => `linear-gradient(${angle}deg, ${teamColor(id)} 0%, ${teamColor(id)}e6 55%, ${teamColor(id)}99 100%)`;

/* ------------------------------- global keyframes ------------------------------- */

/** Mount once on the overlay page: the CSS animations the plates use while on air. */
export const BroadcastStyles = () => (
  <style>{`
    @keyframes bc-stripes { from { background-position: 0 0; } to { background-position: 84px 0; } }
    @keyframes bc-stripes-rev { from { background-position: 84px 0; } to { background-position: 0 0; } }
    @keyframes bc-sweep { 0% { transform: translateX(-140%) skewX(-22deg); } 22%, 100% { transform: translateX(560%) skewX(-22deg); } }
    @keyframes bc-drift { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-28px); } }
    @keyframes bc-drift2 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(18px); } }
    @keyframes bc-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }
    @keyframes bc-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,106,26,.0); } 50% { box-shadow: 0 0 28px 4px rgba(255,106,26,.55); } }
    @keyframes bc-spin { from { transform: rotateY(0deg); } to { transform: rotateY(1440deg); } }
  `}</style>
);

/* ------------------------------- motion variants ------------------------------- */

/** A parent that brings its children in one after another. */
export const stagger = (step = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
  exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
});

/** A whole graphic: holds its place while the layers wipe in, then lets the children follow. */
export const graphic = (step = 0.05, delay = 0.32) => ({
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: step, delayChildren: delay } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: EASE_IN, staggerChildren: 0.015, staggerDirection: -1 } },
});

export const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.16 } },
};

export const drop = {
  hidden: { opacity: 0, y: -22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.16 } },
};

export const slideIn = (dx = -34) => ({
  hidden: { opacity: 0, x: dx },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
  exit: { opacity: 0, x: dx / 3, transition: { duration: 0.16 } },
});

export const pop = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 22 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.12 } },
};

/** A line that draws from the left. */
export const draw = (delay = 0, origin = "left") => ({
  hidden: { scaleX: 0, originX: origin === "left" ? 0 : 1 },
  show: { scaleX: 1, originX: origin === "left" ? 0 : 1, transition: { duration: 0.7, ease: EASE, delay } },
  exit: { scaleX: 0, transition: { duration: 0.2 } },
});

const CLIP = {
  left: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 100%)"],
  right: ["inset(0% 0% 0% 100%)", "inset(0% 100% 0% 0%)"],
  bottom: ["inset(100% 0% 0% 0%)", "inset(0% 0% 100% 0%)"],
  top: ["inset(0% 0% 100% 0%)", "inset(100% 0% 0% 0%)"],
};
const OFFSET = { left: ["x", -1], right: ["x", 1], bottom: ["y", 1], top: ["y", -1] };

/** A slab that wipes open from one side, travelling `travel` px as it does (deeper layers travel further: parallax). */
export const wipe = (from = "left", delay = 0, travel = 60, out = 0.05) => {
  const [hidden, gone] = CLIP[from] || CLIP.left;
  const [axis, sign] = OFFSET[from] || OFFSET.left;
  return {
    hidden: { clipPath: hidden, [axis]: sign * travel },
    show: { clipPath: "inset(0% 0% 0% 0%)", [axis]: 0, transition: { duration: 0.65, ease: EASE, delay } },
    exit: { clipPath: gone, [axis]: -sign * travel * 0.4, transition: { duration: 0.32, ease: EASE_IN, delay: out } },
  };
};

/* --------------------------------- decoration --------------------------------- */

/** Diagonal lines that keep running: put over a colour. */
export const RunningLines = ({ opacity = 0.22, speed = 1.4, gap = 14, width = 3, reverse, style }) => (
  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `repeating-linear-gradient(115deg, rgba(255,255,255,${opacity}) 0 ${width}px, transparent ${width}px ${gap}px)`,
      backgroundSize: "84px 100%",
      animation: `${reverse ? "bc-stripes-rev" : "bc-stripes"} ${speed}s linear infinite`,
      pointerEvents: "none",
      ...style,
    }}
  />
);

/** A light that crosses the plate every few seconds. */
export const Sweep = ({ every = 7, delay = 0.9, opacity = 0.22 }) => (
  <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: 0, width: "18%", background: `linear-gradient(90deg, transparent, rgba(255,255,255,${opacity}), transparent)`, animation: `bc-sweep ${every}s cubic-bezier(.4,0,.2,1) ${delay}s infinite` }} />
  </div>
);

/**
 * The coloured slabs behind a plate: they wipe in one after another from the same side, the deeper ones travel
 * further and keep drifting slowly once on air (parallax). `colors` from the back to the front.
 */
export const Backdrop = ({ from = "left", colors = [SPARK], offset = 14, lines = true, clip }) => (
  <>
    {colors.map((bg, i) => {
      const depth = colors.length - 1 - i; // 0 is the front plate, higher numbers sit further back
      const sx = from === "right" ? 1 : from === "left" ? -1 : 0.6;
      const sy = from === "top" ? -1 : from === "bottom" ? 1 : 0.45;
      return (
        <motion.div
          key={i}
          aria-hidden="true"
          variants={wipe(from, i * 0.09, 50 + depth * 60, 0.14 + 0.08 * depth)}
          style={{ position: "absolute", inset: 0, translate: `${sx * depth * offset}px ${sy * depth * offset}px` }}
        >
          <div style={{ position: "absolute", inset: 0, background: bg, clipPath: clip, overflow: "hidden" }}>
            {lines && depth > 0 && <RunningLines opacity={0.2} speed={1.2 + depth * 0.4} />}
          </div>
        </motion.div>
      );
    })}
  </>
);

/* --------------------------------- primitives --------------------------------- */

const initialsOf = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** A player's photo (or initials) in a ring. */
export const Photo = ({ src, name, size = 64, ring = "rgba(255,255,255,.55)", ringWidth = 3, square }) => {
  const url = fileUrl(src);
  const base = { width: size, height: size, minWidth: size, borderRadius: square ? 12 : size / 2, border: `${ringWidth}px solid ${ring}`, background: "linear-gradient(160deg, #2a3280, #12164a)", boxShadow: "0 8px 22px rgba(0,0,0,.45)" };
  return url ? (
    <img src={url} alt="" style={{ ...base, objectFit: "cover", objectPosition: "center top" }} />
  ) : (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 800, fontSize: size / 2.5, color: "#fff", letterSpacing: 1 }}>{initialsOf(name) || "?"}</div>
  );
};

/** A team's logo, or its code on its colour. */
export const Logo = ({ team, size = 64, ring = "rgba(255,255,255,.55)" }) => {
  const url = fileUrl(team && team.logo);
  const base = { width: size, height: size, minWidth: size, borderRadius: size / 2, border: `3px solid ${ring}`, boxShadow: "0 8px 22px rgba(0,0,0,.45)" };
  return url ? (
    <img src={url} alt="" style={{ ...base, objectFit: "cover", background: "#fff" }} />
  ) : (
    <div style={{ ...base, background: teamGrad(team && team.id, 160), display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 800, fontSize: size / 2.8, color: "#fff", letterSpacing: 1 }}>{teamCode(team && (team.name || team.team_name))}</div>
  );
};

/** The label that sits on top of a plate ("MATCH 5", "TOSS"): a spark chip with running lines. */
export const Tag = ({ children, color, style }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, x: -30, clipPath: "inset(0% 100% 0% 0%)" }, show: { opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.5, ease: EASE } }, exit: { opacity: 0, transition: { duration: 0.12 } } }}
    style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 12, overflow: "hidden", ...caps, fontWeight: 800, fontSize: 22, letterSpacing: 4, color: "#fff", background: color || SPARK, padding: "6px 34px 5px 22px", clipPath: SLANT(16), ...style }}
  >
    <RunningLines opacity={0.16} speed={2} />
    <span style={{ position: "relative" }}>{children}</span>
  </motion.div>
);

/** A team name with its logo on a slab of the team colour. */
export const TeamSlab = ({ team, size = 44, height = 76, style, align = "left" }) => (
  <div style={{ position: "relative", display: "inline-flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: 18, height, padding: align === "right" ? "0 18px 0 46px" : "0 46px 0 18px", background: teamGrad(team.id), clipPath: align === "right" ? SLANT_L(22) : SLANT(22), color: "#fff", overflow: "hidden", ...style }}>
    <RunningLines opacity={0.16} />
    <div style={{ position: "relative" }}>
      <Logo team={team} size={size} />
    </div>
    <span style={{ position: "relative", ...caps, fontWeight: 800, fontSize: size * 0.92, lineHeight: 1, textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>{team.name}</span>
  </div>
);

/** A number that rolls when it changes. */
export const Roll = ({ value, style }) => (
  <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom", ...style }}>
    <motion.span key={String(value)} initial={{ y: "-70%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} style={{ display: "inline-block" }}>
      {value}
    </motion.span>
  </span>
);

/** "Ishaan Gupta" -> "I. Gupta" (a lone word stays as it is): what a score bar can fit. */
export const short = (name) => {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  return w.length < 2 ? w[0] || "" : `${w[0][0]}. ${w.slice(1).join(" ")}`;
};

/** A font size that shrinks a long text so it still fits where a short one would have. */
export const fit = (text, base, chars = 14) => Math.round(base * Math.min(1, Math.max(0.68, chars / Math.max(String(text || "").length, 1))));

/** Text that arrives letter by letter. Words stay whole, so a long line wraps between words, never inside one. */
export const Letters = ({ text, size, color = "#fff", delay = 0.2, step = 0.03, style }) => {
  let n = 0;
  return (
    <motion.span initial="hidden" animate="show" variants={stagger(step, delay)} style={{ display: "inline-flex", flexWrap: "wrap", columnGap: "0.26em", ...caps, fontWeight: 800, fontSize: size, color, lineHeight: 1.04, ...style }} aria-label={text}>
      {String(text)
        .split(/\s+/)
        .filter(Boolean)
        .map((word, w) => (
          <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
            {word.split("").map((ch) => (
              <motion.span key={n++} variants={{ hidden: { opacity: 0, y: 30, scale: 1.4 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } } }} style={{ display: "inline-block" }}>
                {ch}
              </motion.span>
            ))}
          </span>
        ))}
    </motion.span>
  );
};

export const Divider = ({ color = "rgba(255,255,255,.16)" }) => <div style={{ width: 2, alignSelf: "stretch", margin: "18px 0", background: color, transform: "skewX(-18deg)" }} />;

export const Label = ({ children, style }) => <div style={{ ...caps, fontWeight: 700, fontSize: 18, letterSpacing: 3, color: C.muted, ...style }}>{children}</div>;

/** Kept for older imports. */
export const Shine = Sweep;

/** The root of every on-air graphic: holds on until its layers have left. */
export const holder = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
  exit: { opacity: 1, transition: { when: "afterChildren" } },
};

/** What the photo lookup needs: every player the scoreboard knows, by id. */
export const photoLookup = (sb, data) => {
  const map = {};
  const add = (p) => p && p.playerId != null && p.profilePicture && (map[p.playerId] = p.profilePicture);
  if (sb) [sb.teams.team1, sb.teams.team2].forEach((t) => (t.players || []).forEach(add));
  if (data) Object.values(data.squads || {}).forEach((s) => [...(s.playing || []), ...(s.reserves || [])].forEach((p) => p.profile_picture && (map[p.player_id] = p.profile_picture)));
  return (id) => map[id] || null;
};
