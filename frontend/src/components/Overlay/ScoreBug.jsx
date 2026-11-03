import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode } from "../Scoring/scoreUtils";
import { Backdrop, C, caps, Divider, EASE, FONT, graphic, holder, Label, Letters, Logo, Photo, PLATE, pop, Roll, RunningLines, short, slideIn, SLANT, SPARK, stagger, Sweep, Tag, teamGrad } from "./bc";

// The score bar along the bottom of the picture, TV style: a deep plate with the batting team's colour slab,
// spark and team-colour layers peeking out behind it, running lines in the slabs and a light that sweeps across.
// It builds in layer by layer, then its parts cascade in. A four, six, wicket or milestone fires a full-width
// burst above it.

const CHIP = {
  dot: { background: "rgba(255,255,255,.06)", color: "#98a0d2", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.22)" },
  run: { background: "#ffffff", color: "#0c1040" },
  four: { background: "linear-gradient(160deg, #3fb4ff, #1f6feb)", color: "#fff" },
  six: { background: "linear-gradient(160deg, #e040fb, #7c3aed)", color: "#fff" },
  wicket: { background: "linear-gradient(160deg, #ff5a5a, #c81e1e)", color: "#fff" },
  extra: { background: "#ffb21a", color: "#3b2200" },
};

const BURST = {
  four: ["linear-gradient(110deg, #0b63d6, #3fb4ff)", "#1f8fff"],
  six: ["linear-gradient(110deg, #7c1fd6, #e040fb)", "#c026d3"],
  wicket: ["linear-gradient(110deg, #9b1010, #ff4040)", "#ef3b3b"],
  milestone: ["linear-gradient(110deg, #c27803, #ffd23f)", "#ffb21a"],
};

/** FOUR / SIX / WICKET / FIFTY: a full-width band above the bar, the word crashing in letter by letter. */
function EventBurst({ event, photo }) {
  const [grad, solid] = BURST[event.kind] || BURST.four;
  return (
    <motion.div key={event.key} initial="hidden" animate="show" exit="exit" variants={holder} style={{ position: "absolute", left: -60, right: -60, bottom: "calc(100% + 60px)", height: 176 }}>
      <Backdrop from="left" colors={[SPARK, grad, PLATE]} offset={12} clip="polygon(0 14%, 100% 0, 100% 86%, 0 100%)" />
      <motion.div variants={graphic(0.07, 0.3)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 140, clipPath: "polygon(0 14%, 100% 0, 100% 86%, 0 100%)", overflow: "hidden" }}>
        <Sweep every={3.5} delay={0.6} opacity={0.3} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 600, background: grad, clipPath: SLANT(70) }}>
          <RunningLines opacity={0.25} speed={0.9} />
        </div>
        <motion.div variants={slideIn(-60)} style={{ position: "relative", width: 500, display: "flex", alignItems: "center" }}>
          <Letters text={event.title} size={event.title.length > 4 ? 112 : 150} delay={0.35} step={0.05} style={{ fontStyle: "italic", letterSpacing: 6, textShadow: "0 8px 30px rgba(0,0,0,.4)" }} />
        </motion.div>
        {photo !== undefined && (
          <motion.div variants={pop} style={{ position: "relative", marginLeft: 40 }}>
            <Photo src={photo} name={event.name} size={124} ring={solid} ringWidth={5} />
          </motion.div>
        )}
        <motion.div variants={slideIn(50)} style={{ position: "relative", marginLeft: 36, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ ...caps, fontWeight: 800, fontSize: 64, color: "#fff", lineHeight: 1, whiteSpace: "nowrap" }}>{event.name}</span>
          <span style={{ ...caps, fontWeight: 600, fontSize: 32, color: C.soft, letterSpacing: 3, marginTop: 6 }}>{event.detail}</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** The bar: the label on top, the layered plate that holds the content. */
function Frame({ tag, accentId, event, eventPhoto, modeKey, children, freeHit }) {
  const team = accentId != null ? teamGrad(accentId) : SPARK;
  return (
    <motion.div initial="hidden" animate="show" variants={holder} style={{ position: "absolute", left: 60, right: 60, bottom: 40 }}>
      <AnimatePresence>{event && <EventBurst key={event.key} event={event} photo={eventPhoto} />}</AnimatePresence>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, paddingLeft: 10 }}>
        <motion.div variants={stagger(0, 0.45)}>
          <Tag>{tag}</Tag>
        </motion.div>
        <AnimatePresence>
          {freeHit && (
            <motion.div key="fh" initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 380, damping: 20 }} style={{ position: "relative", overflow: "hidden", marginRight: 60, background: SPARK, color: "#fff", ...caps, fontWeight: 800, fontSize: 26, letterSpacing: 6, padding: "4px 30px 3px", clipPath: SLANT(14), animation: "bc-glow 1.4s ease-in-out infinite" }}>
              <RunningLines opacity={0.25} speed={0.8} />
              <span style={{ position: "relative" }}>Free hit</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ position: "relative", height: 116, filter: "drop-shadow(0 20px 34px rgba(0,0,0,.55))" }}>
        <Backdrop from="left" colors={[SPARK, team, PLATE]} offset={9} clip={SLANT(34)} />
        <div style={{ position: "absolute", inset: 0, clipPath: SLANT(34), overflow: "hidden" }}>
          <Sweep every={9} delay={1.4} opacity={0.14} />
          <AnimatePresence mode="wait">
            <motion.div key={modeKey} initial="hidden" animate="show" exit="exit" variants={stagger(0.06, 0.42)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "stretch", color: "#fff", paddingRight: 54 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

const Message = ({ big, small, logos }) => (
  <motion.div variants={slideIn(40)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 30, padding: "0 30px", textAlign: "center" }}>
    {logos && logos[0]}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ ...caps, fontWeight: 800, fontSize: 52, letterSpacing: 2.5, lineHeight: 1.02 }}>{big}</span>
      {small && <span style={{ ...caps, fontWeight: 600, fontSize: 27, color: C.soft, letterSpacing: 2.5 }}>{small}</span>}
    </div>
    {logos && logos[1]}
  </motion.div>
);

/** The batting team: logo and code on a slab of its colour. */
const TeamBlock = ({ team }) => (
  <motion.div variants={slideIn(-60)} style={{ position: "relative", width: 236, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: teamGrad(team.id, 160), clipPath: SLANT(30), paddingRight: 24, overflow: "hidden" }}>
    <RunningLines opacity={0.16} />
    <div style={{ position: "relative" }}>
      <Logo team={team} size={60} />
    </div>
    <span style={{ position: "relative", ...caps, fontWeight: 800, fontSize: 54, letterSpacing: 2, lineHeight: 1, fontStyle: "italic", textShadow: "0 3px 12px rgba(0,0,0,.35)" }}>{teamCode(team.name)}</span>
  </motion.div>
);

const BatterRow = ({ b }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 50, fontFamily: FONT, textTransform: "uppercase" }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: b.isOnStrike ? C.accent : "transparent", boxShadow: b.isOnStrike ? "0 0 12px rgba(255,106,26,.9)" : "none" }} />
    <Photo src={b.profilePicture} name={b.name} size={40} ring={b.isOnStrike ? C.accent : "rgba(255,255,255,.35)"} ringWidth={2} />
    <span style={{ flex: 1, fontWeight: b.isOnStrike ? 800 : 600, fontSize: 32, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: b.isOnStrike ? "#fff" : C.soft }}>{short(b.name)}</span>
    <Roll value={b.runs} style={{ fontWeight: 800, fontSize: 40, minWidth: 52, textAlign: "right" }} />
    <span style={{ fontWeight: 600, fontSize: 25, color: C.muted, minWidth: 52 }}>({b.balls})</span>
  </div>
);


/* ---------------------------------- the super over ---------------------------------- */

const soChip = (b) => (b.wicket ? "wicket" : b.extra ? "extra" : b.runs === 6 ? "six" : b.runs === 4 ? "four" : b.runs === 0 ? "dot" : "run");
const lastName = (p) => (p && p.name ? p.name.trim().split(/\s+/).slice(-1)[0] : null);
const inningsLine = (sb, i) => `${teamCode(teamOfSide(sb, i.teamId).name)} ${i.runs}/${i.wickets}`;
const teamOfSide = (sb, id) => (Number(id) === Number(sb.teams.team1.id) ? sb.teams.team1 : sb.teams.team2);

/** A tied match decided on one over each: the bar switches to it by itself the moment the scorer starts the super over. */
function SuperOverBar({ sb, so, event, eventPhoto }) {
  const tag = so.round > 1 ? `Super over ${so.round}` : "Super over";
  const [first, second] = so.rounds[so.rounds.length - 1].innings;
  const cur = so.current;
  const common = { tag, event, eventPhoto };

  if (so.phase === "ready") {
    const team = teamOfSide(sb, cur.teamId);
    return (
      <Frame {...common} accentId={team.id} modeKey={`so-ready-${cur.id}`}>
        <TeamBlock team={team} />
        <Message big="Super over" small={`Match tied. ${team.name} bat first, one over each`} />
      </Frame>
    );
  }

  if (so.phase === "break") {
    const team = teamOfSide(sb, first.teamId);
    return (
      <Frame {...common} accentId={team.id} modeKey={`so-break-${cur.id}`}>
        <TeamBlock team={team} />
        <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", padding: "0 36px", ...caps, fontWeight: 800, fontSize: 70 }}>
          {first.runs}/{first.wickets} <span style={{ fontSize: 28, color: C.muted, marginLeft: 14 }}>({first.legalBalls} balls)</span>
        </motion.div>
        <Divider />
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
        <TeamBlock team={winner} />
        <Message big={`${winner.name} win the super over`} small={`${inningsLine(sb, first)}  ·  ${inningsLine(sb, second)}`} />
      </Frame>
    );
  }

  /* live */
  const team = teamOfSide(sb, cur.teamId);
  const fielding = teamOfSide(sb, cur.teamId === Number(sb.teams.team1.id) ? sb.teams.team2.id : sb.teams.team1.id);
  const slots = Math.max(so.ballsPerOver, cur.balls.length);
  const bowlerName = lastName(cur.bowler);
  return (
    <Frame {...common} accentId={team.id} modeKey={`so-live-${cur.id}`}>
      <TeamBlock team={team} />

      <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 26px 0 24px", minWidth: 300 }}>
        <span style={{ ...caps, fontWeight: 800, fontSize: 84, lineHeight: 1, letterSpacing: 0.5, display: "inline-flex", alignItems: "baseline" }}>
          <Roll value={cur.runs} />
          <span style={{ color: C.accent, margin: "0 4px", fontWeight: 700 }}>/</span>
          <Roll value={cur.wickets} />
        </span>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ ...caps, fontWeight: 700, fontSize: 38 }}>0.{cur.legalBalls}</div>
          <Label style={{ fontSize: 15 }}>of 1 ov</Label>
        </div>
      </motion.div>

      <Divider />

      <motion.div variants={slideIn(-30)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, padding: "0 22px", width: 380, fontFamily: FONT, textTransform: "uppercase" }}>
        {cur.batters.length ? (
          cur.batters.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: 30, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <Photo src={b.photo} name={b.name || ""} size={36} ring="rgba(255,255,255,.4)" ringWidth={2} />
              {short(b.name || "")}
            </div>
          ))
        ) : (
          <Label>{team.name} batting</Label>
        )}
        <Label style={{ fontSize: 17 }}>{bowlerName ? `v ${bowlerName}` : `v ${fielding.name}`}</Label>
      </motion.div>

      <Divider />

      <motion.div variants={stagger(0.05, 0.15)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 24px" }}>
        {Array.from({ length: slots }).map((_, i) => {
          const b = cur.balls[i];
          const style = b ? CHIP[soChip(b)] : { ...CHIP.dot, background: "transparent", color: "transparent", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.14)" };
          const long = b && b.label.length > 2;
          return (
            <motion.span key={i} variants={pop} style={{ ...style, width: long ? "auto" : 42, minWidth: 42, height: 42, borderRadius: 21, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: long ? 17 : 24, padding: long ? "0 9px" : 0 }}>
              {b ? b.label : "·"}
            </motion.span>
          );
        })}
      </motion.div>

      <Divider />

      <motion.div variants={slideIn(-24)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px 0 24px", fontFamily: FONT, textTransform: "uppercase", overflow: "hidden", minWidth: 0 }}>
        {so.chase ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 32, color: so.chase.need === 0 ? C.green : "#fff", letterSpacing: 1, lineHeight: 1.05, whiteSpace: "nowrap" }}>{so.chase.need === 0 ? "Target reached" : `Need ${so.chase.need} off ${so.chase.ballsLeft}`}</div>
            <Label style={{ fontSize: 16, marginTop: 4 }}>
              Target <b style={{ color: C.gold }}>{so.chase.target}</b>
            </Label>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: 1, lineHeight: 1.05, whiteSpace: "nowrap" }}>{cur.ballsLeft} ball{cur.ballsLeft === 1 ? "" : "s"} left</div>
            <Label style={{ fontSize: 16, marginTop: 4 }}>Match tied</Label>
          </>
        )}
      </motion.div>
    </Frame>
  );
}

/** The broadcast-style bar along the bottom of the picture. */
export default function ScoreBug({ sb, inning, event, tournamentTag, photoOf }) {
  const tag = tournamentTag || (inning.inningsNumber > 1 ? "Second innings · chase" : "First innings");
  const eventPhoto = event && photoOf ? photoOf(event.playerId) : undefined;

  /* ---- a tied match being settled with a super over ---- */
  if (sb.status === "completed" && sb.superOver && sb.superOver.active) return <SuperOverBar sb={sb} so={sb.superOver} event={event} eventPhoto={eventPhoto} />;

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
      <Frame tag="Result" accentId={winner ? winner.id : null} modeKey="done" event={event} eventPhoto={eventPhoto}>
        {winner && <TeamBlock team={winner} />}
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
        <Frame tag="Innings break" accentId={firstTeam.id} modeKey="break" event={event} eventPhoto={eventPhoto}>
          <TeamBlock team={firstTeam} />
          <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", padding: "0 36px", ...caps, fontWeight: 800, fontSize: 70 }}>
            {first.totalRuns}/{first.wickets} <span style={{ fontSize: 28, color: C.muted, marginLeft: 14 }}>({first.overs})</span>
          </motion.div>
          <Divider />
          <Message big={`${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win`} small={`from ${sb.maxOvers} overs`} />
        </Frame>
      );
    }
    const tossTeam = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Frame tag={tag} accentId={tossTeam ? tossTeam.id : null} modeKey="pre" event={event} eventPhoto={eventPhoto}>
        <Message
          big={`${sb.teams.team1.name}  v  ${sb.teams.team2.name}`}
          small={tossTeam ? `${tossTeam.name} won the toss and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "Match starting soon"}
          logos={[<Logo key="a" team={sb.teams.team1} size={74} />, <Logo key="b" team={sb.teams.team2} size={74} />]}
        />
      </Frame>
    );
  }

  /* ---- live ---- */
  const chase = inning.inningsNumber > 1 && inning.targetScore;
  const need = runsNeeded(inning);
  const left = ballsLeft(sb, inning);
  const projected = projectedScore(sb, inning);
  const chips = overChips(inning);
  const bowler = inning.currentBowler;

  return (
    <Frame tag={tag} accentId={batting.id} modeKey="live" event={event} eventPhoto={eventPhoto} freeHit={inning.freeHit}>
      <TeamBlock team={batting} />

      {/* the score */}
      <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 26px 0 24px", minWidth: 300 }}>
        <span style={{ ...caps, fontWeight: 800, fontSize: 84, lineHeight: 1, letterSpacing: 0.5, display: "inline-flex", alignItems: "baseline" }}>
          <Roll value={inning.totalRuns} />
          <span style={{ color: C.accent, margin: "0 4px", fontWeight: 700 }}>/</span>
          <Roll value={inning.wickets} />
        </span>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ ...caps, fontWeight: 700, fontSize: 38 }}>{inning.overs}</div>
          <Label style={{ fontSize: 15 }}>of {sb.maxOvers} ov</Label>
        </div>
      </motion.div>

      <Divider />

      {/* batters */}
      <motion.div variants={slideIn(-30)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", width: 400 }}>
        {inning.currentBatsmen.map((b) => (
          <BatterRow key={b.playerId} b={b} />
        ))}
        {inning.currentBatsmen.length === 0 && <Label>New batter</Label>}
      </motion.div>

      <Divider />

      {/* bowler and this over */}
      <motion.div variants={slideIn(-30)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 22px", width: 400 }}>
        {bowler ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, textTransform: "uppercase" }}>
            <Photo src={bowler.profilePicture} name={bowler.name} size={40} ring={C.volt} ringWidth={2} />
            <span style={{ fontWeight: 700, fontSize: 32, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{bowler.name.trim().split(/\s+/).slice(-1)[0]}</span>
            <span style={{ fontWeight: 800, fontSize: 32 }}>
              {bowler.wickets}-{bowler.runsConceded}
            </span>
            <span style={{ fontWeight: 600, fontSize: 24, color: C.muted }}>({bowler.overs})</span>
          </div>
        ) : (
          <Label>Next bowler</Label>
        )}
        <motion.div variants={stagger(0.05, 0.15)} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 34 }}>
          {chips.slice(-8).map((c, i) => (
            <motion.span key={i} variants={pop} style={{ ...CHIP[c.kind], width: c.text.length > 2 ? "auto" : 36, minWidth: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: c.text.length > 2 ? 16 : 23, padding: c.text.length > 2 ? "0 8px" : 0 }}>
              {c.text}
            </motion.span>
          ))}
          {chips.length === 0 && <Label style={{ fontSize: 15 }}>{bowler ? "New over" : "Last over"}</Label>}
        </motion.div>
      </motion.div>

      <Divider />

      {/* the state of the game */}
      <motion.div variants={slideIn(-24)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px 0 24px", fontFamily: FONT, textTransform: "uppercase", overflow: "hidden", minWidth: 0 }}>
        {chase ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 32, color: need === 0 ? C.green : "#fff", letterSpacing: 1, lineHeight: 1.05, whiteSpace: "nowrap" }}>{need === 0 ? "Target reached" : `Need ${need} off ${left}`}</div>
            <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginTop: 4 }}>
              <Label style={{ fontSize: 16 }}>Target <b style={{ color: C.gold }}>{inning.targetScore}</b></Label>
              <Label style={{ fontSize: 16 }}>RRR <b style={{ color: "#fff" }}>{inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"}</b></Label>
            </div>
            <div style={{ height: 5, marginTop: 8, background: "rgba(255,255,255,.12)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (inning.totalRuns / inning.targetScore) * 100)}%` }} transition={{ duration: 0.8, ease: EASE }} style={{ height: "100%", background: SPARK }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <Label>CRR</Label>
              <span style={{ fontWeight: 800, fontSize: 38 }}>{inning.runRate ? inning.runRate.toFixed(2) : "0.00"}</span>
            </div>
            {projected ? <div style={{ fontWeight: 700, fontSize: 26, color: C.gold, lineHeight: 1.05 }}>Projected {projected}</div> : null}
            <Label style={{ fontSize: 15, whiteSpace: "nowrap" }}>
              v {bowling.name} · P'ship {inning.partnershipRuns}
            </Label>
          </>
        )}
      </motion.div>
    </Frame>
  );
}
