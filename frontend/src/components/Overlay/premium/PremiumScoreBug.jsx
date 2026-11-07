import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode } from "../../Scoring/scoreUtils";
import { BallChip, Logo, Photo, Roll, shades, short } from "../bc";
import ScoreBug from "../ScoreBug";
import { Live, easeOutCubic, easeOutExpo, lerp, seg, useClock } from "./clock";
import { BOUNCE, EASE_OUT, EVENT, FONT, P, PARA, PLATE_BG, PLATE_EDGE, SLANT_L, SLANT_R, accentLine, cascade, caps, keep, openFromMiddle, popIn, slideIn } from "./pm";

// The Premium score bug: a broadcast ribbon docked along the bottom of the picture.
//
//   [ team | score and overs | striker / non-striker | bowler and this over | target or run rate ]
//
// A four, six, wicket or fifty plays inside the ribbon itself: a bright sweep crosses it and the batters / bowler /
// target blocks morph into the event (a coloured blade with the word, the player's photo, the name and the figures).
// The team and the score stay where they are, so the viewer watches the score change while it plays, then the ribbon
// settles back by itself. A free hit shows as a pulsing alert badge attached to the top edge of the ribbon.

export const PM_LEFT = 60;
export const PM_BOTTOM = 44;
export const PM_H = 120;
/** The lowest a card or panel may reach without covering the ribbon. */
export const PM_TOP = PM_BOTTOM + PM_H + 26;

const SLANT_PX = 28;

/* ------------------------------------ the frame ------------------------------------ */

/**
 * One soft band of light that crosses the ribbon as an event begins. It runs on its own clock, so it follows the
 * lab's slow motion and scrubbing.
 */
function Sweep({ color }) {
  const t = useClock(1.2);
  return (
    <Live
      t={t}
      at={(s) => ({ transform: `translateX(${lerp(-640, 2000, easeOutCubic(seg(s, 0, 1)))}px) skewX(-24deg)`, opacity: String(1 - seg(s, 0.8, 1.2)) })}
      style={{ position: "absolute", top: -30, bottom: -30, left: 0, width: 360, mixBlendMode: "screen", pointerEvents: "none", zIndex: 20, background: `linear-gradient(90deg, transparent 0%, ${color}00 10%, ${color}44 45%, rgba(255,255,255,.5) 50%, ${color}44 55%, ${color}00 90%, transparent 100%)` }}
    />
  );
}

/** The alert that sits on the top edge of the ribbon while the next ball is a free hit. */
function FreeHitBadge() {
  return (
    <motion.div initial={{ opacity: 0, y: 26, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, transition: { duration: 0.15 } }} transition={BOUNCE} style={{ marginRight: 56, marginBottom: -2 }}>
      <motion.div animate={{ filter: ["drop-shadow(0 0 4px rgba(255,46,147,.55))", "drop-shadow(0 0 26px rgba(255,46,147,1))", "drop-shadow(0 0 4px rgba(255,46,147,.55))"] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, height: 50, padding: "0 40px 0 30px", background: `linear-gradient(100deg, ${P.magenta} 0%, #c4136f 100%)`, clipPath: PARA(18), color: "#fff", ...caps, fontWeight: 800, fontSize: 32, letterSpacing: 6, borderBottom: `4px solid ${P.cyan}` }}>
          <motion.svg width="22" height="30" viewBox="0 0 22 30" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 0.8, repeat: Infinity }} aria-hidden="true">
            <path d="M13 0 2 17h8l-3 13 13-19h-8z" fill={P.gold} />
          </motion.svg>
          Free hit
        </div>
      </motion.div>
    </motion.div>
  );
}

/** The ribbon itself: the frame, the plate, and whatever is in it. */
function Ribbon({ accent, tag, freeHit, event, modeKey, children }) {
  const hot = event ? (EVENT[event.kind] || EVENT.four).color : null;
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={keep} style={{ position: "absolute", left: PM_LEFT, bottom: PM_BOTTOM, width: "max-content", fontFamily: FONT, color: "#fff" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none" }}>
        <div style={{ marginBottom: 8 }}>
          {tag && (
            <motion.span variants={slideIn(-40)} style={{ display: "inline-block", background: "rgba(4,6,28,.9)", color: P.soft, ...caps, fontWeight: 700, fontSize: 20, letterSpacing: 4, padding: "5px 18px 4px", borderLeft: `4px solid ${accent ? shades(accent).base : P.magenta}` }}>
              {tag}
            </motion.span>
          )}
        </div>
        <AnimatePresence>{freeHit && <FreeHitBadge key="free-hit" />}</AnimatePresence>
      </div>

      <motion.div variants={openFromMiddle()} style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,.6))" }}>
        <div style={{ position: "relative", display: "flex", height: PM_H, background: PLATE_BG, boxShadow: PLATE_EDGE, clipPath: PARA(SLANT_PX), overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accentLine(), zIndex: 6 }} />
          <AnimatePresence>
            {hot && <motion.div key={event.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${hot}, #fff 50%, ${hot})`, zIndex: 7 }} />}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div key={modeKey} initial="hidden" animate="show" exit="exit" variants={cascade(0.28, 0.07)} style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
              {children}
            </motion.div>
          </AnimatePresence>
          {event && <Sweep key={event.key} color={hot} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A block of the ribbon that opens and closes by itself when the operator switches it. */
function Seg({ show, w, children, noLine }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="seg" initial={{ width: 0, opacity: 0 }} animate={{ width: w, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.42, ease: EASE_OUT }} style={{ overflow: "hidden", flex: "none", display: "flex", alignItems: "stretch" }}>
          <div style={{ width: w, flex: "none", display: "flex", alignItems: "stretch", borderLeft: noLine ? "none" : `1px solid ${P.line}` }}>
            <motion.div initial="hidden" animate="show" exit="exit" variants={cascade(0.1, 0.06)} style={{ display: "flex", alignItems: "stretch", flex: 1, minWidth: 0 }}>
              {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------------- blocks --------------------------------------- */

/** The batting team: logo and code on a block of its colour, with a slanted right edge. */
const TeamBlock = ({ team, label, w = 296 }) => {
  const s = shades(team.id);
  return (
    <motion.div variants={slideIn(-60)} style={{ width: w, flex: "none", position: "relative", zIndex: 3, marginRight: -SLANT_PX, clipPath: SLANT_R(SLANT_PX), background: `linear-gradient(100deg, ${s.base} 0%, ${s.dark} 100%)`, display: "flex", alignItems: "center", gap: 16, padding: `0 ${SLANT_PX + 4}px 0 ${SLANT_PX + 8}px` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,.18) 100%)" }} />
      <div style={{ position: "relative" }}>
        <Logo team={team} size={66} />
      </div>
      <div style={{ position: "relative", lineHeight: 1, minWidth: 0 }}>
        <div style={{ ...caps, fontWeight: 800, fontSize: 62, letterSpacing: 1.5, textShadow: "0 2px 12px rgba(0,0,0,.35)" }}>{teamCode(team.name)}</div>
        {label && <div style={{ ...caps, fontWeight: 700, fontSize: 16, letterSpacing: 3, color: "rgba(255,255,255,.88)", marginTop: 5, whiteSpace: "nowrap" }}>{label}</div>}
      </div>
    </motion.div>
  );
};

const Score = ({ runs, wickets, overs, of, w = 360 }) => (
  <motion.div variants={slideIn(-40)} style={{ width: w, flex: "none", display: "flex", alignItems: "center", gap: 16, paddingLeft: SLANT_PX + 22 }}>
    <span style={{ ...caps, fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: 0, display: "inline-flex", alignItems: "baseline" }}>
      <Roll value={runs} />
      <span style={{ color: P.cyan, fontWeight: 600, margin: "0 3px" }}>-</span>
      <Roll value={wickets} />
    </span>
    <div style={{ lineHeight: 1 }}>
      <div style={{ ...caps, fontWeight: 700, fontSize: 40 }}>{overs}</div>
      <div style={{ ...caps, fontWeight: 600, fontSize: 15, letterSpacing: 2, color: P.muted, marginTop: 3, whiteSpace: "nowrap" }}>{of}</div>
    </div>
  </motion.div>
);

function BatterRow({ b, photos, teamId, big }) {
  const on = b.isOnStrike;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: big ? 70 : 50, opacity: on ? 1 : 0.8 }}>
      <span style={{ width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: `14px solid ${on ? P.cyan : "transparent"}`, flex: "none" }} />
      {photos && <Photo src={b.profilePicture} name={b.name} teamId={teamId} w={big ? 60 : 44} h={big ? 60 : 44} style={{ clipPath: PARA(8) }} />}
      <span style={{ ...caps, flex: 1, minWidth: 0, fontWeight: on ? 800 : 600, fontSize: big ? 38 : 31, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: on ? "#fff" : P.soft }}>{short(b.name)}</span>
      <Roll value={b.runs} style={{ ...caps, fontWeight: 800, fontSize: big ? 52 : 40, minWidth: 54, textAlign: "right" }} />
      <span style={{ ...caps, fontWeight: 600, fontSize: big ? 27 : 22, color: P.muted, minWidth: 52, letterSpacing: 0 }}>({b.balls})</span>
    </div>
  );
}

function BattersBlock({ list, mode, photos, teamId }) {
  const pick = mode === "striker" ? list.filter((b) => b.isOnStrike) : mode === "nonStriker" ? list.filter((b) => !b.isOnStrike) : list;
  const shown = pick.length ? pick : list.slice(0, 1);
  return (
    <motion.div variants={slideIn(-40)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px 0 20px", minWidth: 0 }}>
      {list.length === 0 ? <span style={{ ...caps, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: P.muted }}>New batter</span> : shown.map((b) => <BatterRow key={b.playerId} b={b} photos={photos} teamId={teamId} big={shown.length === 1} />)}
    </motion.div>
  );
}

function BowlerBlock({ bowler, chips, showBowler, showOver, photos, teamId }) {
  const last = bowler ? bowler.name.trim().split(/\s+/).slice(-1)[0] : "";
  const both = showBowler && showOver;
  return (
    <motion.div variants={slideIn(-40)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 20px 0 20px", minWidth: 0 }}>
      {showBowler &&
        (bowler ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: both ? 48 : 64 }}>
            {photos && <Photo src={bowler.profilePicture} name={bowler.name} teamId={teamId} w={both ? 44 : 58} h={both ? 44 : 58} style={{ clipPath: PARA(8) }} />}
            <span style={{ ...caps, flex: 1, minWidth: 0, fontWeight: 800, fontSize: both ? 31 : 36, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</span>
            <span style={{ ...caps, fontWeight: 800, fontSize: both ? 38 : 46, color: P.gold }}>
              {bowler.wickets}-{bowler.runsConceded}
            </span>
            <span style={{ ...caps, fontWeight: 600, fontSize: 22, color: P.muted, letterSpacing: 0 }}>({bowler.overs})</span>
          </div>
        ) : (
          <span style={{ ...caps, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: P.muted }}>Next bowler</span>
        ))}
      {showOver && (
        <motion.div variants={cascade(0.05, 0.05)} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 32 }}>
          {chips.slice(-8).map((c, i) => (
            <BallChip key={i} c={c} size={both ? 31 : 38} variants={popIn} />
          ))}
          {chips.length === 0 && <span style={{ ...caps, fontWeight: 600, fontSize: 17, letterSpacing: 3, color: P.muted }}>{bowler ? "New over" : "Last over"}</span>}
        </motion.div>
      )}
    </motion.div>
  );
}

const Mini = ({ k, children, color = "#fff" }) => (
  <span style={{ ...caps, fontWeight: 600, fontSize: 19, letterSpacing: 2, color: P.muted, whiteSpace: "nowrap" }}>
    {k} <b style={{ color, fontWeight: 800 }}>{children}</b>
  </span>
);

function InfoBlock({ sb, inning }) {
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const projected = projectedScore(sb, inning);
  const crr = inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00";
  if (chase) {
    const pct = Math.min(100, (inning.totalRuns / inning.targetScore) * 100);
    return (
      <motion.div variants={slideIn(-40)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px 0 24px", minWidth: 0, position: "relative" }}>
        <div style={{ ...caps, fontWeight: 800, fontSize: need === 0 ? 38 : 42, lineHeight: 1, color: need === 0 ? P.green : "#fff", whiteSpace: "nowrap" }}>{need === 0 ? "Target reached" : `Need ${need} off ${left}`}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <Mini k="TGT" color={P.gold}>
            {inning.targetScore}
          </Mini>
          <Mini k="RRR">{inning.requiredRunRate ? Number(inning.requiredRunRate).toFixed(2) : "0.00"}</Mini>
          <Mini k="CRR">{crr}</Mini>
        </div>
        <div style={{ position: "absolute", left: 24, right: 26, bottom: 14, height: 4, background: "rgba(255,255,255,.14)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE_OUT }} style={{ height: "100%", background: `linear-gradient(90deg, ${P.magenta}, ${P.cyan})` }} />
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div variants={slideIn(-40)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px 0 24px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ ...caps, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: P.cyan }}>CRR</span>
        <span style={{ ...caps, fontWeight: 800, fontSize: 48, lineHeight: 1 }}>{crr}</span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {projected ? (
          <Mini k="PROJ" color={P.gold}>
            {projected}
          </Mini>
        ) : null}
        <Mini k="P'SHIP">{inning.partnershipRuns || 0}</Mini>
      </div>
    </motion.div>
  );
}

/* ----------------------------------- the event morph ----------------------------------- */

/**
 * A four, a six, a wicket or a milestone in the ribbon is the animation and nothing else, as on TV: the middle of the ribbon becomes a band
 * in the event's colour with the word on it. No batter, no bowler, no figures; the score and the team stay where they are.
 * (A fifty or a hundred carries the player on its own card, see PremiumMilestone.)
 *   0.00  the band slides in from the left
 *   0.12  the word and its small label fade in, easing a short way into place
 *   all along: faint diagonal stripes drift across the band, so it is alive without being busy
 */
function WordPanel({ event }) {
  const k = EVENT[event.kind] || EVENT.four;
  const word = k.word || event.title;
  const t = useClock(1);
  const fade = (a, b, dx = 0) => (s) => {
    const e = easeOutExpo(seg(s, a, b));
    return { opacity: String(e), transform: `translateX(${lerp(dx, 0, e)}px)` };
  };
  return (
    <motion.div exit={{ opacity: 0, transition: { duration: 0.2 } }} style={{ position: "relative", display: "flex", width: 1130, overflow: "hidden", marginLeft: 6 }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden", clipPath: SLANT_L(SLANT_PX) }}>
        <Live t={t} at={(s) => ({ transform: `translateX(${lerp(-104, 0, easeOutExpo(seg(s, 0, 0.5)))}%)` })} style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, ${k.color} 0%, ${k.deep} 100%)` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,.18) 100%)" }} />
          <Live t={t} at={(s) => ({ backgroundPosition: `${-s * 46}px 0` })} style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 14px, transparent 14px 46px)" }} />
        </Live>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: k.fg }}>
          <Live t={t} at={fade(0.12, 0.55, -34)} style={{ ...caps, fontWeight: 800, fontStyle: "italic", fontSize: word.length > 5 ? 84 : 104, lineHeight: 0.9, letterSpacing: 6, textShadow: "0 3px 0 rgba(0,0,0,.18)", opacity: 0 }}>
            {word}
          </Live>
          <Live t={t} at={fade(0.24, 0.6, -20)} style={{ ...caps, fontWeight: 700, fontSize: 18, letterSpacing: 9, marginTop: 6, opacity: 0 }}>
            {k.sub}
          </Live>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------ message states ------------------------------------ */

const Message = ({ big, small, left, right }) => (
  <motion.div variants={slideIn(30)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: `0 ${SLANT_PX + 20}px 0 14px`, textAlign: "center", minWidth: 520 }}>
    {left}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
      <span style={{ ...caps, fontWeight: 800, fontSize: 50, letterSpacing: 2, lineHeight: 1.02, whiteSpace: "nowrap" }}>{big}</span>
      {small && <span style={{ ...caps, fontWeight: 600, fontSize: 25, color: P.soft, letterSpacing: 3, marginTop: 4, whiteSpace: "nowrap" }}>{small}</span>}
    </div>
    {right}
  </motion.div>
);

const BigScore = ({ runs, wickets, note }) => (
  <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", padding: `0 28px 0 ${SLANT_PX + 22}px`, ...caps, fontWeight: 800, fontSize: 76, whiteSpace: "nowrap" }}>
    {runs}
    <span style={{ color: P.cyan, margin: "0 3px" }}>-</span>
    {wickets} <span style={{ fontSize: 26, color: P.muted, fontWeight: 600, marginLeft: 14 }}>{note}</span>
  </motion.div>
);

/* ----------------------------------------- the bar ----------------------------------------- */

/**
 * The Premium score bug. Takes exactly what the Basic one takes.
 * @param event  the four / six / wicket / fifty that just happened (detectEvent), or null
 * @param bar    the operator's switches: batters, bowler, thisOver, info, photos, events
 */
export default function PremiumScoreBug({ sb, inning, event, tournamentTag, photoOf, bar }) {
  const playing = event && bar.events ? event : null;

  /* ---- a tied match being settled with a super over: the Basic bar knows all its states ---- */
  if (sb.status === "completed" && sb.superOver && sb.superOver.active) return <ScoreBug sb={sb} inning={inning} event={event} tournamentTag={tournamentTag} photoOf={photoOf} bar={bar} />;

  const common = { tag: tournamentTag, event: playing };

  /* ---- match over ---- */
  if (sb.status === "completed") {
    const r = sb.matchResult;
    const [a, b] = sb.innings;
    const teamOfInnings = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
    const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
    const winner = r && r.winnerTeamId ? (r.winnerTeamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    const viaSuperOver = sb.superOver && sb.superOver.phase === "settled";
    const level = [a, b].filter(Boolean).map((i) => `${teamCode(teamOfInnings(i).name)} ${i.totalRuns}/${i.wickets} (${i.overs})`).join("   ·   ");
    return (
      <Ribbon {...common} event={null} accent={winner ? winner.id : null} modeKey="done">
        {winner && <TeamBlock team={winner} label="Winner" />}
        <Message big={viaSuperOver && winner ? `${winner.name} won the super over` : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`} small={viaSuperOver ? `Match tied  ·  ${level}` : level} />
      </Ribbon>
    );
  }

  const { batting, bowling } = sides(sb, inning);
  const started = (inning.ballsBowled || 0) > 0 || inning.currentBatsmen.length > 0;

  /* ---- before the first ball ---- */
  if (!started) {
    const first = sb.innings[0];
    if (inning.inningsNumber === 2) {
      const firstTeam = first.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2;
      return (
        <Ribbon {...common} event={null} accent={firstTeam.id} modeKey="break">
          <TeamBlock team={firstTeam} label="Innings break" />
          <BigScore runs={first.totalRuns} wickets={first.wickets} note={`(${first.overs})`} />
          <Message big={`${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win`} small={`from ${sb.maxOvers} overs`} />
        </Ribbon>
      );
    }
    const tossTeam = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Ribbon {...common} event={null} accent={tossTeam ? tossTeam.id : null} modeKey="pre">
        <Message big={`${sb.teams.team1.name}  v  ${sb.teams.team2.name}`} small={tossTeam ? `${tossTeam.name} won the toss and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "Match starting soon"} left={<Logo team={sb.teams.team1} size={74} />} right={<Logo team={sb.teams.team2} size={74} />} />
      </Ribbon>
    );
  }

  /* ---- live ---- */
  const chips = overChips(inning);
  const showBatters = bar.batters !== "none";
  const showBowlerSeg = bar.bowler || bar.thisOver;
  const label = inning.inningsNumber > 1 ? "2nd innings" : "1st innings";
  const inBar = !!playing; // the operator can switch the event animations off altogether (bar.events)

  return (
    <Ribbon {...common} accent={batting.id} modeKey="live" freeHit={inning.freeHit}>
      <TeamBlock team={batting} label={label} />
      <Score runs={inning.totalRuns} wickets={inning.wickets} overs={inning.overs} of={`OF ${sb.maxOvers} OV`} />
      <AnimatePresence mode="wait">
        {inBar ? (
          <WordPanel key={`event-${event.key}`} event={event} />
        ) : (
          <motion.div key="blocks" initial="hidden" animate="show" exit="exit" variants={cascade(0.04, 0.07)} style={{ display: "flex", alignItems: "stretch" }}>
            <Seg show={showBatters} w={bar.batters === "both" ? 420 : 380}>
              <BattersBlock list={inning.currentBatsmen} mode={bar.batters} photos={bar.photos} teamId={batting.id} />
            </Seg>
            <Seg show={showBowlerSeg} w={bar.bowler && bar.thisOver ? 380 : bar.bowler ? 340 : 330}>
              <BowlerBlock bowler={inning.currentBowler} chips={chips} showBowler={bar.bowler} showOver={bar.thisOver} photos={bar.photos} teamId={bowling.id} />
            </Seg>
            <Seg show={bar.info} w={330}>
              <InfoBlock sb={sb} inning={inning} />
            </Seg>
          </motion.div>
        )}
      </AnimatePresence>
    </Ribbon>
  );
}
