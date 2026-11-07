import { motion } from "framer-motion";
import { Logo, Photo, shades } from "../bc";
import { Chip, EASE_OUT, FONT, P, PARA, PLATE_BG, PLATE_EDGE, PmName, RoleBadges, SPRING, cascade, caps, careerOf, fitText, keep, roleOf, slideIn } from "./pm";

// The Playing XI as a full-screen broadcast graphic: a navy stage with slashes of magenta and cyan, the team on top,
// and every player as a photo tile (shirt number, C / WK / bat / ball badges, the name) that drops in one after another.
// Both teams show side by side; the operator can pick one team and get it large.

const tileIn = {
  hidden: { opacity: 0, y: 70, scale: 0.92 },
  show: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: 0.45 + i * 0.055 } }),
  exit: (i) => ({ opacity: 0, y: 24, transition: { duration: 0.2, delay: i * 0.012 } }),
};

/** The stage behind everything: the colours, and three slashes that wipe across. */
function Stage() {
  const slash = (top, h, color, from, delay) => (
    <motion.div
      variants={{ hidden: { x: from }, show: { x: 0, transition: { duration: 0.9, ease: EASE_OUT, delay } }, exit: { x: -from, transition: { duration: 0.35 } } }}
      style={{ position: "absolute", left: -200, top, width: 2400, height: h, skewX: -24, background: color }}
    />
  );
  return (
    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5 } }, exit: { opacity: 0, transition: { duration: 0.35, delay: 0.1 } } }} style={{ position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(1100px 700px at 12% -5%, rgba(255,46,147,.34), transparent 62%), radial-gradient(1000px 700px at 100% 105%, rgba(24,214,255,.26), transparent 62%), linear-gradient(160deg, #0d1456 0%, #050827 55%, #0b0634 100%)` }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.07, background: "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 46px)" }} />
      {slash(-60, 120, "linear-gradient(90deg, rgba(255,46,147,0), rgba(255,46,147,.55) 60%, rgba(255,46,147,.1))", -1800, 0)}
      {slash(980, 90, "linear-gradient(90deg, rgba(24,214,255,.1), rgba(24,214,255,.5) 40%, rgba(24,214,255,0))", 1800, 0.1)}
      {slash(-20, 12, `linear-gradient(90deg, transparent, ${P.cyan}, transparent)`, 1800, 0.2)}
    </motion.div>
  );
}

/** One player: photo with badges on it, name on a plate below. */
function Tile({ p, i, teamId, w, photoH, plateH, nameSize, badge, number }) {
  return (
    <motion.div custom={i} variants={tileIn} style={{ width: w, flex: "none", filter: "drop-shadow(0 16px 24px rgba(0,0,0,.55))" }}>
      <div style={{ position: "relative", background: PLATE_BG, boxShadow: PLATE_EDGE, clipPath: `polygon(${Math.round(w * 0.09)}px 0, 100% 0, 100% calc(100% - ${Math.round(w * 0.07)}px), calc(100% - ${Math.round(w * 0.07)}px) 100%, 0 100%, 0 ${Math.round(w * 0.09)}px)` }}>
        <Photo src={p.photo} name={p.name} teamId={teamId} w={w} h={photoH} position="50% 8%">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(4,6,28,.86) 100%)" }} />
          <span style={{ position: "absolute", right: 14, top: 6, ...caps, fontWeight: 800, fontSize: Math.round(w * 0.2), lineHeight: 1, color: "rgba(255,255,255,.92)", textShadow: "0 2px 14px rgba(0,0,0,.6)" }}>{number}</span>
          <span style={{ position: "absolute", left: 12, bottom: 10 }}>
            <RoleBadges role={badge} size={Math.round(w * 0.115) + 8} />
          </span>
        </Photo>
        <div style={{ height: plateH, padding: "0 14px 0 16px", display: "flex", alignItems: "center", borderTop: `3px solid ${shades(teamId).base}` }}>
          <PmName name={p.name} size={fitText(p.name.split(/\s+/).slice(-1)[0], nameSize, 9)} />
        </div>
      </div>
    </motion.div>
  );
}

function TeamHead({ team, tag, logo, name, sub }) {
  return (
    <motion.div variants={slideIn(-80)} style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0 }}>
      <Logo team={team} size={logo} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...caps, fontWeight: 800, fontSize: name, lineHeight: 0.95, letterSpacing: 2, whiteSpace: "nowrap", textShadow: `0 4px 0 ${shades(team.id).deep}` }}>{team.name}</div>
        <div style={{ ...caps, fontWeight: 600, fontSize: sub, letterSpacing: 5, color: P.cyan, marginTop: 8, whiteSpace: "nowrap" }}>{tag}</div>
      </div>
    </motion.div>
  );
}

const playersOf = (data, teamId) => {
  const sq = data.squads && data.squads[teamId];
  return ((sq && sq.playing) || []).map((p, i) => ({
    id: p.player_id,
    name: p.players_name || "",
    photo: p.profile_picture,
    number: p.jersey_number ?? i + 1,
    captain: p.is_captain,
    keeper: p.is_keeper,
  }));
};

const captainOf = (list) => (list.find((p) => p.captain) || {}).name;
const keeperOf = (list) => (list.find((p) => p.keeper) || {}).name;
const lastName = (name) => String(name || "").trim().split(/\s+/).slice(-1)[0];

/** @param payload { teamId? }  one team large, or both side by side */
export default function PremiumSquad({ data, sb, payload }) {
  const teams = payload && payload.teamId ? (data.teams || []).filter((t) => Number(t.id) === Number(payload.teamId)) : data.teams || [];
  const single = teams.length === 1;
  const tournament = data.tournament ? data.tournament.name : "";
  const match = sb && sb.matchNo ? `Match ${sb.matchNo}` : "";

  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={keep} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, fontFamily: FONT, color: "#fff" }}>
      <Stage />

      {/* the title row */}
      <motion.div variants={cascade(0.15, 0.08)} style={{ position: "absolute", left: 70, right: 70, top: 44, display: "flex", alignItems: "center", gap: 22 }}>
        <motion.div variants={slideIn(-60)}>
          <Chip color={P.magenta} size={30}>
            Playing XI
          </Chip>
        </motion.div>
        {tournament && (
          <motion.span variants={slideIn(-40)} style={{ ...caps, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: P.soft }}>
            {tournament}
          </motion.span>
        )}
        {match && (
          <motion.span variants={slideIn(40)} style={{ ...caps, fontWeight: 600, fontSize: 26, letterSpacing: 5, color: P.muted, marginLeft: "auto" }}>
            {match}
          </motion.span>
        )}
      </motion.div>

      {single ? <OneTeam team={teams[0]} data={data} /> : <TwoTeams teams={teams} data={data} />}
    </motion.div>
  );
}

function OneTeam({ team, data }) {
  const list = playersOf(data, team.id);
  const cap = captainOf(list);
  const wk = keeperOf(list);
  const sub = ["Playing XI", cap && `Captain ${lastName(cap)}`, wk && `Keeper ${lastName(wk)}`].filter(Boolean).join("   ·   ");
  return (
    <>
      <div style={{ position: "absolute", left: 70, right: 70, top: 120 }}>
        <TeamHead team={team} logo={118} name={104} sub={30} tag={sub} />
      </div>
      <motion.div variants={{ hidden: {}, show: {}, exit: {} }} style={{ position: "absolute", left: 70, right: 70, top: 300, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "26px 24px", justifyItems: "center" }}>
        {list.length === 0 && <div style={{ ...caps, gridColumn: "1 / -1", fontWeight: 600, fontSize: 34, letterSpacing: 4, color: P.muted }}>Squad not announced yet</div>}
        {list.map((p, i) => (
          <Tile key={p.id} p={p} i={i} teamId={team.id} w={270} photoH={248} plateH={90} nameSize={50} number={p.number} badge={roleOf(p, careerOf(data, p.id))} />
        ))}
      </motion.div>
    </>
  );
}

function TwoTeams({ teams, data }) {
  return (
    <>
      {teams.map((team, side) => {
        const list = playersOf(data, team.id);
        const cap = captainOf(list);
        const left = side === 0 ? 70 : 1000;
        return (
          <div key={team.id}>
            <div style={{ position: "absolute", left, width: 850, top: 124 }}>
              <TeamHead team={team} logo={84} name={64} sub={22} tag={cap ? `Captain ${lastName(cap)}` : "Playing XI"} />
            </div>
            <motion.div variants={{ hidden: {}, show: {}, exit: {} }} style={{ position: "absolute", left, width: 850, top: 240, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 12px", justifyItems: "center" }}>
              {list.length === 0 && <div style={{ ...caps, gridColumn: "1 / -1", fontWeight: 600, fontSize: 28, letterSpacing: 4, color: P.muted }}>Squad not announced yet</div>}
              {list.map((p, i) => (
                <Tile key={p.id} p={p} i={i + side * 3} teamId={team.id} w={202} photoH={166} plateH={72} nameSize={34} number={p.number} badge={roleOf(p, careerOf(data, p.id))} />
              ))}
            </motion.div>
          </div>
        );
      })}
      <motion.div variants={{ hidden: { opacity: 0, scale: 0.4 }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 20, delay: 0.6 } }, exit: { opacity: 0 } }} style={{ position: "absolute", left: 960 - 46, top: 128, width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${P.magenta}, ${P.violet})`, clipPath: PARA(14), ...caps, fontWeight: 800, fontSize: 44, letterSpacing: 2, boxShadow: PLATE_EDGE }}>
        v
      </motion.div>
    </>
  );
}
