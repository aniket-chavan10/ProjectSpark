import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode } from "../Scoring/scoreUtils";
import { BallChip, C, caps, EASE, EDGE, holder, Label, Logo, Name, Photo, PLATE, pop, rise, Roll, shades, short, slide, SLANT, stage, teamBlock, wipe } from "./bc";

// The score bar along the bottom of the picture, in the style of professional cricket coverage:
//   [ team | score and overs | batters | bowler and this over | target or run rate ]
// The operator can switch the batters (both / one / none), the bowler, this over, the right-hand block and the
// player photos on and off (`bar`), and each part opens and closes smoothly. A four, six, wicket or fifty plays
// inside the bar itself (the other parts close, a photo and the figures take their place), or as a photo banner above
// it, or not at all: the operator chooses.

export const BAR_H = 112;
export const BAR_LEFT = 80;
export const BAR_BOTTOM = 52;
const SLANT_PX = 26;

const BANNER = {
  four: { color: C.four, word: "FOUR", sub: "Boundary", fg: "#fff" },
  six: { color: C.six, word: "SIX", sub: "Maximum", fg: "#fff" },
  wicket: { color: C.wicket, word: "WICKET", sub: "Dismissal", fg: "#fff" },
  milestone: { color: C.gold, word: "", sub: "Milestone", fg: "#2b1b00" },
};

/** FOUR / SIX / WICKET / FIFTY: a photo banner above the bar. */
function EventBanner({ event, photo }) {
  const k = BANNER[event.kind] || BANNER.four;
  const word = k.word || event.title;
  const t = shades(event.teamId);
  const st = event.stats;
  const stats = st
    ? [
        ["4s", st.fours],
        ["6s", st.sixes],
        ["SR", st.strikeRate],
      ]
    : [];
  return (
    <motion.div key={event.key} variants={holder} initial="hidden" animate="show" exit="exit" style={{ position: "absolute", left: 0, bottom: `calc(100% + 20px)`, filter: "drop-shadow(0 22px 40px rgba(0,0,0,.55))" }}>
      <motion.div variants={wipe("left")} style={{ display: "flex", height: 200 }}>
        <div style={{ display: "flex", height: "100%", background: PLATE, boxShadow: EDGE }}>
          {/* the word */}
          <div style={{ width: word.length > 4 ? 360 : 300, background: `linear-gradient(100deg, ${k.color} 0%, ${shadeOf(k.color)} 100%)`, clipPath: SLANT(34), marginRight: -34, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 54px 0 34px", color: k.fg, zIndex: 2 }}>
            <motion.div variants={slide(-50)} style={{ ...caps, fontWeight: 800, fontStyle: "italic", fontSize: word.length > 5 ? 74 : 104, lineHeight: 0.92, letterSpacing: 1 }}>
              {word}
            </motion.div>
            <motion.div variants={rise} style={{ ...caps, fontWeight: 600, fontSize: 20, letterSpacing: 5, opacity: 0.85, marginTop: 6 }}>
              {k.sub}
            </motion.div>
          </div>
          {/* the player */}
          <motion.div variants={pop} style={{ marginLeft: 20, alignSelf: "stretch" }}>
            <Photo src={photo} name={event.name} teamId={event.teamId} w={190} h={200} position="50% 10%" />
          </motion.div>
          {/* the figures */}
          <motion.div variants={stage(0.1, 0.07)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 44px 0 30px", minWidth: 470 }}>
            <motion.div variants={slide(40)}>
              <Name name={event.name} size={56} />
            </motion.div>
            <motion.div variants={rise} style={{ ...caps, fontWeight: 600, fontSize: 27, color: C.soft, letterSpacing: 2, marginTop: 6, whiteSpace: "nowrap" }}>
              {event.detail}
            </motion.div>
            <motion.div variants={rise} style={{ display: "flex", gap: 24, marginTop: 6, alignItems: "baseline" }}>
              {event.kind === "wicket" && st && (
                <span style={{ ...caps, fontWeight: 800, fontSize: 40, color: "#fff" }}>
                  {st.runs}
                  <span style={{ fontSize: 26, color: C.muted, fontWeight: 600 }}> ({st.balls})</span>
                </span>
              )}
              {stats.map(([a, b]) => (
                <span key={a} style={{ ...caps, fontWeight: 600, fontSize: 24, color: C.muted, letterSpacing: 2 }}>
                  {a} <b style={{ color: "#fff", fontWeight: 700 }}>{b}</b>
                </span>
              ))}
              {event.kind === "wicket" && event.fall && (
                <span style={{ ...caps, fontWeight: 600, fontSize: 24, color: t.light, letterSpacing: 2 }}>
                  FoW <b style={{ color: "#fff", fontWeight: 700 }}>{event.fall}</b> · {event.over} ov
                </span>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const shadeOf = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v) => Math.round(v * 0.62);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/**
 * The same event, played inside the bar: the batters, bowler and target blocks close, and in their place come the
 * word (FOUR / SIX / WICKET / FIFTY), the player's photo, the name and the figures. The team and the score stay
 * where they are, so the viewer watches the score change while it plays. The bar returns to normal by itself.
 */
function EventSeg({ event, photo }) {
  const k = BANNER[event.kind] || BANNER.four;
  const word = k.word || event.title;
  const st = event.stats;
  return (
    <div style={{ display: "flex", alignItems: "stretch", width: "100%", overflow: "hidden" }}>
      <motion.div variants={slide(-70)} style={{ width: word.length > 4 ? 340 : 280, flex: "none", position: "relative", zIndex: 2, marginLeft: 14, marginRight: -SLANT_PX, background: `linear-gradient(100deg, ${k.color} 0%, ${shadeOf(k.color)} 100%)`, clipPath: SLANT(SLANT_PX), display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${SLANT_PX + 22}px 0 26px`, color: k.fg }}>
        <div style={{ ...caps, fontWeight: 800, fontStyle: "italic", fontSize: word.length > 5 ? 62 : 84, lineHeight: 0.9, letterSpacing: 1 }}>{word}</div>
        <div style={{ ...caps, fontWeight: 600, fontSize: 16, letterSpacing: 5, opacity: 0.85, marginTop: 4 }}>{k.sub}</div>
      </motion.div>
      <motion.div variants={pop} style={{ marginLeft: SLANT_PX, flex: "none" }}>
        <Photo src={photo} name={event.name} teamId={event.teamId} w={112} h={112} position="50% 10%" />
      </motion.div>
      <motion.div variants={slide(40)} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px 0 22px" }}>
        <Name name={event.name} size={44} />
        <div style={{ ...caps, fontWeight: 600, fontSize: 23, color: C.soft, letterSpacing: 2, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.detail}</div>
      </motion.div>
      {st && (
        <motion.div variants={rise} style={{ flex: "none", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", padding: "0 26px 0 20px", borderLeft: `1px solid ${C.line}` }}>
          <span style={{ ...caps, fontWeight: 800, fontSize: 52, lineHeight: 1 }}>
            {st.runs}
            <span style={{ fontSize: 26, color: C.muted, fontWeight: 600 }}> ({st.balls})</span>
          </span>
          <span style={{ ...caps, fontWeight: 600, fontSize: 19, color: C.muted, letterSpacing: 2, marginTop: 6, whiteSpace: "nowrap" }}>
            {event.kind === "wicket" && event.fall ? (
              <>
                FoW <b style={{ color: "#fff", fontWeight: 700 }}>{event.fall}</b> · {event.over} ov
              </>
            ) : (
              <>
                4s <b style={{ color: "#fff", fontWeight: 700 }}>{st.fours}</b> &nbsp; 6s <b style={{ color: "#fff", fontWeight: 700 }}>{st.sixes}</b> &nbsp; SR <b style={{ color: "#fff", fontWeight: 700 }}>{st.strikeRate}</b>
              </>
            )}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/** A part of the bar that opens and closes by itself when switched. */
function Seg({ show, w, children }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="seg" initial={{ width: 0, opacity: 0 }} animate={{ width: w, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.42, ease: EASE }} style={{ overflow: "hidden", flex: "none", display: "flex", alignItems: "stretch" }}>
          <div style={{ width: w, flex: "none", display: "flex", alignItems: "stretch", borderLeft: `1px solid ${C.line}` }}>
            {/* its own animation state, so a part that opens while the bar is already on air still builds in */}
            <motion.div initial="hidden" animate="show" exit="exit" variants={stage(0.12, 0.06)} style={{ display: "flex", alignItems: "stretch", flex: 1, minWidth: 0 }}>
              {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The bar itself: the frame, the plate, and whatever is in it. */
function Frame({ accentId, tag, freeHit, event, eventPhoto, showEvents = true, modeKey, children }) {
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: BAR_LEFT, bottom: BAR_BOTTOM }}>
      <AnimatePresence>{event && showEvents && <EventBanner key={event.key} event={event} photo={eventPhoto} />}</AnimatePresence>

      {(tag || freeHit) && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, pointerEvents: "none" }}>
          <div>
            {tag && (
              <motion.span variants={rise} style={{ display: "inline-block", background: "rgba(7,11,23,.88)", color: C.soft, ...caps, fontWeight: 600, fontSize: 20, letterSpacing: 3, padding: "5px 16px 4px", borderLeft: `4px solid ${shades(accentId).base}` }}>
                {tag}
              </motion.span>
            )}
          </div>
          <AnimatePresence>
            {freeHit && (
              <motion.span initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 360, damping: 22 }} style={{ display: "inline-block", background: C.brand, color: "#fff", ...caps, fontWeight: 800, fontSize: 26, letterSpacing: 6, padding: "4px 26px 3px", marginRight: 30 }}>
                Free hit
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      <motion.div variants={wipe("left")} style={{ filter: "drop-shadow(0 20px 36px rgba(0,0,0,.55))" }}>
        <div style={{ display: "flex", height: BAR_H, background: PLATE, boxShadow: EDGE, color: "#fff", clipPath: `polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)`, paddingRight: 18, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.div key={modeKey} initial="hidden" animate="show" exit="exit" variants={stage(0.2, 0.06)} style={{ display: "flex", alignItems: "stretch" }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** The batting team: logo and code on a block of its colour, with a slanted edge. */
const TeamBlock = ({ team, label, w = 270 }) => (
  <motion.div variants={slide(-40)} style={{ width: w, flex: "none", position: "relative", zIndex: 2, marginRight: -SLANT_PX, background: teamBlock(team.id), clipPath: SLANT(SLANT_PX), display: "flex", alignItems: "center", gap: 16, padding: `0 ${SLANT_PX + 6}px 0 20px` }}>
    <Logo team={team} size={68} />
    <div style={{ lineHeight: 1, minWidth: 0 }}>
      <div style={{ ...caps, fontWeight: 800, fontSize: 64, letterSpacing: 1.5, textShadow: "0 2px 10px rgba(0,0,0,.3)" }}>{teamCode(team.name)}</div>
      {label && <div style={{ ...caps, fontWeight: 600, fontSize: 17, letterSpacing: 3, color: "rgba(255,255,255,.82)", marginTop: 4, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  </motion.div>
);

const Score = ({ runs, wickets, overs, of, w = 290 }) => (
  <motion.div variants={slide(-30)} style={{ width: w, flex: "none", display: "flex", alignItems: "center", gap: 18, paddingLeft: SLANT_PX + 12 }}>
    <span style={{ ...caps, fontWeight: 800, fontSize: 92, lineHeight: 1, letterSpacing: 0, display: "inline-flex", alignItems: "baseline" }}>
      <Roll value={runs} />
      <span style={{ color: C.muted, fontWeight: 600, margin: "0 2px" }}>-</span>
      <Roll value={wickets} />
    </span>
    <div style={{ lineHeight: 1 }}>
      <div style={{ ...caps, fontWeight: 700, fontSize: 40 }}>{overs}</div>
      <Label size={15} style={{ letterSpacing: 2, whiteSpace: "nowrap" }}>{of}</Label>
    </div>
  </motion.div>
);

/** One batter on the bar: marker, photo, name, runs and balls. */
function BatterRow({ b, photos, big, teamId }) {
  const on = b.isOnStrike;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: big ? 70 : 50, opacity: on ? 1 : 0.82 }}>
      <span style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: `12px solid ${on ? C.brand : "transparent"}`, flex: "none" }} />
      {photos && <Photo src={b.profilePicture} name={b.name} teamId={teamId} w={big ? 62 : 44} h={big ? 62 : 44} radius={4} />}
      <span style={{ ...caps, flex: 1, minWidth: 0, fontWeight: on ? 700 : 600, fontSize: big ? 38 : 31, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: on ? "#fff" : C.soft }}>{short(b.name)}</span>
      <Roll value={b.runs} style={{ ...caps, fontWeight: 800, fontSize: big ? 52 : 40, minWidth: 54, textAlign: "right" }} />
      <span style={{ ...caps, fontWeight: 600, fontSize: big ? 28 : 23, color: C.muted, minWidth: 54, letterSpacing: 0 }}>({b.balls})</span>
    </div>
  );
}

function BattersSeg({ list, mode, photos, teamId }) {
  const pick = mode === "striker" ? list.filter((b) => b.isOnStrike) : mode === "nonStriker" ? list.filter((b) => !b.isOnStrike) : list;
  const shown = pick.length ? pick : list.slice(0, 1);
  return (
    <motion.div variants={slide(-30)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 0 20px", minWidth: 0 }}>
      {list.length === 0 ? <Label size={22}>New batter</Label> : shown.map((b) => <BatterRow key={b.playerId} b={b} photos={photos} teamId={teamId} big={shown.length === 1} />)}
    </motion.div>
  );
}

function BowlerSeg({ bowler, chips, showBowler, showOver, photos, teamId }) {
  const last = bowler ? bowler.name.trim().split(/\s+/).slice(-1)[0] : "";
  const both = showBowler && showOver;
  return (
    <motion.div variants={slide(-30)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 22px 0 20px", minWidth: 0 }}>
      {showBowler &&
        (bowler ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: both ? 48 : 64 }}>
            {photos && <Photo src={bowler.profilePicture} name={bowler.name} teamId={teamId} w={both ? 44 : 58} h={both ? 44 : 58} radius={4} />}
            <span style={{ ...caps, flex: 1, minWidth: 0, fontWeight: 700, fontSize: both ? 31 : 36, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last}</span>
            <span style={{ ...caps, fontWeight: 800, fontSize: both ? 38 : 46, color: C.gold }}>
              {bowler.wickets}-{bowler.runsConceded}
            </span>
            <span style={{ ...caps, fontWeight: 600, fontSize: 22, color: C.muted, letterSpacing: 0 }}>({bowler.overs})</span>
          </div>
        ) : (
          <Label size={22}>Next bowler</Label>
        ))}
      {showOver && (
        <motion.div variants={stage(0.05, 0.05)} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 32 }}>
          {chips.slice(-8).map((c, i) => (
            <BallChip key={i} c={c} size={both ? 31 : 38} />
          ))}
          {chips.length === 0 && <Label size={17}>{bowler ? "New over" : "Last over"}</Label>}
        </motion.div>
      )}
    </motion.div>
  );
}

function InfoSeg({ sb, inning }) {
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const projected = projectedScore(sb, inning);
  if (chase) {
    const pct = Math.min(100, (inning.totalRuns / inning.targetScore) * 100);
    return (
      <motion.div variants={slide(-24)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px 0 24px", minWidth: 0, position: "relative" }}>
        <div style={{ ...caps, fontWeight: 800, fontSize: need === 0 ? 40 : 44, lineHeight: 1, color: need === 0 ? C.green : "#fff", whiteSpace: "nowrap" }}>{need === 0 ? "Target reached" : `Need ${need} off ${left}`}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
          <Label size={19}>
            Target <b style={{ color: C.gold, fontWeight: 700 }}>{inning.targetScore}</b>
          </Label>
          <Label size={19}>
            RRR <b style={{ color: "#fff", fontWeight: 700 }}>{inning.requiredRunRate ? Number(inning.requiredRunRate).toFixed(2) : "0.00"}</b>
          </Label>
          <Label size={19}>
            CRR <b style={{ color: "#fff", fontWeight: 700 }}>{inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00"}</b>
          </Label>
        </div>
        <div style={{ position: "absolute", left: 24, right: 20, bottom: 12, height: 4, background: "rgba(255,255,255,.12)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} style={{ height: "100%", background: C.gold }} />
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div variants={slide(-24)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px 0 24px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <Label size={22}>CRR</Label>
        <span style={{ ...caps, fontWeight: 800, fontSize: 48, lineHeight: 1 }}>{inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00"}</span>
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
        {projected ? (
          <Label size={19}>
            Projected <b style={{ color: C.gold, fontWeight: 700 }}>{projected}</b>
          </Label>
        ) : null}
        <Label size={19} style={{ whiteSpace: "nowrap" }}>
          P&apos;ship <b style={{ color: "#fff", fontWeight: 700 }}>{inning.partnershipRuns || 0}</b>
        </Label>
      </div>
    </motion.div>
  );
}

/* ------------------------- the message states of the bar ------------------------- */

const Message = ({ big, small, left, right }) => (
  <motion.div variants={slide(30)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: "0 30px 0 10px", textAlign: "center", minWidth: 0 }}>
    {left}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
      <span style={{ ...caps, fontWeight: 800, fontSize: 50, letterSpacing: 2, lineHeight: 1.02, whiteSpace: "nowrap" }}>{big}</span>
      {small && <span style={{ ...caps, fontWeight: 600, fontSize: 25, color: C.soft, letterSpacing: 3, marginTop: 4, whiteSpace: "nowrap" }}>{small}</span>}
    </div>
    {right}
  </motion.div>
);

const BigScore = ({ runs, wickets, note }) => (
  <motion.div variants={slide(-30)} style={{ display: "flex", alignItems: "center", padding: `0 28px 0 ${SLANT_PX + 14}px`, ...caps, fontWeight: 800, fontSize: 76, whiteSpace: "nowrap" }}>
    {runs}-{wickets} <span style={{ fontSize: 26, color: C.muted, fontWeight: 600, marginLeft: 14 }}>{note}</span>
  </motion.div>
);

/* ---------------------------------- the super over ---------------------------------- */

const soKind = (b) => (b.wicket ? "wicket" : b.extra ? "extra" : b.runs === 6 ? "six" : b.runs === 4 ? "four" : b.runs === 0 ? "dot" : "run");
const lastName = (p) => (p && p.name ? p.name.trim().split(/\s+/).slice(-1)[0] : null);
const teamOfSide = (sb, id) => (Number(id) === Number(sb.teams.team1.id) ? sb.teams.team1 : sb.teams.team2);
const inningsLine = (sb, i) => `${teamCode(teamOfSide(sb, i.teamId).name)} ${i.runs}/${i.wickets}`;

/** A tied match decided on one over each: the bar switches to it by itself the moment the scorer starts the super over. */
function SuperOverBar({ sb, so, event, eventPhoto, bar }) {
  const tag = so.round > 1 ? `Super over ${so.round}` : "Super over";
  const [first, second] = so.rounds[so.rounds.length - 1].innings;
  const cur = so.current;
  const common = { tag, event, eventPhoto, showEvents: bar.events };

  if (so.phase === "ready") {
    const team = teamOfSide(sb, cur.teamId);
    return (
      <Frame {...common} accentId={team.id} modeKey={`so-ready-${cur.id}`}>
        <TeamBlock team={team} label="Super over" />
        <Message big="Super over" small={`Match tied. ${team.name} bat first, one over each`} />
      </Frame>
    );
  }
  if (so.phase === "break") {
    const team = teamOfSide(sb, first.teamId);
    return (
      <Frame {...common} accentId={team.id} modeKey={`so-break-${cur.id}`}>
        <TeamBlock team={team} label="Super over" />
        <BigScore runs={first.runs} wickets={first.wickets} note={`(${first.legalBalls} balls)`} />
        <Message big={`${teamOfSide(sb, cur.teamId).name} need ${so.chase.target} to win`} small="from 6 balls" />
      </Frame>
    );
  }
  if (so.phase === "level") {
    return (
      <Frame {...common} accentId={null} modeKey={`so-level-${so.round}`}>
        <Message big="Super over level" small={`${inningsLine(sb, first)}  ·  ${inningsLine(sb, second)}  ·  another over to come`} />
      </Frame>
    );
  }
  if (so.phase === "decided") {
    const winner = teamOfSide(sb, so.winnerTeamId);
    return (
      <Frame {...common} tag="Super over result" accentId={winner.id} modeKey={`so-decided-${so.round}`}>
        <TeamBlock team={winner} label="Winner" />
        <Message big={`${winner.name} win the super over`} small={`${inningsLine(sb, first)}  ·  ${inningsLine(sb, second)}`} />
      </Frame>
    );
  }

  const team = teamOfSide(sb, cur.teamId);
  const fielding = teamOfSide(sb, cur.teamId === Number(sb.teams.team1.id) ? sb.teams.team2.id : sb.teams.team1.id);
  const slots = Math.max(so.ballsPerOver, cur.balls.length);
  const bowlerName = lastName(cur.bowler);
  return (
    <Frame {...common} accentId={team.id} modeKey={`so-live-${cur.id}`}>
      <TeamBlock team={team} label="Super over" />
      <Score runs={cur.runs} wickets={cur.wickets} overs={`0.${cur.legalBalls}`} of="of 1 ov" w={270} />
      <Seg show w={360}>
        <motion.div variants={slide(-30)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, padding: "0 20px", minWidth: 0 }}>
          {cur.batters.length ? (
            cur.batters.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, height: 44 }}>
                {bar.photos && <Photo src={b.photo} name={b.name || ""} teamId={team.id} w={38} h={38} radius={4} />}
                <span style={{ ...caps, fontWeight: 700, fontSize: 29, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{short(b.name || "")}</span>
              </div>
            ))
          ) : (
            <Label size={22}>{team.name} batting</Label>
          )}
          <Label size={16}>{bowlerName ? `v ${bowlerName}` : `v ${fielding.name}`}</Label>
        </motion.div>
      </Seg>
      <Seg show w={420}>
        <motion.div variants={stage(0.05, 0.05)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 20px" }}>
          {Array.from({ length: slots }).map((_, i) => {
            const b = cur.balls[i];
            return b ? <BallChip key={i} c={{ text: b.label, kind: soKind(b) }} size={42} /> : <span key={i} style={{ width: 42, height: 42, borderRadius: 21, boxShadow: "inset 0 0 0 2px rgba(255,255,255,.16)" }} />;
          })}
        </motion.div>
      </Seg>
      <Seg show w={430}>
        <motion.div variants={slide(-24)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px 0 24px", minWidth: 0 }}>
          {so.chase ? (
            <>
              <div style={{ ...caps, fontWeight: 800, fontSize: 40, lineHeight: 1, color: so.chase.need === 0 ? C.green : "#fff", whiteSpace: "nowrap" }}>{so.chase.need === 0 ? "Target reached" : `Need ${so.chase.need} off ${so.chase.ballsLeft}`}</div>
              <Label size={19} style={{ marginTop: 8 }}>
                Target <b style={{ color: C.gold }}>{so.chase.target}</b>
              </Label>
            </>
          ) : (
            <>
              <div style={{ ...caps, fontWeight: 800, fontSize: 40, lineHeight: 1, whiteSpace: "nowrap" }}>
                {cur.ballsLeft} ball{cur.ballsLeft === 1 ? "" : "s"} left
              </div>
              <Label size={19} style={{ marginTop: 8 }}>Match tied</Label>
            </>
          )}
        </motion.div>
      </Seg>
    </Frame>
  );
}

/* ------------------------------------- the bar ------------------------------------- */

/** The broadcast-style bar along the bottom of the picture. */
export default function ScoreBug({ sb, inning, event, tournamentTag, photoOf, bar }) {
  const eventPhoto = event && photoOf ? photoOf(event.playerId) : undefined;
  const common = { event, eventPhoto, showEvents: bar.events, tag: tournamentTag };

  /* ---- a tied match being settled with a super over ---- */
  if (sb.status === "completed" && sb.superOver && sb.superOver.active) return <SuperOverBar sb={sb} so={sb.superOver} event={event} eventPhoto={eventPhoto} bar={bar} />;

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
      <Frame {...common} accentId={winner ? winner.id : null} modeKey="done">
        {winner && <TeamBlock team={winner} label="Winner" />}
        <Message
          big={viaSuperOver && winner ? `${winner.name} won the super over` : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`}
          small={viaSuperOver ? `Match tied  ·  ${level}` : level}
        />
      </Frame>
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
        <Frame {...common} accentId={firstTeam.id} modeKey="break">
          <TeamBlock team={firstTeam} label="Innings break" />
          <BigScore runs={first.totalRuns} wickets={first.wickets} note={`(${first.overs})`} />
          <Message big={`${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win`} small={`from ${sb.maxOvers} overs`} />
        </Frame>
      );
    }
    const tossTeam = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Frame {...common} accentId={tossTeam ? tossTeam.id : null} modeKey="pre">
        <Message
          big={`${sb.teams.team1.name}  v  ${sb.teams.team2.name}`}
          small={tossTeam ? `${tossTeam.name} won the toss and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "Match starting soon"}
          left={<Logo team={sb.teams.team1} size={74} />}
          right={<Logo team={sb.teams.team2} size={74} />}
        />
      </Frame>
    );
  }

  /* ---- live ---- */
  const chips = overChips(inning);
  const showBatters = bar.batters !== "none";
  const showBowlerSeg = bar.bowler || bar.thisOver;
  const label = inning.inningsNumber > 1 ? "2nd innings" : "1st innings";

  // a four, six, wicket or fifty plays inside the bar itself (the operator can move it to a banner above, or switch it off)
  const inBar = !!event && bar.events && bar.eventStyle !== "banner";

  return (
    <Frame {...common} showEvents={bar.events && bar.eventStyle === "banner"} accentId={batting.id} modeKey="live" freeHit={inning.freeHit}>
      <TeamBlock team={batting} label={label} />
      <Score runs={inning.totalRuns} wickets={inning.wickets} overs={inning.overs} of={`OF ${sb.maxOvers} OV`} />
      <Seg show={showBatters && !inBar} w={bar.batters === "both" ? 420 : 400}>
        <BattersSeg list={inning.currentBatsmen} mode={bar.batters} photos={bar.photos} teamId={batting.id} />
      </Seg>
      <Seg show={showBowlerSeg && !inBar} w={bar.bowler && bar.thisOver ? 380 : bar.bowler ? 340 : 330}>
        <BowlerSeg bowler={inning.currentBowler} chips={chips} showBowler={bar.bowler} showOver={bar.thisOver} photos={bar.photos} teamId={bowling.id} />
      </Seg>
      <Seg show={bar.info && !inBar} w={380}>
        <InfoSeg sb={sb} inning={inning} />
      </Seg>
      <Seg show={inBar} w={1160}>
        {event && <EventSeg key={event.key} event={event} photo={eventPhoto} />}
      </Seg>
    </Frame>
  );
}
