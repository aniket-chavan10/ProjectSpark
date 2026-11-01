// Broadcast kit: the look and the motion every on-air graphic is built from.
// Everything is drawn on a fixed 1920 x 1080 canvas (see OverlayPage), so sizes are canvas pixels.
//
// The look: one deep navy, thin rules, the team colour used only for the team block and a hairline, one cool
// accent. Nothing glows and nothing is decorated. The motion: a graphic rises into place, then its content
// follows in a short, even stagger. Leaving is quicker than arriving.

import { motion } from "framer-motion";
import { fileUrl } from "../../api/sparkApi";
import { teamCode, teamColor } from "../Scoring/scoreUtils";

export const FONT = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', Impact, sans-serif";
export const EASE = [0.22, 1, 0.36, 1];

export const C = {
  ink: "#070c17",
  navy: "#0c1424",
  navy2: "#121c32",
  line: "rgba(255,255,255,.12)",
  muted: "#8a96ab",
  soft: "#c4cddd",
  text: "#f2f5fa",
  accent: "#9db3d6", // the one accent: a cool steel
  gold: "#cfb67f", // used sparingly: ranks, wickets taken
  green: "#7fbfa5",
  red: "#cf544f",
};

export const caps = { fontFamily: FONT, textTransform: "uppercase", letterSpacing: 1.5 };

export const GLASS = "linear-gradient(180deg, #111a2f 0%, #0a1120 100%)";
export const SLANT = (px = 18) => `polygon(0 0, 100% 0, calc(100% - ${px}px) 100%, 0 100%)`;
export const SHADOW = "0 18px 40px rgba(0,0,0,.5)";

/* ------------------------------- motion variants ------------------------------- */

/** A parent that brings its children in one after another. */
export const stagger = (step = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
});

/** A whole graphic: rises into place, its children then follow. */
export const graphic = (step = 0.05, delay = 0.22) => ({
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, staggerChildren: step, delayChildren: delay } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.22, ease: EASE } },
});

export const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

export const slideIn = (dx = -24) => ({
  hidden: { opacity: 0, x: dx },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, x: dx / 3, transition: { duration: 0.15 } },
});

export const pop = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** A line that draws from the left. */
export const draw = (delay = 0) => ({
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.6, ease: EASE, delay } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
});

/* --------------------------------- primitives --------------------------------- */

const initialsOf = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** A player's photo (or initials) in a thin ring. */
export const Photo = ({ src, name, size = 64, ring = "rgba(255,255,255,.35)", ringWidth = 2 }) => {
  const url = fileUrl(src);
  const base = { width: size, height: size, minWidth: size, borderRadius: size / 2, border: `${ringWidth}px solid ${ring}`, background: "#18233f", boxShadow: "0 4px 12px rgba(0,0,0,.4)" };
  return url ? (
    <img src={url} alt="" style={{ ...base, objectFit: "cover", objectPosition: "center top" }} />
  ) : (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 700, fontSize: size / 2.6, color: C.soft, letterSpacing: 1 }}>{initialsOf(name) || "?"}</div>
  );
};

/** A team's logo, or its code on its colour. */
export const Logo = ({ team, size = 64, ring = "rgba(255,255,255,.35)" }) => {
  const url = fileUrl(team && team.logo);
  const base = { width: size, height: size, minWidth: size, borderRadius: size / 2, border: `2px solid ${ring}`, boxShadow: "0 4px 12px rgba(0,0,0,.4)" };
  return url ? (
    <img src={url} alt="" style={{ ...base, objectFit: "cover", background: "#fff" }} />
  ) : (
    <div style={{ ...base, background: teamColor(team && team.id), display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 700, fontSize: size / 2.9, color: "#fff", letterSpacing: 1 }}>{teamCode(team && (team.name || team.team_name))}</div>
  );
};

/** The small label that sits on top of a bar ("MATCH 5", "TOSS"). */
export const Tag = ({ children, color = C.accent, style }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }, exit: { opacity: 0, transition: { duration: 0.12 } } }}
    style={{ display: "inline-block", ...caps, fontWeight: 700, fontSize: 21, letterSpacing: 3.5, color: C.soft, background: "#0b1322", padding: "6px 26px 5px 20px", borderTop: `3px solid ${color}`, clipPath: SLANT(14), ...style }}
  >
    {children}
  </motion.div>
);

/** A team name with its logo, underlined in the team colour. */
export const TeamSlab = ({ team, size = 44, height = 76, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 16, height, paddingRight: 44, borderBottom: `4px solid ${teamColor(team.id)}`, color: "#fff", ...style }}>
    <Logo team={team} size={size} />
    <span style={{ ...caps, fontWeight: 700, fontSize: size * 0.95, lineHeight: 1 }}>{team.name}</span>
  </div>
);

/** A number that rolls when it changes. */
export const Roll = ({ value, style }) => (
  <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom", ...style }}>
    <motion.span key={String(value)} initial={{ y: "-60%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} style={{ display: "inline-block" }}>
      {value}
    </motion.span>
  </span>
);

/** Text that arrives letter by letter. */
export const Letters = ({ text, size, color = "#fff", delay = 0.2, style }) => (
  <motion.span initial="hidden" animate="show" variants={stagger(0.025, delay)} style={{ display: "inline-flex", ...caps, fontWeight: 700, fontSize: size, color, lineHeight: 1, ...style }} aria-label={text}>
    {String(text)
      .split("")
      .map((ch, i) => (
        <motion.span key={i} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {ch}
        </motion.span>
      ))}
  </motion.span>
);

export const Divider = () => <div style={{ width: 1, alignSelf: "stretch", margin: "18px 0", background: "rgba(255,255,255,.14)" }} />;

export const Label = ({ children, style }) => <div style={{ ...caps, fontWeight: 600, fontSize: 18, letterSpacing: 3, color: C.muted, ...style }}>{children}</div>;

/** Kept so existing scenes compile: the light sweep was removed on purpose. */
export const Shine = () => null;
export const wipe = () => ({ hidden: {}, show: {}, exit: {} });

/** What the photo lookup needs: every player the scoreboard knows, by id. */
export const photoLookup = (sb, data) => {
  const map = {};
  const add = (p) => p && p.playerId != null && p.profilePicture && (map[p.playerId] = p.profilePicture);
  if (sb) [sb.teams.team1, sb.teams.team2].forEach((t) => (t.players || []).forEach(add));
  if (data) Object.values(data.squads || {}).forEach((s) => [...(s.playing || []), ...(s.reserves || [])].forEach((p) => p.profile_picture && (map[p.player_id] = p.profile_picture)));
  return (id) => map[id] || null;
};
