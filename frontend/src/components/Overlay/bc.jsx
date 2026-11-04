// Broadcast kit: the look and the motion every on-air graphic is built from.
// Everything is drawn on a fixed 1920 x 1080 canvas (see OverlayPage), so sizes are canvas pixels.
//
// The look is modelled on professional cricket coverage: dark glass plates, one team-colour accent per graphic,
// big condensed numerals, and player photos as the hero of every player graphic. No decoration for its own sake:
// nothing loops or shimmers except the LIVE dot.
// The motion is short and purposeful: plates wipe open from the left edge, then their content rises in one piece
// after another. Leaving is quicker than arriving.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fileUrl } from "../../api/sparkApi";
import { teamCode, teamColor } from "../Scoring/scoreUtils";

export const FONT = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', 'Segoe UI', sans-serif";
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN = [0.55, 0, 0.75, 0.2];

export const C = {
  bg: "#070b17",
  text: "#ffffff",
  soft: "#d3daf0",
  muted: "#8d98bd",
  line: "rgba(255,255,255,.12)",
  gold: "#ffc21a",
  brand: "#ff6a1a",
  live: "#e5253d",
  green: "#2fd27a",
  four: "#1d7bff",
  six: "#a23bff",
  wicket: "#e5253d",
  milestone: "#ffc21a",
};

export const caps = { fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1, fontVariantNumeric: "tabular-nums" };

/** The glass plate every graphic sits on. */
export const PLATE = "linear-gradient(180deg, #161f42 0%, #0b1127 100%)";
export const PLATE_SOFT = "linear-gradient(180deg, rgba(22,31,66,.94) 0%, rgba(11,17,39,.94) 100%)";
export const SHADOW = "0 22px 48px rgba(0,0,0,.55)";
export const EDGE = "inset 0 1px 0 rgba(255,255,255,.14)";

/** The two corners of a plate cut off, like the graphics on TV. */
export const CUT = (px = 18) => `polygon(0 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%)`;
export const CUT_TL = (px = 18) => `polygon(${px}px 0, 100% 0, 100% 100%, 0 100%, 0 ${px}px)`;
export const SLANT = (px = 22) => `polygon(0 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;

/* ---------------------------------- colours ---------------------------------- */

const rgb = (hex) => {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a, b, t) => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};

/** A team's colour in the shades a graphic needs. */
export const shades = (id) => {
  const base = teamColor(id);
  return { base, light: mix(base, "#ffffff", 0.22), dark: mix(base, "#000000", 0.4), deep: mix(base, "#000000", 0.7) };
};
export const teamBlock = (id) => {
  const s = shades(id);
  return `linear-gradient(100deg, ${s.base} 0%, ${s.dark} 100%)`;
};

/* ------------------------------- global styles ------------------------------- */

/** Mount once on the overlay page. Only the LIVE dot ever loops. */
export const BroadcastStyles = () => (
  <style>{`
    @keyframes bc-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.78); } }
    @keyframes bc-flash { 0% { opacity: .0; } 12% { opacity: .55; } 100% { opacity: 0; } }
  `}</style>
);

/* ------------------------------ motion variants ------------------------------ */

/** A parent that brings its children in one after another. */
export const stage = (delay = 0.12, step = 0.06) => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: step } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
});

export const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.16 } },
};

export const slide = (dx = -40) => ({
  hidden: { opacity: 0, x: dx },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, x: dx / 2, transition: { duration: 0.16 } },
});

export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

export const pop = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 24 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.12 } },
};

/** A plate that opens from one edge. */
export const wipe = (from = "left", delay = 0) => ({
  hidden: { clipPath: from === "left" ? "inset(0 100% 0 0)" : from === "right" ? "inset(0 0 0 100%)" : from === "top" ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)" },
  show: { clipPath: "inset(0 0% 0 0%)", transition: { duration: 0.6, ease: EASE, delay } },
  exit: { clipPath: from === "left" ? "inset(0 0 0 100%)" : from === "right" ? "inset(0 100% 0 0)" : from === "top" ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)", transition: { duration: 0.28, ease: EASE_IN } },
});

/** The root of an on-air graphic: holds its place until its children have left. */
export const holder = { hidden: { opacity: 1 }, show: { opacity: 1 }, exit: { opacity: 1, transition: { when: "afterChildren" } } };

/* -------------------------------- primitives -------------------------------- */

const initialsOf = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const Silhouette = ({ color = "rgba(255,255,255,.3)" }) => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
    <circle cx="50" cy="36" r="17" fill={color} />
    <path d="M10 100 C12 70 30 60 50 60 C70 60 88 70 90 100 Z" fill={color} />
  </svg>
);

/**
 * A player's photo. Rectangular (a portrait) unless `round`. With no photo it shows a silhouette on the team colour
 * (or the initials when it is too small for one), so a missing picture never leaves a hole in a graphic.
 */
export function Photo({ src, name, teamId, w = 64, h = w, round, radius = 0, ring, ringW = 3, position = "50% 12%", style, children }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  const url = bad ? null : fileUrl(src);
  const t = shades(teamId);
  const tiny = Math.min(w, h) < 72;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        minWidth: w,
        flex: "none",
        overflow: "hidden",
        borderRadius: round ? "50%" : radius,
        background: `linear-gradient(165deg, ${t.light} 0%, ${t.dark} 60%, ${t.deep} 100%)`,
        boxShadow: ring ? `0 0 0 ${ringW}px ${ring}` : undefined,
        ...style,
      }}
    >
      {url ? (
        <img src={url} alt="" onError={() => setBad(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position, display: "block" }} />
      ) : tiny ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 700, fontSize: Math.min(w, h) * 0.4, color: "rgba(255,255,255,.92)" }}>{initialsOf(name) || "?"}</div>
      ) : (
        <Silhouette />
      )}
      {children}
    </div>
  );
}

/** A team's logo in a white ring, or its code on its colour. */
export function Logo({ team, size = 64, plain }) {
  const [bad, setBad] = useState(false);
  const src = team && team.logo;
  useEffect(() => setBad(false), [src]);
  const url = bad ? null : fileUrl(src);
  const base = { width: size, height: size, minWidth: size, borderRadius: "50%", flex: "none" };
  return url ? (
    <img src={url} alt="" onError={() => setBad(true)} style={{ ...base, objectFit: "cover", background: "#fff", boxShadow: plain ? "none" : "0 0 0 3px rgba(255,255,255,.9), 0 6px 16px rgba(0,0,0,.35)" }} />
  ) : (
    <div style={{ ...base, background: teamBlock(team && team.id), display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 800, fontSize: size * 0.34, color: "#fff", boxShadow: plain ? "none" : "0 0 0 3px rgba(255,255,255,.9), 0 6px 16px rgba(0,0,0,.35)" }}>
      {teamCode(team && (team.name || team.team_name))}
    </div>
  );
}

const BALL = {
  dot: { bg: "transparent", fg: "#9aa5cb", ring: "inset 0 0 0 2px rgba(255,255,255,.3)" },
  run: { bg: "#ffffff", fg: "#0b1127" },
  four: { bg: C.four, fg: "#fff" },
  six: { bg: C.six, fg: "#fff" },
  wicket: { bg: C.wicket, fg: "#fff" },
  extra: { bg: C.gold, fg: "#2b1b00" },
};

/** One ball of an over. */
export function BallChip({ c, size = 34, variants = pop }) {
  const k = BALL[c.kind] || BALL.run;
  const long = c.text.length > 2;
  return (
    <motion.span variants={variants} style={{ minWidth: size, height: size, borderRadius: size / 2, padding: long ? `0 ${size * 0.26}px` : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: k.bg, color: k.fg, boxShadow: k.ring || "0 3px 8px rgba(0,0,0,.35)", ...caps, fontWeight: 800, fontSize: long ? size * 0.4 : size * 0.58, letterSpacing: 0, lineHeight: 1 }}>
      {c.text}
    </motion.span>
  );
}

/** "Rohit Sharma" as a small first name over a big surname, the way TV prints it. */
export function Name({ name, size = 40, align = "left", color = "#fff", single }) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "";
  const first = parts.length > 1 ? parts[0] : "";
  if (single) return <span style={{ ...caps, fontWeight: 700, fontSize: size, color, lineHeight: 1, whiteSpace: "nowrap" }}>{parts.join(" ")}</span>;
  return (
    <div style={{ textAlign: align, lineHeight: 1, minWidth: 0 }}>
      {first && <div style={{ ...caps, fontWeight: 500, fontSize: Math.round(size * 0.5), color: C.soft, letterSpacing: 2, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{first}</div>}
      <div style={{ ...caps, fontWeight: 700, fontSize: size, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</div>
    </div>
  );
}

/** "Ishaan Gupta" -> "I. Gupta": what a score bar can fit. */
export const short = (name) => {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  return w.length < 2 ? w[0] || "" : `${w[0][0]}. ${w.slice(1).join(" ")}`;
};

/** A font size that shrinks a long text so it still fits where a short one would have. */
export const fit = (text, base, chars = 14) => Math.round(base * Math.min(1, Math.max(0.6, chars / Math.max(String(text || "").length, 1))));

/** A small label in capitals. */
export const Label = ({ children, size = 18, color = C.muted, style }) => <span style={{ ...caps, fontWeight: 600, fontSize: size, color, letterSpacing: 2, ...style }}>{children}</span>;

/** A tag that sits on a plate ("PLAYING XI", "ON STRIKE"). */
export const Tag = ({ children, color = C.brand, style, fg = "#fff" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", background: color, color: fg, ...caps, fontWeight: 700, fontSize: 20, letterSpacing: 3, padding: "4px 14px 3px", ...style }}>{children}</span>
);

/** A number that rolls when it changes. */
export const Roll = ({ value, style }) => (
  <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom", ...style }}>
    <motion.span key={String(value)} initial={{ y: "-60%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} style={{ display: "inline-block" }}>
      {value}
    </motion.span>
  </span>
);

/** The thin team-colour rule down the edge of a plate. */
export const Rule = ({ id, side = "left", width = 6 }) => <div style={{ position: "absolute", top: 0, bottom: 0, [side]: 0, width, background: teamBlock(id) }} />;

/** What the photo lookup needs: every player the scoreboard knows, by id. */
export const photoLookup = (sb, data) => {
  const map = {};
  const add = (p) => p && p.playerId != null && p.profilePicture && (map[p.playerId] = p.profilePicture);
  if (sb) [sb.teams.team1, sb.teams.team2].forEach((t) => (t.players || []).forEach(add));
  if (data) Object.values(data.squads || {}).forEach((s) => [...(s.playing || []), ...(s.reserves || [])].forEach((p) => p.profile_picture && (map[p.player_id] = p.profile_picture)));
  return (id) => map[id] || null;
};

/** The team a player plays for, by id (from the two playing XIs). */
export const teamOfPlayer = (sb) => {
  const map = {};
  if (sb) [sb.teams.team1, sb.teams.team2].forEach((t) => (t.players || []).forEach((p) => (map[p.playerId] = t.id)));
  return (id) => map[id];
};
