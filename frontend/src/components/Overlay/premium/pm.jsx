// The Premium broadcast theme: the look and the motion of its graphics.
// Modelled on the on-air package of a global T20 tournament: deep navy plates, electric magenta and cyan, sharp
// angled edges and springy motion. Everything is drawn on the same fixed 1920 x 1080 canvas as the Basic theme.
//
// Nothing in here knows about the match: the Premium components take the same data the Basic ones do (the
// scoreboard `sb`, the overlay `data`, the detected `event`) and only decide how it looks.

import { FONT, caps } from "../bc";

export { FONT, caps };

export const P = {
  navy0: "#04061c",
  navy1: "#080d3a",
  navy2: "#111a66",
  indigo: "#2b1d96",
  magenta: "#ff2e93",
  pink: "#ff6fb6",
  cyan: "#18d6ff",
  violet: "#8a4dff",
  white: "#ffffff",
  soft: "#d3d9ff",
  muted: "#8f9ad8",
  gold: "#ffd23f",
  red: "#ff3b4e",
  green: "#2ee59d",
  line: "rgba(255,255,255,.16)",
};

/** The colour of each kind of event: boundary cyan, maximum magenta, wicket red, milestone gold. */
export const EVENT = {
  four: { color: P.cyan, deep: "#0a7fa8", word: "FOUR", sub: "Boundary", fg: "#02142a" },
  six: { color: P.magenta, deep: "#a3105f", word: "SIX", sub: "Maximum", fg: "#ffffff" },
  wicket: { color: P.red, deep: "#9a0f22", word: "WICKET", sub: "Dismissal", fg: "#ffffff" },
  milestone: { color: P.gold, deep: "#b8860b", word: "", sub: "Milestone", fg: "#2b1b00" },
};

/* ------------------------------------ shapes ------------------------------------ */

/** A parallelogram: both ends slanted the same way. */
export const PARA = (px = 24) => `polygon(${px}px 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;
/** Slanted on the right only. */
export const SLANT_R = (px = 24) => `polygon(0 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;
/** Slanted on the left only. */
export const SLANT_L = (px = 24) => `polygon(${px}px 0, 100% 0, 100% 100%, 0 100%)`;
/** A rectangle with its top-left and bottom-right corners cut. */
export const CORNERS = (px = 18) => `polygon(${px}px 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%, 0 ${px}px)`;

/* ------------------------------------ motion ------------------------------------ */

export const SPRING = { type: "spring", stiffness: 240, damping: 26, mass: 0.9 };
export const SNAP = { type: "spring", stiffness: 420, damping: 30 };
export const BOUNCE = { type: "spring", stiffness: 520, damping: 17 };
export const EASE_OUT = [0.16, 1, 0.3, 1];
export const EASE_IN = [0.6, 0, 0.8, 0.3];

/** A parent that brings its children in one after another. */
export const cascade = (delay = 0.1, step = 0.055) => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: step } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
});

export const slideIn = (dx = -50) => ({
  hidden: { opacity: 0, x: dx },
  show: { opacity: 1, x: 0, transition: SPRING },
  exit: { opacity: 0, x: dx / 3, transition: { duration: 0.14 } },
});

export const riseIn = (dy = 26) => ({
  hidden: { opacity: 0, y: dy },
  show: { opacity: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, y: dy / 3, transition: { duration: 0.14 } },
});

export const popIn = {
  hidden: { opacity: 0, scale: 0.55 },
  show: { opacity: 1, scale: 1, transition: BOUNCE },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.12 } },
};

/** The root of a graphic: holds its place until its children have left. */
export const keep = { hidden: { opacity: 1 }, show: { opacity: 1 }, exit: { opacity: 1, transition: { when: "afterChildren" } } };

/** A plate that opens from its middle to both ends. */
export const openFromMiddle = (delay = 0) => ({
  hidden: { clipPath: "inset(0 50% 0 50%)" },
  show: { clipPath: "inset(0 0% 0 0%)", transition: { duration: 0.65, ease: EASE_OUT, delay } },
  exit: { clipPath: "inset(0 50% 0 50%)", transition: { duration: 0.3, ease: EASE_IN } },
});

/** A plate that opens from one edge. */
export const openFrom = (side = "left", delay = 0) => {
  const closed = { left: "inset(0 100% 0 0)", right: "inset(0 0 0 100%)", top: "inset(0 0 100% 0)", bottom: "inset(100% 0 0 0)" }[side];
  const gone = { left: "inset(0 0 0 100%)", right: "inset(0 100% 0 0)", top: "inset(100% 0 0 0)", bottom: "inset(0 0 100% 0)" }[side];
  return {
    hidden: { clipPath: closed },
    show: { clipPath: "inset(0 0% 0 0%)", transition: { duration: 0.6, ease: EASE_OUT, delay } },
    exit: { clipPath: gone, transition: { duration: 0.26, ease: EASE_IN } },
  };
};

/* ---------------------------------- global styles ---------------------------------- */

/** Mount once with the Premium graphics. Loops only where a graphic must keep drawing the eye (the free hit alert, LIVE). */
export const PremiumStyles = () => (
  <style>{`
    @keyframes pm-live { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .3; transform: scale(.7); } }
    @keyframes pm-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,46,147,.0), 0 0 18px 2px rgba(255,46,147,.55); } 50% { box-shadow: 0 0 0 10px rgba(255,46,147,.0), 0 0 38px 10px rgba(255,46,147,.9); } }
    @keyframes pm-blink { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
    @keyframes pm-drift { from { background-position: 0 0; } to { background-position: 160px 0; } }
  `}</style>
);

/* ---------------------------------- small pieces ---------------------------------- */

/** The standard navy plate. */
export const PLATE_BG = `linear-gradient(180deg, ${P.navy2} 0%, ${P.navy1} 55%, ${P.navy0} 100%)`;
export const PLATE_EDGE = "inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(24,214,255,.35)";

/** The magenta > violet > cyan line that runs along the top of a plate. */
export const accentLine = (from = P.magenta, to = P.cyan) => `linear-gradient(90deg, ${from} 0%, ${P.violet} 55%, ${to} 100%)`;

/** A short label chip in capitals, slanted on the right. */
export const Chip = ({ children, color = P.magenta, fg = "#fff", size = 22, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(100deg, ${color} 0%, ${color} 70%, rgba(0,0,0,.25) 140%)`, color: fg, ...caps, fontWeight: 800, fontSize: size, letterSpacing: 3, padding: `4px ${size * 0.9}px 3px ${size * 0.7}px`, clipPath: SLANT_R(Math.round(size * 0.55)), whiteSpace: "nowrap", ...style }}>
    {children}
  </span>
);

/** A statistic: value over a small label. */
export const StatTile = ({ k, v, accent = P.cyan, w = 100, size = 44 }) => (
  <div style={{ width: w, flex: "none", padding: "8px 8px 7px", background: "linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.04) 100%)", borderTop: `3px solid ${accent}`, textAlign: "center" }}>
    <div style={{ ...caps, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: 0 }}>{v}</div>
    <div style={{ ...caps, fontWeight: 600, fontSize: 15, letterSpacing: 3, color: P.muted, marginTop: 4 }}>{k}</div>
  </div>
);

/** "Rohit Sharma" as a small first name over a big surname. */
export function PmName({ name, size = 54, align = "left", color = "#fff", first = true }) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "";
  const given = parts.length > 1 ? parts[0] : "";
  return (
    <div style={{ textAlign: align, lineHeight: 1, minWidth: 0 }}>
      {first && given && <div style={{ ...caps, fontWeight: 600, fontSize: Math.round(size * 0.42), color: P.soft, letterSpacing: 3, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{given}</div>}
      <div style={{ ...caps, fontWeight: 800, fontSize: size, color, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</div>
    </div>
  );
}

/** A font size that shrinks a long text so it still fits where a short one would have. */
export const fitText = (text, base, chars = 12) => Math.round(base * Math.min(1, Math.max(0.55, chars / Math.max(String(text || "").length, 1))));

/** A figure for a stat tile: a dash for "no figure", the number as given otherwise. */
export const num = (v, digits) => {
  if (v === null || v === undefined || v === "" || Number.isNaN(v)) return "-";
  if (digits !== undefined && Number.isFinite(Number(v))) return Number(v).toFixed(digits);
  return String(v);
};

/* ----------------------------------- role icons ----------------------------------- */

export const BatIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <g transform="rotate(45 12 12)">
      <rect x="10.4" y="0.5" width="3.2" height="7" rx="1.3" fill={color} opacity=".7" />
      <path d="M8.4 8h7.2v12.6a2.4 2.4 0 0 1-2.4 2.4h-2.4a2.4 2.4 0 0 1-2.4-2.4z" fill={color} />
    </g>
  </svg>
);

export const BallIcon = ({ size = 24, color = "currentColor", seam = P.navy1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M5.2 6.2c3.4 2.4 3.4 9.2 0 11.6M18.8 6.2c-3.4 2.4-3.4 9.2 0 11.6" stroke={seam} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ROUND = (bg, fg, children, size, title) => (
  <span title={title} style={{ width: size, height: size, borderRadius: size / 2, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "0 2px 8px rgba(0,0,0,.4)" }}>{children}</span>
);

const BAT_ROLES = ["Batter", "All-rounder", "Wicket-keeper"];
const BALL_ROLES = ["Bowler", "All-rounder"];

/** What badges a player gets: captain, wicket-keeper, and bat / ball for what they do (from their career role). */
export const roleOf = (person, career) => {
  const role = career && career.role;
  return {
    captain: !!person.captain,
    keeper: !!person.keeper || role === "Wicket-keeper",
    bat: BAT_ROLES.includes(role),
    ball: BALL_ROLES.includes(role),
    label: person.captain ? "Captain" : person.keeper || role === "Wicket-keeper" ? "Wicket-keeper" : role && role !== "Player" ? role : "",
  };
};

/** The row of C / WK / bat / ball badges. */
export function RoleBadges({ role, size = 30 }) {
  const f = Math.round(size * 0.52);
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {role.captain && ROUND(P.gold, "#2b1b00", <span style={{ ...caps, fontWeight: 800, fontSize: f, letterSpacing: 0, lineHeight: 1 }}>C</span>, size, "Captain")}
      {role.keeper && ROUND(P.cyan, "#02142a", <span style={{ ...caps, fontWeight: 800, fontSize: Math.round(f * 0.82), letterSpacing: 0, lineHeight: 1 }}>WK</span>, size, "Wicket-keeper")}
      {role.bat && ROUND("rgba(255,255,255,.92)", P.navy1, <BatIcon size={Math.round(size * 0.68)} />, size, "Batter")}
      {role.ball && ROUND(P.magenta, "#fff", <BallIcon size={Math.round(size * 0.62)} color="#fff" seam={P.magenta} />, size, "Bowler")}
    </span>
  );
}

/* --------------------------------- shared lookups --------------------------------- */

/** Everything the squads and the scoreboard know about a player, by id. */
export function personLookup(sb, data) {
  const map = {};
  if (sb) [sb.teams.team1, sb.teams.team2].forEach((t) => t && (t.players || []).forEach((p) => (map[p.playerId] = { id: p.playerId, name: p.name, photo: p.profilePicture, number: p.jerseyNumber, teamId: t.id, captain: p.isCaptain, keeper: p.isKeeper })));
  if (data)
    (data.teams || []).forEach((t) => {
      const sq = data.squads && data.squads[t.id];
      if (sq) [...(sq.playing || []), ...(sq.reserves || [])].forEach((p) => (map[p.player_id] = { id: p.player_id, name: p.players_name, photo: p.profile_picture, number: p.jersey_number, teamId: t.id, captain: p.is_captain, keeper: p.is_keeper }));
    });
  return (id) => map[id] || null;
}

/** A player's career figures (from the overlay data), or null when there are none yet. */
export const careerOf = (data, id) => (data && data.career && data.career[id]) || null;
