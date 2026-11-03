import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, runsNeeded, sides, teamCode, teamColor } from "../Scoring/scoreUtils";
import { Backdrop, C, caps, Divider, draw, drop, EASE, fit, FONT, graphic, holder, Letters, Logo, Photo, photoLookup, PLATE, pop, rise, RunningLines, SHADOW, slideIn, SLANT, SLANT_L, SPARK, stagger, Sweep, Tag, TeamSlab, teamGrad } from "./bc";

// The extra graphics the operator can put on air. Like a TV production they live in different parts of the frame:
//   centre panels   preview, scorecard, top performers, result
//   side panels     squads (left and right), batters / openers / fall of wicket (left), bowler / player of the match / rankings (right)
//   lower thirds    toss, end of over, partnership, message (just above the score bar)
//   top banner      target / chase equation
// Each one builds from layers (spark, team colour, plate) that wipe in from its own edge, then the content cascades.

const CHIP = { dot: "#2a3170", run: "#ffffff", four: "linear-gradient(160deg,#3fb4ff,#1f6feb)", six: "linear-gradient(160deg,#e040fb,#7c3aed)", wicket: "linear-gradient(160deg,#ff5a5a,#c81e1e)", extra: "#ffb21a" };
const CHIP_TEXT = { dot: "#98a0d2", run: "#0c1040", extra: "#3b2200" };
const CUT = (px = 36) => `polygon(${px}px 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%, 0 ${px}px)`;

/* --------------------------------- frames --------------------------------- */

/** Title row of a panel: big words, a spark line drawing under them. */
const Heading = ({ title, sub, right }) => (
  <motion.div variants={slideIn(-40)} style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 22, paddingBottom: 16 }}>
    {title && <span style={{ ...caps, fontWeight: 800, fontSize: 60, lineHeight: 0.95, letterSpacing: 3, fontStyle: "italic" }}>{title}</span>}
    {sub && <span style={{ ...caps, fontWeight: 600, fontSize: 28, color: C.muted, letterSpacing: 3, paddingBottom: 4 }}>{sub}</span>}
    {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    <motion.div variants={draw(0.25)} style={{ position: "absolute", left: 0, bottom: 0, width: 220, height: 5, background: SPARK }} />
    <motion.div variants={draw(0.4)} style={{ position: "absolute", left: 230, right: 0, bottom: 1, height: 2, background: "rgba(255,255,255,.12)" }} />
  </motion.div>
);

/** A big panel in the middle of the picture. */
function CenterPanel({ children, wide, accentId, top = 80, bottom = 250 }) {
  const team = accentId != null ? teamGrad(accentId) : "linear-gradient(110deg, #0e7091, #22cdef)";
  const side = wide ? 150 : 300;
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: side, right: side, top, maxHeight: 1080 - top - bottom, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      <Backdrop from="left" colors={[SPARK, team, PLATE]} offset={14} clip={CUT()} />
      <div style={{ position: "relative", clipPath: CUT(), overflow: "hidden" }}>
        <Sweep every={8} delay={1.2} opacity={0.1} />
        <motion.div variants={graphic(0.045, 0.38)} style={{ position: "relative", padding: "34px 60px 36px" }}>
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}

/** A panel pinned to the left or right edge of the picture. */
function SidePanel({ children, side = "left", accentId, width = 720, top, bottom, label, nested }) {
  const team = accentId != null ? teamGrad(accentId) : "linear-gradient(110deg, #0e7091, #22cdef)";
  const clip = side === "left" ? SLANT(40) : SLANT_L(40);
  const pos = side === "left" ? { left: 64 } : { right: 64 };
  return (
    <motion.div {...(nested ? {} : { initial: "hidden", animate: "show", exit: "exit" })} variants={holder} style={{ position: "absolute", ...pos, width, top, bottom, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      {label && (
        <motion.div variants={stagger(0, 0.3)} style={{ display: "flex", justifyContent: side === "left" ? "flex-start" : "flex-end", marginBottom: 6, padding: "0 10px" }}>
          <Tag color={accentId != null ? teamGrad(accentId) : undefined}>{label}</Tag>
        </motion.div>
      )}
      <div style={{ position: "relative" }}>
        <Backdrop from={side} colors={[SPARK, team, PLATE]} offset={12} clip={clip} />
        <div style={{ position: "relative", clipPath: clip, overflow: "hidden" }}>
          <Sweep every={8} delay={1.1} opacity={0.1} />
          <motion.div variants={graphic(0.06, 0.38)} style={{ position: "relative", padding: side === "left" ? "26px 70px 28px 34px" : "26px 34px 28px 70px" }}>
            {children}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/** A strip just above the score bar. */
function LowerThird({ children, label, accentId, left = 200, right = 200 }) {
  const team = accentId != null ? teamGrad(accentId) : "linear-gradient(110deg, #0e7091, #22cdef)";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left, right, bottom: 248, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      {label && (
        <motion.div variants={stagger(0, 0.3)} style={{ marginBottom: 6, paddingLeft: 10 }}>
          <Tag color={accentId != null ? teamGrad(accentId) : undefined}>{label}</Tag>
        </motion.div>
      )}
      <div style={{ position: "relative", minHeight: 132 }}>
        <Backdrop from="left" colors={[SPARK, team, PLATE]} offset={10} clip={SLANT(34)} />
        <div style={{ position: "relative", clipPath: SLANT(34), overflow: "hidden" }}>
          <Sweep every={7} delay={1} opacity={0.12} />
          <motion.div variants={graphic(0.07, 0.36)} style={{ position: "relative", display: "flex", alignItems: "stretch", minHeight: 132, paddingRight: 40 }}>
            {children}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/** A banner that drops in from the top of the picture. */
function TopBanner({ children, accentId, width = 1440 }) {
  const team = accentId != null ? teamGrad(accentId) : "linear-gradient(110deg, #0e7091, #22cdef)";
  const clip = "polygon(0 0, 100% 0, calc(100% - 40px) 100%, 40px 100%)";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", top: 40, left: (1920 - width) / 2, width, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      <Backdrop from="top" colors={[SPARK, team, PLATE]} offset={9} clip={clip} />
      <div style={{ position: "relative", clipPath: clip, overflow: "hidden" }}>
        <Sweep every={7} delay={1} opacity={0.12} />
        <motion.div variants={graphic(0.07, 0.36)} style={{ position: "relative", display: "flex", alignItems: "stretch", minHeight: 150, padding: "20px 70px 18px" }}>
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}

const Cell = ({ children, grow, style, dx = -30 }) => (
  <motion.div variants={slideIn(dx)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 34px", flex: grow ? 1 : "none", minWidth: 0, ...style }}>
    {children}
  </motion.div>
);
const Big = ({ children, size = 54, color, italic }) => <span style={{ ...caps, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: 1.5, color: color || "#fff", fontStyle: italic ? "italic" : "normal" }}>{children}</span>;
const Small = ({ children, color = C.muted, size = 26 }) => <span style={{ ...caps, fontWeight: 600, fontSize: size, color, letterSpacing: 2 }}>{children}</span>;
const Sep = () => (
  <motion.div variants={rise} style={{ display: "flex" }}>
    <Divider />
  </motion.div>
);

const teamOfId = (data, id) => data.teams.find((t) => Number(t.id) === Number(id)) || { id, name: `Team ${id}` };
const findCard = (scorecard, inningId) => (scorecard ? scorecard.innings.find((i) => i.inningId === inningId) : null);

const Badge = ({ children, bg, color = C.ink }) => <span style={{ ...caps, fontWeight: 800, fontSize: 21, background: bg, color, borderRadius: 4, padding: "1px 10px", letterSpacing: 1 }}>{children}</span>;

const Ball = ({ c, size = 54 }) => (
  <motion.span variants={pop} style={{ minWidth: size, height: size, borderRadius: size / 2, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", background: CHIP[c.kind] || CHIP.run, color: CHIP_TEXT[c.kind] || "#fff", boxShadow: c.kind === "dot" ? "inset 0 0 0 2px rgba(255,255,255,.2)" : "0 6px 16px rgba(0,0,0,.35)", ...caps, fontWeight: 800, fontSize: c.text.length > 2 ? size * 0.36 : size * 0.52 }}>
    {c.text}
  </motion.span>
);

/** A player as a broadcast card: photo, name, a role line and a big number on the right. */
const PlayerCard = ({ name, photo, role, ring, big, bigSub, highlight }) => (
  <motion.div variants={slideIn(-50)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, padding: "14px 22px", marginBottom: 12, background: highlight ? "linear-gradient(90deg, rgba(255,106,26,.28), rgba(255,106,26,.04))" : "rgba(255,255,255,.05)", clipPath: SLANT(18), overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: highlight ? SPARK : ring }} />
    <Photo src={photo} name={name} size={88} ring={ring} ringWidth={4} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <Small size={20} color={highlight ? C.gold : C.muted}>{role}</Small>
      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <Big size={44}>{name}</Big>
      </div>
    </div>
    {big !== undefined && (
      <div style={{ textAlign: "right", paddingRight: 16 }}>
        <Big size={64}>{big}</Big>
        {bigSub && (
          <div>
            <Small size={22}>{bigSub}</Small>
          </div>
        )}
      </div>
    )}
  </motion.div>
);

/* --------------------------------- the scenes --------------------------------- */

function SquadList({ team, squad, big }) {
  const playing = squad ? squad.playing : [];
  const reserves = squad ? squad.reserves : [];
  const row = big ? 50 : 50;
  return (
    <>
      <motion.div variants={slideIn(-80)} style={{ marginBottom: 14 }}>
        <TeamSlab team={team} size={big ? 52 : 48} height={big ? 76 : 72} />
      </motion.div>
      {playing.length === 0 && <Small>Squad not announced yet</Small>}
      {playing.map((p, i) => (
        <motion.div key={p.player_id} variants={slideIn(-60)} style={{ display: "flex", alignItems: "center", gap: 16, height: row, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <span style={{ width: 46, ...caps, fontWeight: 800, fontSize: 30, color: teamColor(team.id), textAlign: "right", fontStyle: "italic", filter: "brightness(1.4)" }}>{p.jersey_number ?? i + 1}</span>
          <Photo src={p.profile_picture} name={p.players_name} size={big ? 46 : 42} ring={teamColor(team.id)} ringWidth={3} />
          <span style={{ ...caps, fontWeight: 700, fontSize: big ? 36 : 32, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.players_name}</span>
          {p.is_captain && <Badge bg={C.gold}>C</Badge>}
          {p.is_keeper && <Badge bg={C.volt}>WK</Badge>}
        </motion.div>
      ))}
      {reserves.length > 0 && (
        <motion.div variants={rise} style={{ marginTop: 14 }}>
          <Small size={21}>Reserves: {reserves.map((p) => p.players_name).join(", ")}</Small>
        </motion.div>
      )}
    </>
  );
}

/** Both XIs: one panel on each side of the picture. One XI: a big panel on the left. */
function SquadsScene({ data, payload }) {
  const shown = payload.teamId ? [teamOfId(data, payload.teamId)] : data.teams;
  if (shown.length === 1) {
    const t = shown[0];
    return (
      <SidePanel nested side="left" accentId={t.id} width={900} top={50} label={data.tournament ? `${data.tournament.name} · Playing XI` : "Playing XI"}>
        <SquadList team={t} squad={data.squads[t.id]} big />
      </SidePanel>
    );
  }
  const [a, b] = shown;
  return (
    <>
      <SidePanel key="a" nested side="left" accentId={a.id} width={800} top={60} label="Playing XI">
        <SquadList team={a} squad={data.squads[a.id]} />
      </SidePanel>
      <SidePanel key="b" nested side="right" accentId={b.id} width={800} top={60} label={data.tournament ? data.tournament.name : "Playing XI"}>
        <SquadList team={b} squad={data.squads[b.id]} />
      </SidePanel>
    </>
  );
}

/** The coin spins and lands on the winner's badge. */
const Coin = ({ team }) => (
  <motion.div variants={pop} style={{ perspective: 600 }}>
    <div style={{ width: 110, height: 110, borderRadius: 55, animation: "bc-spin 1.4s cubic-bezier(.22,1,.36,1) .5s both", transformStyle: "preserve-3d", background: "radial-gradient(circle at 35% 30%, #ffe9a8, #f5b82e 45%, #b9770e 100%)", boxShadow: "inset 0 -6px 12px rgba(0,0,0,.3), 0 14px 30px rgba(245,184,46,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {team ? <Logo team={team} size={78} ring="rgba(255,255,255,.7)" /> : <Big size={30} color="#5a3a00">Toss</Big>}
    </div>
  </motion.div>
);

function TossScene({ sb }) {
  const winner = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
  return (
    <LowerThird label="The toss" accentId={winner ? winner.id : null} left={230} right={230}>
      <Cell style={{ padding: "10px 30px 10px 40px" }}>
        <Coin team={winner} />
      </Cell>
      <Cell grow>
        <Big size={56} italic>{winner ? `${winner.name} win the toss` : "Toss yet to happen"}</Big>
        {winner && (
          <Small size={34} color={C.soft}>
            and elect to {sb.tossDecision === "bat" ? "bat first" : "bowl first"}
          </Small>
        )}
      </Cell>
      {winner && (
        <Cell dx={40}>
          <motion.span variants={pop} style={{ position: "relative", overflow: "hidden", ...caps, fontWeight: 800, fontSize: 46, color: "#fff", padding: "8px 34px", background: SPARK, clipPath: SLANT(16), letterSpacing: 4 }}>
            <RunningLines opacity={0.2} />
            <span style={{ position: "relative" }}>{sb.tossDecision === "bat" ? "BAT" : "BOWL"}</span>
          </motion.span>
        </Cell>
      )}
    </LowerThird>
  );
}

function OpenersScene({ sb, inning, scorecard, photoOf }) {
  const { batting, bowling } = sides(sb, inning);
  const card = findCard(scorecard, inning.inningId);
  const openers = card && card.batting.length ? card.batting.slice(0, 2).map((b) => ({ id: b.playerId, name: b.name })) : inning.currentBatsmen.map((b) => ({ id: b.playerId, name: b.name }));
  const bowler = card && card.bowling.length ? { id: card.bowling[0].playerId, name: card.bowling[0].name } : inning.currentBowler ? { id: inning.currentBowler.playerId, name: inning.currentBowler.name } : null;
  return (
    <SidePanel side="left" accentId={batting.id} width={760} bottom={250} label={`${batting.name} · openers`}>
      {openers.length ? openers.map((o, i) => <PlayerCard key={o.id} name={o.name} photo={photoOf(o.id)} role={i === 0 ? "Opening batter · on strike" : "Opening batter"} ring={teamColor(batting.id)} highlight={i === 0} />) : <Big>Openers to be decided</Big>}
      {bowler ? <PlayerCard name={bowler.name} photo={photoOf(bowler.id)} role={`Opening bowler · ${bowling.name}`} ring={teamColor(bowling.id)} /> : null}
    </SidePanel>
  );
}

function BattersScene({ inning, sb }) {
  const { batting } = sides(sb, inning);
  const list = inning.currentBatsmen;
  return (
    <SidePanel side="left" accentId={batting.id} width={760} bottom={250} label={`${batting.name} · ${inning.totalRuns}/${inning.wickets}`}>
      {list.length === 0 && <Big>Batters to come out</Big>}
      {list.map((b) => (
        <PlayerCard key={b.playerId} name={b.name} photo={b.profilePicture} role={`${b.isOnStrike ? "On strike · " : ""}4s ${b.fours ?? 0} · 6s ${b.sixes ?? 0} · SR ${b.strikeRate ?? 0}`} ring={teamColor(batting.id)} big={b.runs ?? 0} bigSub={`${b.balls ?? 0} balls`} highlight={b.isOnStrike} />
      ))}
      <motion.div variants={rise} style={{ display: "flex", justifyContent: "space-between", paddingTop: 6 }}>
        <Small>Partnership {inning.partnershipRuns || 0}</Small>
        <Small>Run rate {inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00"}</Small>
      </motion.div>
    </SidePanel>
  );
}

function BowlerScene({ inning, sb }) {
  const { bowling } = sides(sb, inning);
  const b = inning.currentBowler;
  const chips = overChips(inning);
  return (
    <SidePanel side="right" accentId={bowling.id} width={760} bottom={250} label={`${bowling.name} · bowling`}>
      {!b ? (
        <Big>Bowler to be chosen</Big>
      ) : (
        <>
          <motion.div variants={slideIn(50)} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Photo src={b.profilePicture} name={b.name} size={124} ring={teamColor(bowling.id)} ringWidth={5} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Small size={22}>Bowler</Small>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Big size={fit(b.name, 54, 10)}>{b.name}</Big>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Big size={80} color={C.gold}>
                {b.wickets}-{b.runsConceded}
              </Big>
              <div>
                <Small size={22}>{b.overs} overs</Small>
              </div>
            </div>
          </motion.div>
          <motion.div variants={rise} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
            {[
              ["Overs", b.overs],
              ["Maidens", b.maidens],
              ["Runs", b.runsConceded],
              ["Econ", b.economy ?? "0.00"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "rgba(255,255,255,.06)", padding: "10px 14px", clipPath: SLANT(10) }}>
                <Small size={18}>{k}</Small>
                <div>
                  <Big size={40}>{v}</Big>
                </div>
              </div>
            ))}
          </motion.div>
          <motion.div variants={stagger(0.06, 0.1)} style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
            <Small size={20}>This over</Small>
            {chips.length === 0 && <Small>—</Small>}
            {chips.map((c, i) => (
              <Ball key={i} c={c} size={48} />
            ))}
          </motion.div>
        </>
      )}
    </SidePanel>
  );
}

/** Before the toss: the two teams face to face, split down a diagonal in their colours. */
function PreviewScene({ data, sb }) {
  const [a, b] = data.teams;
  const stage = data.stage === "group" ? (data.group ? `Group ${data.group}` : "Group stage") : data.stage === "semi" ? "Semi-final" : data.stage === "third_place" ? "Third place" : data.stage === "final" ? "Final" : "";
  const L = "polygon(0 0, 56% 0, 44% 100%, 0 100%)";
  const R = "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: 130, right: 130, top: 110, height: 600, fontFamily: FONT, color: "#fff", filter: `drop-shadow(${SHADOW})` }}>
      <motion.div variants={drop} style={{ position: "absolute", left: 0, right: 0, top: -64, textAlign: "center" }}>
        <Big size={40} color={C.gold}>
          {data.tournament ? data.tournament.name : "Match"}
        </Big>
        <Small size={26} color={C.soft}>
          {"  ·  "}
          {[stage, `Match ${sb.matchNo}`].filter(Boolean).join(" · ")}
        </Small>
      </motion.div>
      <Backdrop from="left" colors={[SPARK, teamGrad(a.id)]} offset={16} clip={L} />
      <Backdrop from="right" colors={["linear-gradient(110deg, #0e7091, #22cdef)", teamGrad(b.id)]} offset={16} clip={R} />
      <div style={{ position: "absolute", inset: 0, clipPath: L, overflow: "hidden" }}>
        <RunningLines opacity={0.12} />
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: R, overflow: "hidden" }}>
        <RunningLines opacity={0.12} reverse />
      </div>
      <motion.div variants={graphic(0.1, 0.45)} style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
        {[a, b].map((t, i) => (
          <motion.div key={t.id} variants={slideIn(i ? 120 : -120)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, padding: i ? "0 40px 0 160px" : "0 160px 0 40px" }}>
            <Logo team={t} size={230} ring="rgba(255,255,255,.75)" />
            <span style={{ ...caps, fontWeight: 800, fontSize: 84, lineHeight: 0.95, letterSpacing: 2, textAlign: "center", fontStyle: "italic", textShadow: "0 6px 24px rgba(0,0,0,.4)" }}>{t.name}</span>
          </motion.div>
        ))}
      </motion.div>
      <motion.div
        variants={{ hidden: { opacity: 0, scale: 2.2, rotate: -20 }, show: { opacity: 1, scale: 1, rotate: 0, transition: { delay: 0.8, type: "spring", stiffness: 260, damping: 16 } }, exit: { opacity: 0, scale: 0.6, transition: { duration: 0.15 } } }}
        style={{ position: "absolute", left: "50%", top: "50%", width: 170, height: 170, marginLeft: -85, marginTop: -85, borderRadius: 85, background: C.ink, border: "6px solid rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 60px rgba(255,106,26,.6)" }}
      >
        <span style={{ ...caps, fontWeight: 900, fontSize: 84, fontStyle: "italic", background: SPARK, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>VS</span>
      </motion.div>
      <motion.div variants={rise} style={{ position: "absolute", left: "50%", bottom: -90, transform: "translateX(-50%)", display: "flex", gap: 0, background: PLATE, clipPath: "polygon(30px 0, 100% 0, calc(100% - 30px) 100%, 0 100%)", padding: "16px 70px", whiteSpace: "nowrap" }}>
        <Small size={30} color={C.soft}>
          {sb.maxOvers} overs a side
        </Small>
        {(data.venue || sb.venue) && (
          <Small size={30} color={C.soft}>
            {"   ·   "}
            {data.venue || sb.venue}
          </Small>
        )}
      </motion.div>
    </motion.div>
  );
}

/** The over that was just bowled: every ball, the runs, the bowler and the score after it. */
function OverSummaryScene({ sb, inning, scorecard }) {
  const { batting, bowling } = sides(sb, inning);
  const chips = overChips(inning);
  const summary = inning.currentOverSummary || [];
  const runsInOver = summary.reduce((n, b) => n + Number(b.runs || 0) + Number(b.extraRuns || 0), 0);
  const wicketsInOver = summary.filter((b) => b.wicket).length;
  const card = findCard(scorecard, inning.inningId);
  const lastId = (card && card.lastOverBowlerId) || (inning.currentBowler && inning.currentBowler.playerId);
  const stats = card && card.bowling.find((x) => Number(x.playerId) === Number(lastId));
  const person = sb.teams.team1.players.concat(sb.teams.team2.players).find((p) => Number(p.playerId) === Number(lastId));
  const overNo = Math.max(1, Math.ceil((inning.ballsBowled || 0) / 6));
  return (
    <LowerThird label={`End of over ${overNo}`} accentId={bowling.id} left={140} right={140}>
      <Cell>
        <Small>This over</Small>
        <Big size={90}>
          {runsInOver}
          <span style={{ fontSize: 34, color: C.muted }}>
            {" "}
            run{runsInOver === 1 ? "" : "s"}
            {wicketsInOver ? ` · ${wicketsInOver} wkt` : ""}
          </span>
        </Big>
      </Cell>
      <Sep />
      <Cell grow>
        <motion.div variants={stagger(0.08, 0.15)} style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {chips.map((c, i) => (
            <Ball key={i} c={c} size={62} />
          ))}
        </motion.div>
      </Cell>
      {person && (
        <>
          <Sep />
          <Cell>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Photo src={person.profilePicture} name={person.name} size={70} ring={teamColor(bowling.id)} />
              <div>
                <Big size={36}>{person.name}</Big>
                {stats && (
                  <div>
                    <Small size={28} color={C.gold}>
                      {stats.overs}-{stats.maidens}-{stats.runs}-{stats.wickets}
                    </Small>
                  </div>
                )}
              </div>
            </div>
          </Cell>
        </>
      )}
      <Sep />
      <Cell>
        <Small>{batting.name}</Small>
        <Big size={60}>
          {inning.totalRuns}/{inning.wickets}
        </Big>
      </Cell>
    </LowerThird>
  );
}

function PartnershipScene({ inning, sb }) {
  const { batting } = sides(sb, inning);
  const [a, b] = inning.currentBatsmen;
  const total = (Number(a && a.runs) || 0) + (Number(b && b.runs) || 0) || 1;
  return (
    <LowerThird label="Partnership" accentId={batting.id} left={240} right={240}>
      {a && (
        <Cell grow>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Photo src={a.profilePicture} name={a.name} size={84} ring={teamColor(batting.id)} ringWidth={4} />
            <div>
              <Big size={40}>{a.name}</Big>
              <div>
                <Big size={50}>{a.runs}</Big> <Small>({a.balls})</Small>
              </div>
            </div>
          </div>
        </Cell>
      )}
      <Cell style={{ alignItems: "center", minWidth: 300 }}>
        <motion.div variants={pop}>
          <Big size={110} italic>
            {inning.partnershipRuns || 0}
          </Big>
        </motion.div>
        <Small size={22}>runs together</Small>
        <div style={{ display: "flex", width: 260, height: 8, marginTop: 8, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,.1)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${((Number(a && a.runs) || 0) / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.6, ease: EASE }} style={{ background: SPARK }} />
        </div>
      </Cell>
      {b && (
        <Cell grow dx={30} style={{ alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: "row-reverse", textAlign: "right" }}>
            <Photo src={b.profilePicture} name={b.name} size={84} ring={teamColor(batting.id)} ringWidth={4} />
            <div>
              <Big size={40}>{b.name}</Big>
              <div>
                <Big size={50}>{b.runs}</Big> <Small>({b.balls})</Small>
              </div>
            </div>
          </div>
        </Cell>
      )}
    </LowerThird>
  );
}

function LastWicketScene({ inning, photoOf }) {
  const w = inning.lastWicket;
  const falls = inning.wicketFalls || [];
  return (
    <SidePanel side="left" accentId={null} width={780} bottom={250} label="Wicket">
      {!w ? (
        <Big>No wicket has fallen</Big>
      ) : (
        <>
          <motion.div variants={slideIn(-50)} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative" }}>
              <Photo src={photoOf(w.playerOutId)} name={w.playerOutName} size={140} ring={C.red} ringWidth={6} />
              <motion.span variants={pop} style={{ position: "absolute", right: -10, bottom: -6, background: "linear-gradient(160deg,#ff5a5a,#c81e1e)", ...caps, fontWeight: 900, fontSize: 30, padding: "2px 14px", clipPath: SLANT(8) }}>
                OUT
              </motion.span>
            </div>
            <div style={{ minWidth: 0 }}>
              <Big size={58}>{w.playerOutName}</Big>
              <div>
                <Small size={30} color={C.soft}>
                  {w.description || "out"}
                </Small>
              </div>
            </div>
          </motion.div>
          <motion.div variants={rise} style={{ display: "flex", gap: 40, marginTop: 22, padding: "14px 22px", background: "linear-gradient(90deg, rgba(239,59,59,.3), rgba(239,59,59,.04))", clipPath: SLANT(16) }}>
            <div>
              <Small size={20}>Score</Small>
              <div>
                <Big size={52}>
                  {inning.totalRuns}/{inning.wickets}
                </Big>
              </div>
            </div>
            <div>
              <Small size={20}>Wicket</Small>
              <div>
                <Big size={52}>{falls.length || inning.wickets}</Big>
              </div>
            </div>
            {w.over && (
              <div>
                <Small size={20}>Over</Small>
                <div>
                  <Big size={52}>{w.over}</Big>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </SidePanel>
  );
}

/** The chase equation, dropped in from the top of the picture. */
function TargetScene({ sb, inning }) {
  const { batting } = sides(sb, inning);
  const need = runsNeeded(inning);
  if (inning.inningsNumber < 2 || need === null) {
    return (
      <TopBanner accentId={batting.id} width={1100}>
        <Cell grow style={{ alignItems: "center", textAlign: "center" }}>
          <Small size={24} color={C.gold}>
            {batting.name} · run rate {inning.runRate ? Number(inning.runRate).toFixed(2) : "0.00"}
          </Small>
          <Big size={64} italic>
            {inning.totalRuns}/{inning.wickets} after {inning.overs} overs
          </Big>
        </Cell>
      </TopBanner>
    );
  }
  const left = ballsLeft(sb, inning);
  const pct = Math.min(100, (inning.totalRuns / inning.targetScore) * 100);
  return (
    <TopBanner accentId={batting.id}>
      <Cell style={{ alignItems: "center" }}>
        <Small size={22}>Target</Small>
        <Big size={86} color={C.gold}>
          {inning.targetScore}
        </Big>
      </Cell>
      <Sep />
      <Cell grow style={{ alignItems: "center", textAlign: "center" }}>
        <Big size={58} italic>
          {need === 0 ? `${batting.name} have done it` : `${batting.name} need ${need} from ${left}`}
        </Big>
        <Small size={28} color={C.soft}>
          {inning.requiredRunRate ? `Required rate ${Number(inning.requiredRunRate).toFixed(2)}` : ""}
          {inning.runRate ? `  ·  Current ${Number(inning.runRate).toFixed(2)}` : ""}
        </Small>
        <div style={{ width: "80%", height: 8, marginTop: 10, background: "rgba(255,255,255,.12)", borderRadius: 4, overflow: "hidden" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.6, ease: EASE }} style={{ height: "100%", background: SPARK }} />
        </div>
      </Cell>
    </TopBanner>
  );
}

const Th = ({ children, w, left }) => <th style={{ ...caps, fontWeight: 700, fontSize: 21, color: C.muted, textAlign: left ? "left" : "right", padding: "0 10px 10px", width: w }}>{children}</th>;
const Td = ({ children, left, bold, color }) => <td style={{ ...caps, fontWeight: bold ? 800 : 600, fontSize: 31, textAlign: left ? "left" : "right", padding: "2px 10px", color: color || "#fff", whiteSpace: "nowrap", height: 48 }}>{children}</td>;
const Row = ({ children, hi }) => (
  <motion.tr variants={{ hidden: { opacity: 0, x: -50 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } }, exit: { opacity: 0 } }} style={{ borderBottom: "1px solid rgba(255,255,255,.07)", background: hi ? "linear-gradient(90deg, rgba(255,106,26,.22), transparent)" : "transparent" }}>
    {children}
  </motion.tr>
);

function ScorecardScene({ data, scorecard, payload, photoOf }) {
  const inn = scorecard ? scorecard.innings[(payload.innings || 1) - 1] : null;
  if (!inn) {
    return (
      <CenterPanel>
        <Heading title="Scorecard" />
        <Small>This innings has not started.</Small>
      </CenterPanel>
    );
  }
  const team = teamOfId(data, inn.teamId);
  return (
    <CenterPanel wide accentId={team.id} top={60}>
      <motion.div variants={slideIn(-80)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <TeamSlab team={team} size={58} height={90} />
        <span style={{ ...caps, fontWeight: 800, fontSize: 84, fontStyle: "italic" }}>
          {inn.runs}/{inn.wickets} <span style={{ fontSize: 34, color: C.muted, fontStyle: "normal" }}>({inn.overs} ov)</span>
        </span>
      </motion.div>
      <div style={{ display: "flex", gap: 56 }}>
        <table style={{ flex: 1.35, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th left>Batter</Th>
              <Th w={80}>R</Th>
              <Th w={80}>B</Th>
              <Th w={60}>4s</Th>
              <Th w={60}>6s</Th>
            </tr>
          </thead>
          <motion.tbody variants={stagger(0.045, 0.1)}>
            {inn.batting.slice(0, 11).map((b) => (
              <Row key={b.playerId} hi={b.status === "not out"}>
                <Td left bold>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 12, verticalAlign: "middle" }}>
                    <Photo src={photoOf(b.playerId)} name={b.name} size={36} ringWidth={2} ring="rgba(255,255,255,.6)" />
                    {b.name}
                    {b.status === "not out" ? <span style={{ color: C.accent }}> *</span> : ""}
                  </span>
                </Td>
                <Td bold>{b.runs}</Td>
                <Td color={C.muted}>{b.balls}</Td>
                <Td color={C.muted}>{b.fours}</Td>
                <Td color={C.muted}>{b.sixes}</Td>
              </Row>
            ))}
          </motion.tbody>
        </table>
        <table style={{ flex: 1, borderCollapse: "collapse", alignSelf: "flex-start" }}>
          <thead>
            <tr>
              <Th left>Bowler</Th>
              <Th w={70}>O</Th>
              <Th w={50}>M</Th>
              <Th w={70}>R</Th>
              <Th w={50}>W</Th>
            </tr>
          </thead>
          <motion.tbody variants={stagger(0.045, 0.25)}>
            {inn.bowling.slice(0, 8).map((b) => (
              <Row key={b.playerId}>
                <Td left bold>
                  {b.name}
                </Td>
                <Td color={C.muted}>{b.overs}</Td>
                <Td color={C.muted}>{b.maidens}</Td>
                <Td color={C.muted}>{b.runs}</Td>
                <Td bold color={C.gold}>
                  {b.wickets}
                </Td>
              </Row>
            ))}
          </motion.tbody>
        </table>
      </div>
      <motion.div variants={rise} style={{ marginTop: 14 }}>
        <Small size={25}>
          Extras {inn.extras.total} (w {inn.extras.wides}, nb {inn.extras.noBalls}, b {inn.extras.byes}, lb {inn.extras.legByes})
        </Small>
      </motion.div>
    </CenterPanel>
  );
}

/** The best two batters and bowlers across both innings. */
function topPerformers(scorecard) {
  if (!scorecard) return { bats: [], bowls: [] };
  const bats = scorecard.innings
    .flatMap((i) => i.batting.map((b) => ({ ...b, teamId: i.teamId })))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 2);
  const bowls = scorecard.innings
    .flatMap((i) => i.bowling)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
    .slice(0, 2);
  return { bats, bowls };
}

function StarCard({ name, photo, big, small, accent }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 50, scale: 0.92 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } }, exit: { opacity: 0 } }}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 24, padding: "18px 28px", background: "rgba(255,255,255,.05)", clipPath: SLANT(20), overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: accent }} />
      <Photo src={photo} name={name} size={110} ring="rgba(255,255,255,.7)" ringWidth={4} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Big size={44}>{name}</Big>
      </div>
      <div style={{ textAlign: "right", paddingRight: 18 }}>
        <span style={{ ...caps, fontWeight: 800, fontSize: 70, lineHeight: 1, fontStyle: "italic" }}>{big}</span>
        <div>
          <Small size={24}>{small}</Small>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryScene({ sb, scorecard, photoOf }) {
  const { bats, bowls } = topPerformers(scorecard);
  return (
    <CenterPanel wide>
      <Heading title="Top performers" sub={sb.status === "completed" ? "Match summary" : "So far"} />
      <div style={{ display: "flex", gap: 44 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <motion.div variants={rise}>
            <Small size={28} color={C.gold}>
              Batting
            </Small>
          </motion.div>
          {bats.map((b) => (
            <StarCard key={b.playerId} name={b.name} photo={photoOf(b.playerId)} big={b.runs} small={`${b.balls} balls`} accent={SPARK} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <motion.div variants={rise}>
            <Small size={28} color={C.volt}>
              Bowling
            </Small>
          </motion.div>
          {bowls.map((b) => (
            <StarCard key={b.playerId} name={b.name} photo={photoOf(b.playerId)} big={`${b.wickets}-${b.runs}`} small={`${b.overs} overs`} accent="linear-gradient(180deg,#22cdef,#4f46e5)" />
          ))}
        </div>
      </div>
    </CenterPanel>
  );
}

function ResultScene({ sb }) {
  const r = sb.matchResult;
  const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
  const teamOf = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
  const winnerId = r && r.winnerTeamId;
  const so = sb.superOver && sb.superOver.phase === "settled" ? sb.superOver : null;
  const soLine = so ? so.rounds.map((rd) => `Super over${so.rounds.length > 1 ? ` ${rd.round}` : ""}: ${rd.innings.map((i) => `${teamCode(i.teamName)} ${i.runs}/${i.wickets}`).join("  ·  ")}`).join("   |   ") : null;
  return (
    <CenterPanel accentId={winnerId || null}>
      <Heading title={sb.status === "completed" ? "Full time" : "Match in progress"} />
      <div>
        {sb.innings.map((i) => {
          const t = teamOf(i);
          const won = winnerId && Number(winnerId) === Number(t.id);
          return (
            <motion.div key={i.inningId} variants={slideIn(-90)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 112, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <TeamSlab team={t} size={62} height={90} />
              <span style={{ ...caps, fontWeight: 800, fontSize: 88, fontStyle: "italic", color: won ? "#fff" : C.muted }}>
                {i.totalRuns}/{i.wickets} <span style={{ fontSize: 34, color: C.muted, fontStyle: "normal" }}>({i.overs})</span>
              </span>
            </motion.div>
          );
        })}
      </div>
      <motion.div variants={rise} style={{ position: "relative", marginTop: 34, padding: "18px 0", textAlign: "center", background: "linear-gradient(90deg, transparent, rgba(255,106,26,.28), transparent)" }}>
        <Big size={66} color="#fff" italic>
          {sb.status !== "completed" ? "Match in progress" : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : so ? `${r.winnerTeamName} won the super over` : `${r.winnerTeamName} won ${margin}`}
        </Big>
        {soLine && <div style={{ ...caps, fontWeight: 600, fontSize: 30, color: C.soft, letterSpacing: 3, marginTop: 8 }}>{soLine}</div>}
      </motion.div>
    </CenterPanel>
  );
}

/** Player of the match: a tall card on the right with a big photo. */
function PotmScene({ data, scorecard }) {
  const p = data.playerOfMatch || data.suggestedPlayerOfMatch;
  if (!p) {
    return (
      <SidePanel side="right" width={700} bottom={250} label="Player of the match">
        <Big>To be announced</Big>
      </SidePanel>
    );
  }
  const team = teamOfId(data, p.teamId);
  const bat = scorecard && scorecard.innings.flatMap((i) => i.batting).find((b) => b.playerId === p.id);
  const bowl = scorecard && scorecard.innings.flatMap((i) => i.bowling).find((b) => b.playerId === p.id);
  return (
    <SidePanel side="right" accentId={team.id} width={760} top={110} label="Player of the match">
      <motion.div variants={pop} style={{ display: "flex", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", inset: "10% 20%", borderRadius: "50%", background: SPARK, filter: "blur(50px)", opacity: 0.55 }} />
        <Photo src={p.photo} name={p.name} size={300} ring="rgba(255,255,255,.85)" ringWidth={6} />
      </motion.div>
      <motion.div variants={rise} style={{ textAlign: "center", marginTop: 20 }}>
        <Big size={78} italic>
          {p.name}
        </Big>
        <div>
          <Small size={30} color={C.soft}>
            {team.name}
          </Small>
        </div>
      </motion.div>
      <motion.div variants={rise} style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
        {bat && (
          <div style={{ background: "rgba(255,255,255,.07)", padding: "12px 30px", clipPath: SLANT(14), textAlign: "center" }}>
            <Small size={20}>Batting</Small>
            <div>
              <Big size={54}>{bat.runs}</Big> <Small size={26}>({bat.balls})</Small>
            </div>
          </div>
        )}
        {bowl && bowl.legalBalls > 0 && (
          <div style={{ background: "rgba(255,255,255,.07)", padding: "12px 30px", clipPath: SLANT(14), textAlign: "center" }}>
            <Small size={20}>Bowling</Small>
            <div>
              <Big size={54} color={C.gold}>
                {bowl.wickets}-{bowl.runs}
              </Big>{" "}
              <Small size={26}>({bowl.overs})</Small>
            </div>
          </div>
        )}
      </motion.div>
    </SidePanel>
  );
}

function RankingsScene({ rankings }) {
  const rows = (rankings || []).slice(0, 8);
  return (
    <SidePanel side="right" width={860} top={80} label="Association ranking">
      <Heading title="Top teams" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th w={70} left>
              #
            </Th>
            <Th left>Team</Th>
            <Th w={90}>P</Th>
            <Th w={90}>W</Th>
            <Th w={120}>Pts</Th>
          </tr>
        </thead>
        <motion.tbody variants={stagger(0.06, 0.15)}>
          {rows.map((r, i) => (
            <Row key={r.teamId} hi={i === 0}>
              <Td left bold color={i < 3 ? C.gold : C.muted}>
                {r.rank}
              </Td>
              <Td left bold>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14, verticalAlign: "middle" }}>
                  <Logo team={{ id: r.teamId, name: r.name, logo: r.logo }} size={40} ring="rgba(255,255,255,.6)" />
                  {r.name}
                </span>
              </Td>
              <Td color={C.muted}>{r.played}</Td>
              <Td color={C.muted}>{r.won}</Td>
              <Td bold>{r.points}</Td>
            </Row>
          ))}
        </motion.tbody>
      </table>
      {rows.length === 0 && <Small>No ranking yet</Small>}
    </SidePanel>
  );
}

function MessageScene({ payload }) {
  return (
    <LowerThird label="Spark" left={260} right={260}>
      <Cell style={{ padding: "0 10px 0 0" }}>
        <motion.div variants={slideIn(-40)} style={{ position: "relative", width: 140, alignSelf: "stretch", minHeight: 132, background: SPARK, clipPath: SLANT(30), overflow: "hidden" }}>
          <RunningLines opacity={0.22} />
        </motion.div>
      </Cell>
      <Cell grow>
        <Letters text={payload.text} size={62} delay={0.45} style={{ flexWrap: "wrap", fontStyle: "italic" }} />
        {payload.subtext && (
          <motion.div variants={rise} style={{ marginTop: 8 }}>
            <Small size={30} color={C.soft}>
              {payload.subtext}
            </Small>
          </motion.div>
        )}
      </Cell>
    </LowerThird>
  );
}

/** Always on: the tournament and the LIVE tag in the top-left corner. */
export function CornerBug({ data, sb }) {
  const name = data && data.tournament ? data.tournament.name : sb ? `${sb.teams.team1.name} v ${sb.teams.team2.name}` : "";
  const live = sb && sb.status !== "completed";
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: 60, top: 44, height: 64, display: "flex", fontFamily: FONT, color: "#fff", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.45))" }}>
      <div style={{ position: "relative", width: 76 }}>
        <Backdrop from="left" colors={[SPARK]} clip={SLANT(14)} />
        <motion.div variants={pop} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8 }}>
          <svg width="30" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </motion.div>
      </div>
      <div style={{ position: "relative", marginLeft: -10 }}>
        <Backdrop from="left" colors={[PLATE]} clip={SLANT(14)} />
        <motion.div variants={stagger(0.08, 0.35)} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", gap: 18, padding: "0 38px 0 26px" }}>
          {live && (
            <motion.span variants={pop} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.red, padding: "3px 12px 2px", ...caps, fontWeight: 800, fontSize: 22, letterSpacing: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: "#fff", animation: "bc-pulse 1.2s ease-in-out infinite" }} />
              Live
            </motion.span>
          )}
          <motion.span variants={slideIn(-20)} style={{ ...caps, fontWeight: 800, fontSize: 28, letterSpacing: 2.5, whiteSpace: "nowrap" }}>
            {name}
          </motion.span>
          {sb && (
            <motion.span variants={slideIn(-20)} style={{ ...caps, fontWeight: 600, fontSize: 22, letterSpacing: 2.5, color: C.muted, whiteSpace: "nowrap" }}>
              Match {sb.matchNo}
            </motion.span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * @param state    { scene, payload }
 * @param data     /overlay/:matchId  (teams, squads, player of the match ...)
 * @param sb       live scoreboard,  inning = current innings of it
 * @param scorecard full scorecard (only needed by some scenes)
 */
export default function SceneLayer({ state, data, sb, inning, scorecard, rankings }) {
  const scene = state ? state.scene : "none";
  const payload = (state && state.payload) || {};
  const photoOf = photoLookup(sb, data);
  let node = null;
  if (data && sb && inning) {
    switch (scene) {
      case "preview": node = <PreviewScene key="preview" data={data} sb={sb} />; break;
      case "over_summary": node = <OverSummaryScene key={`over${inning.ballsBowled}`} sb={sb} inning={inning} scorecard={scorecard} />; break;
      case "squads": node = <motion.div key={`squads${payload.teamId || ""}`} initial="hidden" animate="show" exit="exit" variants={holder}><SquadsScene data={data} payload={payload} /></motion.div>; break;
      case "toss": node = <TossScene key="toss" sb={sb} />; break;
      case "openers": node = <OpenersScene key="openers" sb={sb} inning={inning} scorecard={scorecard} photoOf={photoOf} />; break;
      case "batters": node = <BattersScene key="batters" sb={sb} inning={inning} />; break;
      case "bowler": node = <BowlerScene key="bowler" sb={sb} inning={inning} />; break;
      case "partnership": node = <PartnershipScene key="partnership" sb={sb} inning={inning} />; break;
      case "last_wicket": node = <LastWicketScene key="last_wicket" inning={inning} photoOf={photoOf} />; break;
      case "scorecard": node = <ScorecardScene key={`scorecard${payload.innings}`} data={data} scorecard={scorecard} payload={payload} photoOf={photoOf} />; break;
      case "target": node = <TargetScene key="target" sb={sb} inning={inning} />; break;
      case "summary": node = <SummaryScene key="summary" sb={sb} scorecard={scorecard} photoOf={photoOf} />; break;
      case "result": node = <ResultScene key="result" sb={sb} />; break;
      case "potm": node = <PotmScene key="potm" data={data} scorecard={scorecard} />; break;
      case "rankings": node = <RankingsScene key="rankings" rankings={rankings} />; break;
      case "message": node = <MessageScene key={`message${payload.text}`} payload={payload} />; break;
      default: node = null;
    }
  }
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

/** Scenes that use the top of the picture, so the corner tag steps aside while they are on air. */
export const USES_TOP = ["squads", "preview", "scorecard", "summary", "result", "potm", "rankings", "target"];

/** Scenes that need the full scorecard / the team ranking loaded. */
export const NEEDS_SCORECARD = ["openers", "scorecard", "summary", "potm", "over_summary"];
export const NEEDS_RANKINGS = ["rankings"];
