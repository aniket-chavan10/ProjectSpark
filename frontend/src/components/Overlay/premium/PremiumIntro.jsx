import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { currentInnings, sides } from "../../Scoring/scoreUtils";
import { Photo, shades } from "../bc";
import { BOUNCE, Chip, FONT, P, PARA, PLATE_BG, PLATE_EDGE, PmName, RoleBadges, SPRING, StatTile, accentLine, caps, careerOf, fitText, keep, num, personLookup, roleOf } from "./pm";
import { PM_TOP } from "./PremiumScoreBug";

// Player intro cards: when a new batter, the opening pair or a new bowler comes in, a lower-third slides in above the
// ribbon with the player's photo, role and what they have done before (matches, runs, average, strike rate for a batter;
// wickets, economy and best figures for a bowler). Cards for the same moment (the openers and the opening bowler) share one row.

export const INTRO_HOLD_MS = 7000;
const SETTLE_MS = 1500; // wait for the scorer to finish choosing before putting the cards on air

/* ------------------------------------- detecting ------------------------------------- */

/**
 * Who has just come in, from two scoreboards: { openers, batters: [ids], bowler: id | null }, or null.
 *  - before the first ball of an innings, the batters at the crease are the openers (and the bowler the opening bowler)
 *  - later, a batter who was not there before is a new batter
 *  - a bowler who has not bowled yet in this innings is a new bowler (a bowler coming back for another over is not announced)
 * Nothing is announced when the scoreboard goes backwards (an undo) or on the first scoreboard after the page opens.
 */
export function detectIntro(prev, next) {
  if (!prev || !next || next.status === "completed") return null;
  const a = currentInnings(prev);
  const b = currentInnings(next);
  if (!a || !b) return null;
  const same = a.inningId === b.inningId;
  if (same && b.lastBallId < a.lastBallId) return null; // undo
  const before = same ? a.currentBatsmen.map((x) => x.playerId) : [];
  const now = b.currentBatsmen.map((x) => x.playerId);
  const added = now.filter((id) => !before.includes(id));
  const atStart = (b.ballsBowled || 0) === 0;

  let batters = [];
  let openers = false;
  if (added.length && atStart) {
    openers = true;
    batters = now.slice(0, 2);
  } else if (added.length) {
    batters = added;
  }

  let bowler = null;
  const bowlerBefore = same && a.currentBowler ? a.currentBowler.playerId : null;
  if (b.currentBowler && b.currentBowler.playerId !== bowlerBefore) {
    const bowledBefore = Number.parseFloat(b.currentBowler.overs) > 0;
    if (!bowledBefore) bowler = b.currentBowler.playerId;
  }
  if (!batters.length && !bowler) return null;
  return { openers: openers || (atStart && !!bowler), batters, bowler };
}

const mergeIntro = (x, y) => (x ? { openers: x.openers || y.openers, batters: [...new Set([...x.batters, ...y.batters])].slice(0, 2), bowler: y.bowler || x.bowler } : y);

/**
 * Holds the intro that is on air. `feed(prev, next)` is called with every new scoreboard; `show(intro)` puts one on air
 * at once (the test lab); `clear()` takes it off. It goes by itself after INTRO_HOLD_MS.
 */
export function usePremiumIntro(holdMs = INTRO_HOLD_MS, settleMs = SETTLE_MS) {
  const [intro, setIntro] = useState(null);
  const pending = useRef(null);
  const settle = useRef(null);
  const hide = useRef(null);

  const clear = useCallback(() => {
    clearTimeout(settle.current);
    clearTimeout(hide.current);
    pending.current = null;
    setIntro(null);
  }, []);

  const show = useCallback(
    (found) => {
      clearTimeout(hide.current);
      setIntro({ ...found, key: `${found.batters.join("-")}|${found.bowler || ""}|${Date.now()}` });
      hide.current = setTimeout(() => setIntro(null), holdMs);
    },
    [holdMs]
  );

  const feed = useCallback(
    (prev, next) => {
      const found = detectIntro(prev, next);
      if (!found) return;
      pending.current = mergeIntro(pending.current, found);
      clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        const p = pending.current;
        pending.current = null;
        if (p) show(p);
      }, settleMs);
    },
    [show, settleMs]
  );

  useEffect(
    () => () => {
      clearTimeout(settle.current);
      clearTimeout(hide.current);
    },
    []
  );

  return { intro, feed, show, clear };
}

/* ------------------------------------ the cards ------------------------------------ */

/** The people to show for an intro (or for the operator's Openers / Bowler / Player scenes), with what to print on each card. */
export function introItems(intro, { sb, inning, data }) {
  if (!intro || !sb || !inning) return [];
  const who = personLookup(sb, data);
  const { batting, bowling } = sides(sb, inning);
  const items = [];
  const strikerId = (inning.currentBatsmen.find((b) => b.isOnStrike) || {}).playerId;
  intro.batters.forEach((id) => {
    const p = who(id) || (inning.currentBatsmen.find((x) => x.playerId === id) && { id, name: inning.currentBatsmen.find((x) => x.playerId === id).name, photo: inning.currentBatsmen.find((x) => x.playerId === id).profilePicture, teamId: batting.id });
    if (!p) return;
    items.push({ id, kind: "batter", person: p, teamId: batting.id, label: intro.openers ? (Number(id) === Number(strikerId) ? "Opener · on strike" : "Opener") : "New batter" });
  });
  if (intro.bowler) {
    const cur = inning.currentBowler && Number(inning.currentBowler.playerId) === Number(intro.bowler) ? inning.currentBowler : null;
    const p = who(intro.bowler) || (cur && { id: cur.playerId, name: cur.name, photo: cur.profilePicture, teamId: bowling.id });
    if (p) items.push({ id: intro.bowler, kind: "bowler", person: p, teamId: bowling.id, label: intro.openers ? "Opening bowler" : "New bowler" });
  }
  return items;
}

/** What the operator's Openers / Batters / Bowler / Player scenes show in the Premium theme: the same cards. */
export function sceneIntro(scene, payload, { inning }) {
  if (!inning) return null;
  const bats = inning.currentBatsmen.map((b) => b.playerId);
  const striker = (inning.currentBatsmen.find((b) => b.isOnStrike) || {}).playerId;
  const non = (inning.currentBatsmen.find((b) => !b.isOnStrike) || {}).playerId;
  const bowler = inning.currentBowler ? inning.currentBowler.playerId : null;
  if (scene === "openers") return { key: "scene-openers", openers: true, batters: bats.slice(0, 2), bowler };
  if (scene === "batters") {
    const which = (payload && payload.which) || "both";
    return { key: `scene-batters-${which}`, openers: false, batters: which === "striker" ? [striker].filter(Boolean) : which === "nonStriker" ? [non].filter(Boolean) : bats, bowler: null, plain: true };
  }
  if (scene === "bowler") return { key: "scene-bowler", openers: false, batters: [], bowler, plain: true };
  if (scene === "player") {
    const id = payload && (payload.playerId || (payload.role === "striker" ? striker : payload.role === "nonStriker" ? non : payload.role === "bowler" ? bowler : null));
    if (!id) return null;
    const isBowler = payload.role === "bowler" || (!payload.role && bowler && Number(bowler) === Number(id));
    return { key: `scene-player-${id}`, openers: false, batters: isBowler ? [] : [id], bowler: isBowler ? id : null, plain: true };
  }
  return null;
}

function IntroCard({ item, data, w, index }) {
  const { person, teamId, kind } = item;
  const career = careerOf(data, item.id);
  const role = roleOf(person, career);
  const t = shades(teamId);
  const stats =
    kind === "bowler"
      ? [
          ["WKTS", num(career && career.wickets)],
          ["ECON", num(career && career.economy, 2)],
          ["BEST", num(career && career.best)],
        ]
      : [
          ["MAT", num(career && career.matches)],
          ["RUNS", num(career && career.runs)],
          ["AVG", num(career && career.average, 1)],
          ["SR", num(career && career.strikeRate, 1)],
        ];
  const tile = Math.floor((w - 232 - 26 - (stats.length - 1) * 8) / stats.length);
  const sub = role.label || (career ? "" : "Debut");
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 90, scale: 0.94 },
        show: { opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: index * 0.1 } },
        exit: { opacity: 0, y: 40, transition: { duration: 0.22 } },
      }}
      style={{ position: "relative", width: w, height: 190, flex: "none", filter: "drop-shadow(0 22px 34px rgba(0,0,0,.6))" }}
    >
      {/* the label, standing on the card */}
      <div style={{ position: "absolute", left: 250, bottom: "100%", marginBottom: -2, zIndex: 3 }}>
        <Chip color={kind === "bowler" ? P.cyan : P.magenta} fg={kind === "bowler" ? "#02142a" : "#fff"} size={22}>
          {item.label}
        </Chip>
      </div>

      {/* the plate */}
      <div style={{ position: "absolute", inset: 0, background: PLATE_BG, boxShadow: PLATE_EDGE, clipPath: PARA(26), overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accentLine() }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 232, background: `linear-gradient(100deg, ${t.base} 0%, ${t.dark} 100%)`, opacity: 0.85 }} />
      </div>

      {/* the photo stands out of the plate, taller than it */}
      <motion.div
        variants={{ hidden: { opacity: 0, scale: 0.8, y: 30 }, show: { opacity: 1, scale: 1, y: 0, transition: { ...BOUNCE, delay: 0.15 + index * 0.1 } }, exit: { opacity: 0, transition: { duration: 0.12 } } }}
        style={{ position: "absolute", left: 22, bottom: 0, width: 214, height: 262, transformOrigin: "50% 100%", zIndex: 2 }}
      >
        <Photo src={person.photo} name={person.name} teamId={teamId} w={214} h={262} position="50% 8%" style={{ clipPath: "polygon(24px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(4,6,28,.78) 100%)" }} />
          {person.number != null && person.number !== "" && <span style={{ position: "absolute", right: 30, top: 10, ...caps, fontWeight: 800, fontSize: 46, color: "rgba(255,255,255,.92)", textShadow: "0 2px 12px rgba(0,0,0,.55)" }}>{person.number}</span>}
        </Photo>
      </motion.div>

      {/* the words */}
      <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.25 + index * 0.1 } }, exit: { opacity: 0, transition: { duration: 0.14 } } }} style={{ position: "absolute", left: 250, right: 28, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        <motion.div variants={{ hidden: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0, transition: SPRING }, exit: { opacity: 0 } }} style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
          <PmName name={person.name} size={fitText(person.name, 50, 12)} />
          <RoleBadges role={role} size={30} />
        </motion.div>
        {sub && <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } }} style={{ ...caps, fontWeight: 600, fontSize: 18, letterSpacing: 3, color: P.cyan, marginTop: -4 }}>{sub}</motion.div>}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: SPRING }, exit: { opacity: 0 } }} style={{ display: "flex", gap: 8 }}>
          {stats.map(([k, v], i) => (
            <StatTile key={k} k={k} v={v} w={tile} size={36} accent={i === 0 ? P.magenta : P.cyan} />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** A row of intro cards standing above the ribbon. */
export default function PremiumIntro({ items, data }) {
  if (!items.length) return null;
  const gap = 26;
  const w = Math.min(640, Math.floor((1800 - gap * (items.length - 1)) / items.length));
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={keep} style={{ position: "absolute", left: 60, bottom: PM_TOP + 6, display: "flex", alignItems: "flex-end", gap, fontFamily: FONT, color: "#fff" }}>
      {items.map((item, i) => (
        <IntroCard key={`${item.kind}-${item.id}`} item={item} data={data} w={w} index={i} />
      ))}
    </motion.div>
  );
}
