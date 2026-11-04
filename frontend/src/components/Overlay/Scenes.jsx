import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, runsNeeded, sides, teamCode } from "../Scoring/scoreUtils";
import { BAR_BOTTOM, BAR_H } from "./ScoreBug";
import { BallChip, C, CUT, CUT_TL, EASE, EDGE, FONT, Label, Logo, Name, Photo, PLATE, PLATE_SOFT, caps, fit, holder, photoLookup, pop, rise, shades, slide, stage, teamBlock, wipe, SHADOW, SLANT } from "./bc";

// The extra graphics the operator can put on air. Like a TV production they live in different parts of the frame:
//   card rows      player cards (batters, openers, bowler, one player, player of the match, top performers)
//   strips         a plate just above the score bar (toss, end of over, partnership, message)
//   panels         squads, scorecard, result (centre) and the ranking (right)
//   top banner     the chase equation
// A plate wipes open from its edge, then its content rises in one piece after another. Photos lead every player graphic.

const ABOVE_BAR = BAR_BOTTOM + BAR_H + 38; // the lowest a scene may reach
const SIDE = 80;

/* --------------------------------- data helpers --------------------------------- */

const teamOfId = (data, id) => data.teams.find((t) => Number(t.id) === Number(id)) || { id, name: `Team ${id}` };
const findCard = (scorecard, inningId) => (scorecard ? scorecard.innings.find((i) => i.inningId === inningId) : null);

/** Everything known about a player, by id: squads first (jersey, captain, keeper), then the live scoreboard. */
function personLookup(sb, data) {
  const map = {};
  [sb.teams.team1, sb.teams.team2].forEach((t) => (t.players || []).forEach((p) => (map[p.playerId] = { id: p.playerId, name: p.name, photo: p.profilePicture, number: p.jerseyNumber, teamId: t.id, captain: p.isCaptain, keeper: p.isKeeper })));
  data.teams.forEach((t) => {
    const sq = data.squads[t.id];
    if (sq) [...sq.playing, ...(sq.reserves || [])].forEach((p) => (map[p.player_id] = { id: p.player_id, name: p.players_name, photo: p.profile_picture, number: p.jersey_number, teamId: t.id, captain: p.is_captain, keeper: p.is_keeper }));
  });
  return (id) => map[id] || null;
}

/** A player's batting and bowling in this match, from the full scorecard (or the live scoreboard while it loads). */
function matchFigures(ctx, id) {
  const out = { bat: null, bowl: null };
  const { scorecard, sb } = ctx;
  if (scorecard) {
    scorecard.innings.forEach((i) => {
      const b = i.batting.find((x) => Number(x.playerId) === Number(id));
      if (b && (b.balls > 0 || b.status === "not out" || b.status === "out")) out.bat = b;
      const w = i.bowling.find((x) => Number(x.playerId) === Number(id));
      if (w && w.legalBalls > 0) out.bowl = w;
    });
  }
  if (!out.bat) {
    sb.innings.forEach((i) => {
      const b = i.currentBatsmen.find((x) => Number(x.playerId) === Number(id));
      if (b) out.bat = { ...b, status: "not out" };
    });
  }
  if (!out.bowl) {
    sb.innings.forEach((i) => {
      const w = i.currentBowler;
      if (w && Number(w.playerId) === Number(id)) out.bowl = { ...w, runs: w.runsConceded, legalBalls: 1 };
    });
  }
  return out;
}

/* ------------------------------------ frames ------------------------------------ */

/** A line under a heading: a short bright rule, then a faint one. */
const Rule2 = ({ id }) => (
  <motion.div variants={rise} style={{ display: "flex", height: 3, marginTop: 14 }}>
    <div style={{ width: 120, background: id != null ? shades(id).base : C.brand }} />
    <div style={{ flex: 1, background: C.line }} />
  </motion.div>
);

const Heading = ({ title, sub, right, id }) => (
  <motion.div variants={slide(-30)} style={{ marginBottom: 22 }}>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
      {title && <span style={{ ...caps, fontWeight: 700, fontSize: 52, lineHeight: 0.95, letterSpacing: 2 }}>{title}</span>}
      {sub && <span style={{ ...caps, fontWeight: 500, fontSize: 24, color: C.muted, letterSpacing: 3, paddingBottom: 4 }}>{sub}</span>}
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
    <Rule2 id={id} />
  </motion.div>
);

/** A big plate: squads, scorecard, result, ranking. */
function Panel({ children, style, accentId, from = "left", pad = "28px 44px 32px 50px" }) {
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})`, ...style }}>
      <motion.div variants={wipe(from)}>
        <div style={{ position: "relative", background: PLATE_SOFT, boxShadow: EDGE, clipPath: CUT(24) }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: accentId != null ? teamBlock(accentId) : C.brand }} />
          <motion.div variants={stage(0.22, 0.05)} style={{ padding: pad }}>
            {children}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A plate just above the score bar, with its label on top. */
function Strip({ children, tag, accentId, width, left = SIDE, right }) {
  const color = accentId != null ? shades(accentId).base : C.brand;
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left, ...(right !== undefined ? { right } : { width }), bottom: ABOVE_BAR - 14, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      {tag && (
        <motion.div variants={rise} style={{ marginBottom: 0 }}>
          <span style={{ display: "inline-block", background: color, ...caps, fontWeight: 700, fontSize: 22, letterSpacing: 4, padding: "5px 20px 3px" }}>{tag}</span>
        </motion.div>
      )}
      <motion.div variants={wipe("left", 0.05)}>
        <div style={{ background: PLATE, boxShadow: EDGE, clipPath: `polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%)`, minHeight: 124, display: "flex", alignItems: "stretch" }}>
          <motion.div variants={stage(0.25, 0.07)} style={{ display: "flex", alignItems: "stretch", flex: 1, paddingRight: 28 }}>
            {children}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const Cell = ({ children, grow, style, dx = -24 }) => (
  <motion.div variants={slide(dx)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 30px", flex: grow ? 1 : "none", minWidth: 0, borderLeft: `1px solid ${C.line}`, ...style }}>
    {children}
  </motion.div>
);
const Big = ({ children, size = 54, color, weight = 700 }) => <span style={{ ...caps, fontWeight: weight, fontSize: size, lineHeight: 1, letterSpacing: 1, color: color || "#fff" }}>{children}</span>;

/** A row of player cards, left-aligned with the score bar and standing on it. */
function CardRow({ children, gap = 22 }) {
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={{ ...holder, show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } } }} style={{ position: "absolute", left: SIDE, bottom: ABOVE_BAR - 8, display: "flex", alignItems: "flex-end", gap, fontFamily: FONT, color: "#fff" }}>
      {children}
    </motion.div>
  );
}

/**
 * A player as a broadcast card: a tall photo with the name on a plate below it.
 * `tag` is the label on the photo, `big` the headline figure, `lines` small [label, value] pairs.
 */
function PlayerCard({ name, photo, teamId, tag, tagColor, number, big, bigSub, lines = [], note, chips, w = 292, photoH = 280, accent, children }) {
  const t = shades(teamId);
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }, exit: { opacity: 0, y: 24, transition: { duration: 0.2 } } }} style={{ width: w, filter: `drop-shadow(${SHADOW})` }}>
      <div style={{ background: PLATE, boxShadow: EDGE, clipPath: CUT_TL(26), position: "relative" }}>
        <Photo src={photo} name={name} teamId={teamId} w={w} h={photoH} position="50% 8%">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(11,17,39,.92) 100%)" }} />
          {tag && <span style={{ position: "absolute", left: 0, top: 18, background: tagColor || t.base, color: tagColor ? "#2b1b00" : "#fff", ...caps, fontWeight: 700, fontSize: 19, letterSpacing: 3, padding: "4px 14px 3px 22px" }}>{tag}</span>}
          {number != null && number !== "" && <span style={{ position: "absolute", right: 16, top: 8, ...caps, fontWeight: 800, fontSize: 54, color: "rgba(255,255,255,.88)", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>{number}</span>}
        </Photo>
        <div style={{ padding: "6px 22px 18px", position: "relative", marginTop: -34 }}>
          <Name name={name} size={fit(name, 50, 11)} />
          {note && <div style={{ ...caps, fontWeight: 600, fontSize: 19, color: C.muted, letterSpacing: 2, marginTop: 6 }}>{note}</div>}
          {big !== undefined && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
              <span style={{ ...caps, fontWeight: 800, fontSize: 68, lineHeight: 1, color: accent || "#fff" }}>{big}</span>
              {bigSub && <span style={{ ...caps, fontWeight: 600, fontSize: 30, color: C.muted, letterSpacing: 0 }}>{bigSub}</span>}
            </div>
          )}
          {lines.length > 0 && (
            <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
              {lines.map(([k, v]) => (
                <span key={k} style={{ ...caps, fontWeight: 600, fontSize: 21, color: C.muted, letterSpacing: 2 }}>
                  {k} <b style={{ color: "#fff", fontWeight: 700 }}>{v}</b>
                </span>
              ))}
            </div>
          )}
          {chips && <div style={{ display: "flex", gap: 6, marginTop: 12 }}>{chips}</div>}
          {children}
        </div>
        <div style={{ height: 6, background: teamBlock(teamId) }} />
      </div>
    </motion.div>
  );
}

/** A plate that stands beside a card. */
const SidePlate = ({ children, w = 520, accentId }) => (
  <motion.div variants={{ hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } }, exit: { opacity: 0, transition: { duration: 0.15 } } }} style={{ width: w, alignSelf: "flex-end", filter: `drop-shadow(${SHADOW})` }}>
    <div style={{ background: PLATE, boxShadow: EDGE, clipPath: CUT(22), padding: "22px 30px 26px", borderLeft: `6px solid ${shades(accentId).base}` }}>{children}</div>
  </motion.div>
);

const StatBox = ({ k, v, color }) => (
  <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "rgba(255,255,255,.05)" }}>
    <div style={{ ...caps, fontWeight: 800, fontSize: 44, lineHeight: 1, color: color || "#fff" }}>{v}</div>
    <div style={{ ...caps, fontWeight: 600, fontSize: 16, letterSpacing: 3, color: C.muted, marginTop: 4 }}>{k}</div>
  </div>
);

/* ------------------------------------ scenes ------------------------------------ */

function SquadRow({ p, i, teamId, big }) {
  return (
    <motion.div variants={slide(-40)} style={{ display: "flex", alignItems: "center", gap: 16, height: big ? 70 : 54, borderBottom: `1px solid ${C.line}` }}>
      <span style={{ width: 44, ...caps, fontWeight: 700, fontSize: 30, color: shades(teamId).light, textAlign: "right" }}>{p.jersey_number ?? i + 1}</span>
      <Photo src={p.profile_picture} name={p.players_name} teamId={teamId} w={big ? 56 : 42} h={big ? 56 : 42} round />
      <span style={{ ...caps, fontWeight: 600, fontSize: big ? 38 : 33, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.players_name}</span>
      {p.is_captain && <Badge bg={C.gold} fg="#2b1b00">C</Badge>}
      {p.is_keeper && <Badge bg="#22b8d9" fg="#00262e">WK</Badge>}
    </motion.div>
  );
}
const Badge = ({ children, bg, fg }) => <span style={{ ...caps, fontWeight: 800, fontSize: 19, background: bg, color: fg, padding: "1px 9px", letterSpacing: 1 }}>{children}</span>;

function SquadHeader({ team, tag }) {
  return (
    <motion.div variants={slide(-50)} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
      <Logo team={team} size={72} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...caps, fontWeight: 700, fontSize: 52, lineHeight: 1, whiteSpace: "nowrap" }}>{team.name}</div>
        <Label size={21}>{tag}</Label>
      </div>
    </motion.div>
  );
}

/** Both XIs side by side, or one XI as a grid of photo tiles. */
function SquadsScene({ data, payload }) {
  const shown = payload.teamId ? [teamOfId(data, payload.teamId)] : data.teams;
  const tag = data.tournament ? `${data.tournament.name} · Playing XI` : "Playing XI";
  if (shown.length === 1) {
    const t = shown[0];
    const sq = data.squads[t.id];
    const playing = sq ? sq.playing : [];
    return (
      <Panel accentId={t.id} style={{ left: SIDE, right: SIDE, top: 120 }}>
        <SquadHeader team={t} tag={tag} />
        <Rule2 id={t.id} />
        {playing.length === 0 && <Label size={28}>Squad not announced yet</Label>}
        <motion.div variants={stage(0.1, 0.045)} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px 22px", marginTop: 24 }}>
          {playing.map((p, i) => (
            <motion.div key={p.player_id} variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } }, exit: { opacity: 0 } }} style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,.05)", borderLeft: `4px solid ${shades(t.id).base}`, paddingRight: 12 }}>
              <Photo src={p.profile_picture} name={p.players_name} teamId={t.id} w={104} h={116} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...caps, fontWeight: 700, fontSize: 24, color: shades(t.id).light }}>{p.jersey_number ?? i + 1}</div>
                <Name name={p.players_name} size={36} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {p.is_captain && <Badge bg={C.gold} fg="#2b1b00">C</Badge>}
                  {p.is_keeper && <Badge bg="#22b8d9" fg="#00262e">WK</Badge>}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Panel>
    );
  }
  const [a, b] = shown;
  const list = (t) => {
    const sq = data.squads[t.id];
    const playing = sq ? sq.playing : [];
    return (
      <>
        <SquadHeader team={t} tag="Playing XI" />
        {playing.length === 0 && <Label size={26}>Squad not announced yet</Label>}
        {playing.map((p, i) => (
          <SquadRow key={p.player_id} p={p} i={i} teamId={t.id} />
        ))}
      </>
    );
  };
  return (
    <>
      <Panel key="a" accentId={a.id} style={{ left: SIDE, width: 840, top: 96 }}>
        {list(a)}
      </Panel>
      <Panel key="b" accentId={b.id} from="right" style={{ right: SIDE, width: 840, top: 96 }}>
        {list(b)}
      </Panel>
    </>
  );
}

/** The two teams face to face, split down a diagonal in their colours. */
function PreviewScene({ data, sb }) {
  const [a, b] = data.teams;
  const stageText = data.stage === "group" ? (data.group ? `Group ${data.group}` : "Group stage") : data.stage === "semi" ? "Semi-final" : data.stage === "third_place" ? "Third place" : data.stage === "final" ? "Final" : "";
  const L = "polygon(0 0, 56% 0, 44% 100%, 0 100%)";
  const R = "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)";
  const field = (id) => `linear-gradient(135deg, ${shades(id).dark} 0%, ${shades(id).deep} 100%)`;
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: 140, right: 140, top: 150, height: 600, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      <motion.div variants={wipe("left")} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: field(a.id), clipPath: L }} />
        <div style={{ position: "absolute", inset: 0, background: field(b.id), clipPath: R }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 50% 50%, rgba(255,255,255,.1), transparent 70%)" }} />
      </motion.div>
      <motion.div variants={stage(0.35, 0.12)} style={{ position: "absolute", inset: 0 }}>
        <motion.div variants={rise} style={{ position: "absolute", left: 0, right: 0, top: 34, textAlign: "center" }}>
          <Big size={42} color={C.gold}>{data.tournament ? data.tournament.name : "Match"}</Big>
          <div style={{ marginTop: 4 }}>
            <Label size={26} color={C.soft}>{[stageText, `Match ${sb.matchNo}`].filter(Boolean).join("  ·  ")}</Label>
          </div>
        </motion.div>
        {[a, b].map((t, i) => (
          <motion.div key={t.id} variants={slide(i ? 100 : -100)} style={{ position: "absolute", top: 150, width: "44%", [i ? "right" : "left"]: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <Logo team={t} size={220} />
            <span style={{ ...caps, fontWeight: 800, fontSize: fit(t.name, 76, 14), lineHeight: 1, textAlign: "center", textShadow: "0 6px 24px rgba(0,0,0,.4)" }}>{t.name}</span>
          </motion.div>
        ))}
        <motion.div variants={pop} style={{ position: "absolute", left: "50%", top: 290, width: 130, height: 130, marginLeft: -65, borderRadius: 65, background: C.bg, boxShadow: "0 0 0 5px rgba(255,255,255,.9), 0 12px 30px rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 800, fontSize: 62, fontStyle: "italic" }}>
          VS
        </motion.div>
      </motion.div>
      <motion.div variants={rise} style={{ position: "absolute", left: 0, right: 0, bottom: -76, display: "flex", justifyContent: "center" }}>
        <div style={{ background: PLATE, boxShadow: EDGE, padding: "14px 56px 12px", clipPath: SLANT(18) }}>
          <Label size={28} color={C.soft}>
            {sb.maxOvers} overs a side{data.venue || sb.venue ? `   ·   ${data.venue || sb.venue}` : ""}
          </Label>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** The coin lands on the winner's badge. */
function TossScene({ sb }) {
  const winner = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
  return (
    <Strip tag="The toss" accentId={winner ? winner.id : null} width={1180}>
      <motion.div variants={pop} style={{ padding: "0 8px 0 36px", display: "flex", alignItems: "center" }}>
        <div style={{ padding: 6, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #ffe9a8, #f5b82e 55%, #b9770e)", boxShadow: "0 8px 24px rgba(245,184,46,.35)" }}>{winner ? <Logo team={winner} size={74} plain /> : <Big size={30} color="#5a3a00">Toss</Big>}</div>
      </motion.div>
      <Cell grow style={{ borderLeft: "none", padding: "12px 30px 12px 26px" }}>
        <Big size={58}>{winner ? `${winner.name} won the toss` : "Toss yet to happen"}</Big>
        {winner && <Label size={30} color={C.soft} style={{ marginTop: 6 }}>and elected to {sb.tossDecision === "bat" ? "bat first" : "bowl first"}</Label>}
      </Cell>
      {winner && (
        <Cell dx={30}>
          <Big size={52} color={C.gold} weight={800}>{sb.tossDecision === "bat" ? "BAT" : "BOWL"}</Big>
        </Cell>
      )}
    </Strip>
  );
}

const batLines = (b) => [
  ["4s", b.fours ?? 0],
  ["6s", b.sixes ?? 0],
  ["SR", b.strikeRate ?? "0.00"],
];

function OpenersScene({ ctx }) {
  const { sb, inning, scorecard, person } = ctx;
  const { batting, bowling } = sides(sb, inning);
  const card = findCard(scorecard, inning.inningId);
  const ids = card && card.batting.length ? card.batting.slice(0, 2).map((b) => b.playerId) : inning.currentBatsmen.map((b) => b.playerId);
  const bowlerId = card && card.bowling.length ? card.bowling[0].playerId : inning.currentBowler ? inning.currentBowler.playerId : null;
  const strikerId = (inning.currentBatsmen.find((b) => b.isOnStrike) || {}).playerId;
  const card1 = (id, tag, tid) => {
    const p = person(id);
    return p ? <PlayerCard key={id} name={p.name} photo={p.photo} teamId={tid} tag={tag} number={p.number} note={p.captain ? "Captain" : p.keeper ? "Wicket-keeper" : undefined} /> : null;
  };
  if (ids.length === 0 && !bowlerId)
    return (
      <Strip tag="Openers" width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>Openers to be decided</Big>
        </Cell>
      </Strip>
    );
  return (
    <CardRow>
      {ids.map((id) => card1(id, Number(id) === Number(strikerId) ? "Opener · on strike" : "Opener", batting.id))}
      {bowlerId ? card1(bowlerId, "Opening bowler", bowling.id) : null}
    </CardRow>
  );
}

function BattersScene({ ctx, payload }) {
  const { sb, inning, person } = ctx;
  const { batting } = sides(sb, inning);
  const which = payload.which || "both";
  const list = inning.currentBatsmen.filter((b) => (which === "striker" ? b.isOnStrike : which === "nonStriker" ? !b.isOnStrike : true));
  if (!list.length)
    return (
      <Strip tag="Batting" accentId={batting.id} width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>Batters to come out</Big>
        </Cell>
      </Strip>
    );
  return (
    <CardRow>
      {list.map((b) => {
        const p = person(b.playerId);
        return <PlayerCard key={b.playerId} name={b.name} photo={b.profilePicture} teamId={batting.id} tag={b.isOnStrike ? "On strike" : "Non-striker"} number={p && p.number} big={b.runs ?? 0} bigSub={`(${b.balls ?? 0})`} lines={batLines(b)} />;
      })}
      <SidePlate w={360} accentId={batting.id}>
        <Label size={20}>Partnership</Label>
        <div>
          <Big size={84}>{inning.partnershipRuns || 0}</Big>
        </div>
        <Label size={20} style={{ marginTop: 10 }}>
          {batting.name} {inning.totalRuns}/{inning.wickets}
        </Label>
      </SidePlate>
    </CardRow>
  );
}

function BowlerScene({ ctx }) {
  const { sb, inning, person } = ctx;
  const { bowling } = sides(sb, inning);
  const b = inning.currentBowler;
  const chips = overChips(inning);
  if (!b)
    return (
      <Strip tag="Bowling" accentId={bowling.id} width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>Bowler to be chosen</Big>
        </Cell>
      </Strip>
    );
  const p = person(b.playerId);
  return (
    <CardRow>
      <PlayerCard name={b.name} photo={b.profilePicture} teamId={bowling.id} tag="Bowling" number={p && p.number} big={`${b.wickets}-${b.runsConceded}`} bigSub={`(${b.overs})`} accent={C.gold} />
      <SidePlate w={560} accentId={bowling.id}>
        <div style={{ display: "flex", gap: 10 }}>
          <StatBox k="Overs" v={b.overs} />
          <StatBox k="Maidens" v={b.maidens} />
          <StatBox k="Runs" v={b.runsConceded} />
          <StatBox k="Wickets" v={b.wickets} color={C.gold} />
          <StatBox k="Econ" v={b.economy ?? "0.00"} />
        </div>
        <motion.div variants={stage(0.1, 0.06)} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}>
          <Label size={20}>This over</Label>
          {chips.length === 0 && <Label size={22}>-</Label>}
          {chips.map((c, i) => (
            <BallChip key={i} c={c} size={44} />
          ))}
        </motion.div>
      </SidePlate>
    </CardRow>
  );
}

/** Any player of the match: the operator picks them, or asks for whoever is batting / bowling now. */
function PlayerScene({ ctx, payload }) {
  const { sb, inning, person } = ctx;
  let id = payload.playerId;
  if (payload.role === "striker") id = (inning.currentBatsmen.find((b) => b.isOnStrike) || {}).playerId;
  if (payload.role === "nonStriker") id = (inning.currentBatsmen.find((b) => !b.isOnStrike) || {}).playerId;
  if (payload.role === "bowler") id = inning.currentBowler && inning.currentBowler.playerId;
  const p = id ? person(id) : null;
  if (!p)
    return (
      <Strip tag="Player" width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>Player not available</Big>
        </Cell>
      </Strip>
    );
  const fig = matchFigures(ctx, id);
  const team = sb.teams.team1.id === p.teamId ? sb.teams.team1 : sb.teams.team2;
  return (
    <CardRow>
      <PlayerCard name={p.name} photo={p.photo} teamId={p.teamId} tag={team.name} number={p.number} note={p.captain ? "Captain" : p.keeper ? "Wicket-keeper" : undefined} />
      <SidePlate w={560} accentId={p.teamId}>
        <Label size={20} color={C.gold}>This match</Label>
        <div style={{ marginTop: 12 }}>
          <Label size={18}>Batting</Label>
          {fig.bat ? (
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <StatBox k="Runs" v={fig.bat.runs} />
              <StatBox k="Balls" v={fig.bat.balls} />
              <StatBox k="4s" v={fig.bat.fours} />
              <StatBox k="6s" v={fig.bat.sixes} />
              <StatBox k="SR" v={fig.bat.strikeRate} />
            </div>
          ) : (
            <div style={{ marginTop: 6 }}><Big size={30} color={C.soft}>Yet to bat</Big></div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <Label size={18}>Bowling</Label>
          {fig.bowl ? (
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <StatBox k="Overs" v={fig.bowl.overs} />
              <StatBox k="Maidens" v={fig.bowl.maidens} />
              <StatBox k="Runs" v={fig.bowl.runs} />
              <StatBox k="Wkts" v={fig.bowl.wickets} color={C.gold} />
              <StatBox k="Econ" v={fig.bowl.economy ?? "-"} />
            </div>
          ) : (
            <div style={{ marginTop: 6 }}><Big size={30} color={C.soft}>Yet to bowl</Big></div>
          )}
        </div>
      </SidePlate>
    </CardRow>
  );
}

/** The over that was just bowled: every ball, the runs, the bowler and the score after it. */
function OverSummaryScene({ ctx }) {
  const { sb, inning, scorecard, person } = ctx;
  const { batting, bowling } = sides(sb, inning);
  const chips = overChips(inning);
  const summary = inning.currentOverSummary || [];
  const runsInOver = summary.reduce((n, b) => n + Number(b.runs || 0) + Number(b.extraRuns || 0), 0);
  const wicketsInOver = summary.filter((b) => b.wicket).length;
  const card = findCard(scorecard, inning.inningId);
  const lastId = (card && card.lastOverBowlerId) || (inning.currentBowler && inning.currentBowler.playerId);
  const stats = card && card.bowling.find((x) => Number(x.playerId) === Number(lastId));
  const p = lastId ? person(lastId) : null;
  const overNo = Math.max(1, Math.ceil((inning.ballsBowled || 0) / 6));
  return (
    <Strip tag={`End of over ${overNo}`} accentId={bowling.id} width={1560}>
      <Cell style={{ borderLeft: "none" }}>
        <Label size={20}>This over</Label>
        <Big size={78}>
          {runsInOver}
          <span style={{ fontSize: 30, color: C.muted, fontWeight: 600 }}> run{runsInOver === 1 ? "" : "s"}{wicketsInOver ? ` · ${wicketsInOver} wkt` : ""}</span>
        </Big>
      </Cell>
      <Cell grow>
        <motion.div variants={stage(0.05, 0.07)} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {chips.map((c, i) => (
            <BallChip key={i} c={c} size={58} />
          ))}
        </motion.div>
      </Cell>
      {p && (
        <Cell>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Photo src={p.photo} name={p.name} teamId={bowling.id} w={84} h={84} round />
            <div>
              <Name name={p.name} size={38} />
              {stats && <Label size={26} color={C.gold} style={{ marginTop: 6, display: "block" }}>{stats.overs}-{stats.maidens}-{stats.runs}-{stats.wickets}</Label>}
            </div>
          </div>
        </Cell>
      )}
      <Cell>
        <Label size={20}>{batting.name}</Label>
        <Big size={64}>
          {inning.totalRuns}-{inning.wickets}
        </Big>
      </Cell>
    </Strip>
  );
}

function PartnershipScene({ ctx }) {
  const { sb, inning } = ctx;
  const { batting } = sides(sb, inning);
  const [a, b] = inning.currentBatsmen;
  const total = (Number(a && a.runs) || 0) + (Number(b && b.runs) || 0) || 1;
  const Side = ({ x, flip }) => (
    <Cell grow dx={flip ? 30 : -30} style={{ borderLeft: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: flip ? "row-reverse" : "row", textAlign: flip ? "right" : "left" }}>
        <Photo src={x.profilePicture} name={x.name} teamId={batting.id} w={96} h={96} round />
        <div>
          <Name name={x.name} size={42} align={flip ? "right" : "left"} />
          <div style={{ marginTop: 6 }}>
            <Big size={50}>{x.runs}</Big> <Label size={26}>({x.balls})</Label>
          </div>
        </div>
      </div>
    </Cell>
  );
  return (
    <Strip tag="Partnership" accentId={batting.id} width={1560}>
      {a && <Side x={a} />}
      <Cell style={{ alignItems: "center", minWidth: 340 }}>
        <motion.div variants={pop}>
          <Big size={104} weight={800}>{inning.partnershipRuns || 0}</Big>
        </motion.div>
        <Label size={20}>runs together</Label>
        <div style={{ display: "flex", width: 280, height: 6, marginTop: 10, background: "rgba(255,255,255,.14)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${((Number(a && a.runs) || 0) / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.6, ease: EASE }} style={{ background: shades(batting.id).light }} />
        </div>
      </Cell>
      {b && <Side x={b} flip />}
    </Strip>
  );
}

function LastWicketScene({ ctx }) {
  const { sb, inning, person } = ctx;
  const { batting } = sides(sb, inning);
  const w = inning.lastWicket;
  const falls = inning.wicketFalls || [];
  const fall = falls[falls.length - 1];
  if (!w)
    return (
      <Strip tag="Wicket" width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>No wicket has fallen</Big>
        </Cell>
      </Strip>
    );
  const p = person(w.playerOutId);
  const fig = matchFigures(ctx, w.playerOutId);
  return (
    <CardRow>
      <PlayerCard name={w.playerOutName} photo={p && p.photo} teamId={batting.id} tag="Wicket" tagColor={C.wicket} number={p && p.number} big={fig.bat ? fig.bat.runs : "-"} bigSub={fig.bat ? `(${fig.bat.balls})` : ""} lines={fig.bat ? batLines(fig.bat) : []} />
      <SidePlate w={560} accentId={batting.id}>
        <Label size={20} color={C.wicket}>Out</Label>
        <div style={{ marginTop: 6 }}>
          <Big size={52}>{fall && fall.wicketType ? fall.wicketType : w.description || "out"}</Big>
        </div>
        {fall && (fall.bowlerName || fall.fielderName) && (
          <Label size={28} color={C.soft} style={{ display: "block", marginTop: 8 }}>
            {fall.fielderName && fall.fielderName !== fall.bowlerName ? `c ${fall.fielderName} ` : ""}
            {fall.bowlerName ? `b ${fall.bowlerName}` : ""}
          </Label>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <StatBox k="Score" v={`${inning.totalRuns}-${inning.wickets}`} />
          <StatBox k="Wicket" v={falls.length || inning.wickets} />
          {w.over && <StatBox k="Over" v={w.over} />}
        </div>
      </SidePlate>
    </CardRow>
  );
}

/** The chase equation, dropped in from the top of the picture. */
function TargetScene({ ctx }) {
  const { sb, inning } = ctx;
  const { batting } = sides(sb, inning);
  const need = runsNeeded(inning);
  const chase = inning.inningsNumber > 1 && need !== null;
  const left = ballsLeft(sb, inning);
  const pct = chase ? Math.min(100, (inning.totalRuns / inning.targetScore) * 100) : 0;
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", top: 48, left: 260, right: 260, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      <motion.div variants={wipe("top")}>
        <div style={{ position: "relative", background: PLATE, boxShadow: EDGE, clipPath: CUT(24), display: "flex", alignItems: "stretch", minHeight: 150 }}>
          <div style={{ width: 8, background: teamBlock(batting.id) }} />
          <motion.div variants={stage(0.25, 0.07)} style={{ display: "flex", alignItems: "stretch", flex: 1 }}>
            {chase ? (
              <>
                <Cell style={{ alignItems: "center", borderLeft: "none", padding: "12px 46px" }}>
                  <Label size={22}>Target</Label>
                  <Big size={92} color={C.gold} weight={800}>{inning.targetScore}</Big>
                </Cell>
                <Cell grow style={{ alignItems: "center", textAlign: "center" }}>
                  <Big size={60}>{need === 0 ? `${batting.name} have done it` : `${batting.name} need ${need} from ${left}`}</Big>
                  <Label size={28} color={C.soft} style={{ marginTop: 6 }}>
                    {inning.requiredRunRate ? `Required rate ${Number(inning.requiredRunRate).toFixed(2)}` : ""}
                    {inning.runRate ? `   ·   Current ${Number(inning.runRate).toFixed(2)}` : ""}
                  </Label>
                  <div style={{ width: "76%", height: 6, marginTop: 14, background: "rgba(255,255,255,.14)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.6, ease: EASE }} style={{ height: "100%", background: C.gold }} />
                  </div>
                </Cell>
              </>
            ) : (
              <Cell grow style={{ alignItems: "center", textAlign: "center", borderLeft: "none" }}>
                <Label size={24} color={C.gold}>
                  {batting.name} · run rate {inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00"}
                </Label>
                <Big size={68}>
                  {inning.totalRuns}-{inning.wickets} after {inning.overs} overs
                </Big>
              </Cell>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------- tables -------- */

const HeadCell = ({ children, left }) => <span style={{ ...caps, fontWeight: 600, fontSize: 19, letterSpacing: 3, color: C.muted, textAlign: left ? "left" : "right" }}>{children}</span>;
const TRow = ({ cols, children, hi, head }) => (
  <motion.div variants={head ? rise : slide(-40)} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", columnGap: 12, height: head ? 40 : 50, borderBottom: `1px solid ${head ? C.line : "rgba(255,255,255,.07)"}`, background: hi ? "linear-gradient(90deg, rgba(255,194,26,.14), transparent)" : "transparent" }}>
    {children}
  </motion.div>
);
const TD = ({ children, left, bold, color, size = 31 }) => <span style={{ ...caps, fontWeight: bold ? 700 : 500, fontSize: size, textAlign: left ? "left" : "right", color: color || "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.5 }}>{children}</span>;

function ScorecardScene({ ctx, payload }) {
  const { data, scorecard, photoOf } = ctx;
  if (!scorecard) return null; // still loading: show nothing rather than a wrong message
  const inn = scorecard.innings[(payload.innings || 1) - 1];
  if (!inn) {
    return (
      <Panel style={{ left: 400, right: 400, top: 200 }}>
        <Heading title="Scorecard" />
        <Label size={28}>This innings has not started.</Label>
      </Panel>
    );
  }
  const team = teamOfId(data, inn.teamId);
  return (
    <Panel accentId={team.id} style={{ left: 120, right: 120, top: 60 }}>
      <motion.div variants={slide(-50)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo team={team} size={78} />
          <div>
            <div style={{ ...caps, fontWeight: 700, fontSize: 58, lineHeight: 1 }}>{team.name}</div>
            <Label size={22}>{inn.inningsNumber === 1 ? "1st innings" : "2nd innings"}</Label>
          </div>
        </div>
        <span style={{ ...caps, fontWeight: 800, fontSize: 88, lineHeight: 1 }}>
          {inn.runs}-{inn.wickets} <span style={{ fontSize: 34, color: C.muted, fontWeight: 600 }}>({inn.overs} ov)</span>
        </span>
      </motion.div>
      <Rule2 id={team.id} />
      <div style={{ display: "flex", gap: 56, marginTop: 20 }}>
        <div style={{ flex: 1.4 }}>
          <TRow head cols="1fr 70px 70px 54px 54px 86px">
            <HeadCell left>Batter</HeadCell>
            <HeadCell>R</HeadCell>
            <HeadCell>B</HeadCell>
            <HeadCell>4s</HeadCell>
            <HeadCell>6s</HeadCell>
            <HeadCell>SR</HeadCell>
          </TRow>
          <motion.div variants={stage(0.05, 0.04)}>
            {inn.batting.slice(0, 11).map((b) => (
              <TRow key={b.playerId} cols="1fr 70px 70px 54px 54px 86px" hi={b.status === "not out"}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <Photo src={photoOf(b.playerId)} name={b.name} teamId={team.id} w={38} h={38} round />
                  <TD left bold>{b.name}{b.status === "not out" ? <span style={{ color: C.brand }}> *</span> : ""}</TD>
                </span>
                <TD bold>{b.runs}</TD>
                <TD color={C.muted}>{b.balls}</TD>
                <TD color={C.muted}>{b.fours}</TD>
                <TD color={C.muted}>{b.sixes}</TD>
                <TD color={C.muted} size={26}>{b.strikeRate}</TD>
              </TRow>
            ))}
          </motion.div>
        </div>
        <div style={{ flex: 1, alignSelf: "flex-start" }}>
          <TRow head cols="1fr 64px 44px 64px 50px">
            <HeadCell left>Bowler</HeadCell>
            <HeadCell>O</HeadCell>
            <HeadCell>M</HeadCell>
            <HeadCell>R</HeadCell>
            <HeadCell>W</HeadCell>
          </TRow>
          <motion.div variants={stage(0.2, 0.04)}>
            {inn.bowling.slice(0, 8).map((b) => (
              <TRow key={b.playerId} cols="1fr 64px 44px 64px 50px">
                <TD left bold>{b.name}</TD>
                <TD color={C.muted}>{b.overs}</TD>
                <TD color={C.muted}>{b.maidens}</TD>
                <TD color={C.muted}>{b.runs}</TD>
                <TD bold color={C.gold}>{b.wickets}</TD>
              </TRow>
            ))}
          </motion.div>
        </div>
      </div>
      <motion.div variants={rise} style={{ marginTop: 14 }}>
        <Label size={24}>
          Extras {inn.extras.total} (w {inn.extras.wides}, nb {inn.extras.noBalls}, b {inn.extras.byes}, lb {inn.extras.legByes})
        </Label>
      </motion.div>
    </Panel>
  );
}

/** The best two batters and bowlers across both innings. */
function topPerformers(scorecard) {
  if (!scorecard) return { bats: [], bowls: [] };
  const bats = scorecard.innings.flatMap((i) => i.batting.map((b) => ({ ...b, teamId: i.teamId }))).sort((a, b) => b.runs - a.runs).slice(0, 2);
  const bowls = scorecard.innings
    .flatMap((i) => i.bowling)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
    .slice(0, 2);
  return { bats, bowls };
}

function SummaryScene({ ctx }) {
  const { sb, scorecard, photoOf, person } = ctx;
  const { bats, bowls } = topPerformers(scorecard);
  const done = sb.status === "completed";
  if (!bats.length && !bowls.length)
    return (
      <Strip tag="Top performers" width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>Nothing to show yet</Big>
        </Cell>
      </Strip>
    );
  return (
    <CardRow>
      {bats.map((b) => {
        const p = person(b.playerId);
        return <PlayerCard key={`b${b.playerId}`} name={b.name} photo={photoOf(b.playerId)} teamId={p ? p.teamId : b.teamId} tag={done ? "Top batter" : "Best bat"} number={p && p.number} big={b.runs} bigSub={`(${b.balls})`} lines={batLines(b)} />;
      })}
      {bowls.map((b) => {
        const p = person(b.playerId);
        return <PlayerCard key={`w${b.playerId}`} name={b.name} photo={photoOf(b.playerId)} teamId={p ? p.teamId : b.teamId} tag={done ? "Top bowler" : "Best ball"} number={p && p.number} big={`${b.wickets}-${b.runs}`} bigSub={`(${b.overs})`} accent={C.gold} lines={[["Econ", b.economy ?? "-"]]} />;
      })}
    </CardRow>
  );
}

function ResultScene({ ctx }) {
  const { sb } = ctx;
  const r = sb.matchResult;
  const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
  const teamOf = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
  const winnerId = r && r.winnerTeamId;
  const winner = winnerId ? (Number(winnerId) === Number(sb.teams.team1.id) ? sb.teams.team1 : sb.teams.team2) : null;
  const so = sb.superOver && sb.superOver.phase === "settled" ? sb.superOver : null;
  const soLine = so ? so.rounds.map((rd) => `Super over${so.rounds.length > 1 ? ` ${rd.round}` : ""}: ${rd.innings.map((i) => `${teamCode(i.teamName)} ${i.runs}/${i.wickets}`).join("  ·  ")}`).join("   |   ") : null;
  const headline = sb.status !== "completed" ? "Match in progress" : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : so ? `${r.winnerTeamName} won the super over` : `${r.winnerTeamName} won ${margin}`;
  return (
    <Panel accentId={winner ? winner.id : null} style={{ left: 300, right: 300, top: 150 }}>
      <Heading title={sb.status === "completed" ? "Full time" : "Match in progress"} id={winner ? winner.id : null} />
      {sb.innings.map((i) => {
        const t = teamOf(i);
        const won = winnerId && Number(winnerId) === Number(t.id);
        return (
          <motion.div key={i.inningId} variants={slide(-70)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 118, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Logo team={t} size={84} />
              <span style={{ ...caps, fontWeight: 700, fontSize: 56 }}>{t.name}</span>
            </div>
            <span style={{ ...caps, fontWeight: 800, fontSize: 84, color: won ? "#fff" : C.soft }}>
              {i.totalRuns}-{i.wickets} <span style={{ fontSize: 32, color: C.muted, fontWeight: 600 }}>({i.overs})</span>
            </span>
          </motion.div>
        );
      })}
      <motion.div variants={rise} style={{ marginTop: 30, padding: "20px 0", textAlign: "center", background: winner ? `linear-gradient(90deg, transparent, ${shades(winner.id).base}66, transparent)` : "rgba(255,255,255,.06)" }}>
        <Big size={68} weight={800}>{headline}</Big>
        {soLine && <div style={{ marginTop: 8 }}><Label size={28} color={C.soft}>{soLine}</Label></div>}
      </motion.div>
    </Panel>
  );
}

function PotmScene({ ctx }) {
  const { data, scorecard, person } = ctx;
  const p = data.playerOfMatch || data.suggestedPlayerOfMatch;
  if (!p)
    return (
      <Strip tag="Player of the match" width={700}>
        <Cell grow style={{ borderLeft: "none" }}>
          <Big>To be announced</Big>
        </Cell>
      </Strip>
    );
  const info = person(p.id);
  const teamId = p.teamId;
  const bat = scorecard && scorecard.innings.flatMap((i) => i.batting).find((b) => b.playerId === p.id);
  const bowl = scorecard && scorecard.innings.flatMap((i) => i.bowling).find((b) => b.playerId === p.id);
  return (
    <CardRow>
      <PlayerCard name={p.name} photo={p.photo} teamId={teamId} tag="Player of the match" tagColor={C.gold} number={info && info.number} w={340} photoH={340} note={teamOfId(data, teamId).name} />
      <SidePlate w={540} accentId={teamId}>
        {bat && (
          <>
            <Label size={20}>Batting</Label>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <StatBox k="Runs" v={bat.runs} />
              <StatBox k="Balls" v={bat.balls} />
              <StatBox k="4s" v={bat.fours} />
              <StatBox k="6s" v={bat.sixes} />
            </div>
          </>
        )}
        {bowl && bowl.legalBalls > 0 && (
          <div style={{ marginTop: bat ? 16 : 0 }}>
            <Label size={20}>Bowling</Label>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <StatBox k="Overs" v={bowl.overs} />
              <StatBox k="Runs" v={bowl.runs} />
              <StatBox k="Wkts" v={bowl.wickets} color={C.gold} />
              <StatBox k="Econ" v={bowl.economy ?? "-"} />
            </div>
          </div>
        )}
        {!bat && !(bowl && bowl.legalBalls > 0) && <Big size={34} color={C.soft}>{teamOfId(data, teamId).name}</Big>}
      </SidePlate>
    </CardRow>
  );
}

function RankingsScene({ rankings }) {
  const rows = (rankings || []).slice(0, 8);
  const cols = "60px 1fr 70px 70px 100px";
  return (
    <Panel from="right" style={{ right: SIDE, width: 880, top: 100 }}>
      <Heading title="Top teams" sub="Association ranking" />
      <TRow head cols={cols}>
        <HeadCell left>#</HeadCell>
        <HeadCell left>Team</HeadCell>
        <HeadCell>P</HeadCell>
        <HeadCell>W</HeadCell>
        <HeadCell>Pts</HeadCell>
      </TRow>
      <motion.div variants={stage(0.05, 0.06)}>
        {rows.map((r, i) => (
          <TRow key={r.teamId} cols={cols} hi={i === 0}>
            <TD left bold color={i < 3 ? C.gold : C.muted}>{r.rank}</TD>
            <span style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <Logo team={{ id: r.teamId, name: r.name, logo: r.logo }} size={40} plain />
              <TD left bold>{r.name}</TD>
            </span>
            <TD color={C.muted}>{r.played}</TD>
            <TD color={C.muted}>{r.won}</TD>
            <TD bold>{r.points}</TD>
          </TRow>
        ))}
      </motion.div>
      {rows.length === 0 && <Label size={28}>No ranking yet</Label>}
    </Panel>
  );
}

function MessageScene({ payload }) {
  return (
    <Strip tag="Spark" width={1400}>
      <Cell grow style={{ borderLeft: "none", padding: "14px 34px" }}>
        <motion.div variants={rise}>
          <Big size={fit(payload.text, 66, 38)} weight={700}>{payload.text}</Big>
        </motion.div>
        {payload.subtext && (
          <motion.div variants={rise} style={{ marginTop: 8 }}>
            <Label size={30} color={C.soft}>{payload.subtext}</Label>
          </motion.div>
        )}
      </Cell>
    </Strip>
  );
}

/** Always on: the tournament and the LIVE tag in the top-left corner. */
export function CornerBug({ data, sb }) {
  const name = data && data.tournament ? data.tournament.name : sb ? `${sb.teams.team1.name} v ${sb.teams.team2.name}` : "";
  const live = sb && sb.status !== "completed";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: SIDE, top: 48, fontFamily: FONT, color: "#fff", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.45))" }}>
      <motion.div variants={wipe("left")}>
        <div style={{ display: "flex", alignItems: "stretch", height: 54, background: PLATE, boxShadow: EDGE }}>
          <div style={{ width: 8, background: C.brand }} />
          <motion.div variants={stage(0.2, 0.08)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 28px 0 22px" }}>
            {live && (
              <motion.span variants={pop} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.live, padding: "3px 12px 2px", ...caps, fontWeight: 800, fontSize: 21, letterSpacing: 3 }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: "#fff", animation: "bc-pulse 1.4s ease-in-out infinite" }} />
                Live
              </motion.span>
            )}
            <motion.span variants={slide(-20)} style={{ ...caps, fontWeight: 700, fontSize: 28, letterSpacing: 2.5, whiteSpace: "nowrap" }}>
              {name}
            </motion.span>
            {sb && (
              <motion.span variants={slide(-20)} style={{ ...caps, fontWeight: 500, fontSize: 22, letterSpacing: 2.5, color: C.muted, whiteSpace: "nowrap" }}>
                Match {sb.matchNo}
              </motion.span>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * @param state     { scene, payload }
 * @param data      /overlay/:matchId  (teams, squads, player of the match ...)
 * @param sb        live scoreboard,  inning = current innings of it
 * @param scorecard full scorecard (only needed by some scenes)
 */
export default function SceneLayer({ state, data, sb, inning, scorecard, rankings }) {
  const scene = state ? state.scene : "none";
  const payload = (state && state.payload) || {};
  let node = null;
  if (data && sb && inning) {
    const ctx = { sb, inning, data, scorecard, photoOf: photoLookup(sb, data), person: personLookup(sb, data) };
    switch (scene) {
      case "preview": node = <PreviewScene key="preview" data={data} sb={sb} />; break;
      case "over_summary": node = <OverSummaryScene key={`over${inning.ballsBowled}`} ctx={ctx} />; break;
      case "squads": node = <motion.div key={`squads${payload.teamId || ""}`} initial="hidden" animate="show" exit="exit" variants={holder}><SquadsScene data={data} payload={payload} /></motion.div>; break;
      case "toss": node = <TossScene key="toss" sb={sb} />; break;
      case "openers": node = <OpenersScene key="openers" ctx={ctx} />; break;
      case "batters": node = <BattersScene key={`batters${payload.which}`} ctx={ctx} payload={payload} />; break;
      case "bowler": node = <BowlerScene key="bowler" ctx={ctx} />; break;
      case "player": node = <PlayerScene key={`player${payload.playerId || payload.role}`} ctx={ctx} payload={payload} />; break;
      case "partnership": node = <PartnershipScene key="partnership" ctx={ctx} />; break;
      case "last_wicket": node = <LastWicketScene key="last_wicket" ctx={ctx} />; break;
      case "scorecard": node = <ScorecardScene key={`scorecard${payload.innings}`} ctx={ctx} payload={payload} />; break;
      case "target": node = <TargetScene key="target" ctx={ctx} />; break;
      case "summary": node = <SummaryScene key="summary" ctx={ctx} />; break;
      case "result": node = <ResultScene key="result" ctx={ctx} />; break;
      case "potm": node = <PotmScene key="potm" ctx={ctx} />; break;
      case "rankings": node = <RankingsScene key="rankings" rankings={rankings} />; break;
      case "message": node = <MessageScene key={`message${payload.text}`} payload={payload} />; break;
      default: node = null;
    }
  }
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

/** Scenes that use the top of the picture, so the corner tag steps aside while they are on air. */
export const USES_TOP = ["squads", "preview", "scorecard", "result", "rankings", "target"];

/** Scenes that need the full scorecard / the team ranking loaded. */
export const NEEDS_SCORECARD = ["openers", "scorecard", "summary", "potm", "over_summary", "player", "last_wicket"];
export const NEEDS_RANKINGS = ["rankings"];

