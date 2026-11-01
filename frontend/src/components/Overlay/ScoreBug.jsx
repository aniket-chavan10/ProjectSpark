import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode, teamColor } from "../Scoring/scoreUtils";
import { C, caps, Divider, draw, EASE, FONT, GLASS, graphic, Label, Letters, Logo, Photo, pop, Roll, SHADOW, slideIn, SLANT, stagger, Tag } from "./bc";

// The score bar along the bottom of the picture. Restrained on purpose:
// a solid navy bar, the batting team's colour as one block and one hairline, white type, thin dividers.
// It rises into place and its parts follow in an even stagger; a four, six, wicket or fifty slides a
// plain banner up over it.

const CHIP = {
  dot: { background: "transparent", color: "#8a96ab", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.22)" },
  run: { background: "rgba(255,255,255,.14)", color: "#f2f5fa" },
  four: { background: "#4a6c9d", color: "#fff" },
  six: { background: "#5d5497", color: "#fff" },
  wicket: { background: "#b8433e", color: "#fff" },
  extra: { background: "rgba(255,255,255,.28)", color: "#fff" },
};

const BANNER = { four: "#4a6c9d", six: "#5d5497", wicket: "#b8433e", milestone: "#b99a5c" };

/** FOUR / SIX / WICKET / FIFTY: a plain panel with a coloured edge, the title arriving letter by letter. */
function EventBanner({ event, photo }) {
  const color = BANNER[event.kind] || BANNER.four;
  return (
    <motion.div key={event.key} initial="hidden" animate="show" exit="exit" variants={graphic(0.06, 0.18)} style={{ position: "absolute", right: 0, bottom: "calc(100% + 26px)", width: 820, height: 108, display: "flex", alignItems: "stretch", background: GLASS, boxShadow: SHADOW, borderLeft: `10px solid ${color}` }}>
      <motion.div variants={slideIn(-20)} style={{ width: 250, display: "flex", alignItems: "center", paddingLeft: 30 }}>
        <Letters text={event.title} size={event.title.length > 6 ? 54 : 68} delay={0.3} style={{ letterSpacing: 3 }} />
      </motion.div>
      <div style={{ width: 1, margin: "18px 0", background: "rgba(255,255,255,.16)" }} />
      <motion.div variants={slideIn(24)} style={{ flex: 1, paddingLeft: 30, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <span style={{ ...caps, fontWeight: 700, fontSize: 40, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.name}</span>
        <span style={{ ...caps, fontWeight: 500, fontSize: 25, color: C.muted, letterSpacing: 1.5 }}>{event.detail}</span>
      </motion.div>
      {photo !== undefined && (
        <motion.div variants={pop} style={{ display: "flex", alignItems: "center", padding: "0 26px" }}>
          <Photo src={photo} name={event.name} size={80} />
        </motion.div>
      )}
    </motion.div>
  );
}

/** The bar: the label on top, the dark body that holds the content, one hairline in the team colour. */
function Frame({ tag, accent, event, eventPhoto, modeKey, children, freeHit }) {
  return (
    <motion.div initial="hidden" animate="show" variants={graphic(0, 0)} style={{ position: "absolute", left: 96, right: 96, bottom: 56 }}>
      <AnimatePresence>{event && <EventBanner key={event.key} event={event} photo={eventPhoto} />}</AnimatePresence>
      <Tag color={accent}>{tag}</Tag>
      <div style={{ position: "relative", height: 108, filter: "drop-shadow(0 16px 30px rgba(0,0,0,.5))" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0, 100% 0, calc(100% - 26px) 100%, 0 100%)", background: GLASS, boxShadow: "inset 0 1px 0 rgba(255,255,255,.1)" }}>
          <AnimatePresence mode="wait">
            <motion.div key={modeKey} initial="hidden" animate="show" exit="exit" variants={stagger(0.05, 0.28)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "stretch", color: "#fff", paddingRight: 40 }}>
              {children}
            </motion.div>
          </AnimatePresence>
          <motion.div variants={draw(0.25)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: accent, transformOrigin: "left" }} />
        </div>
        {freeHit && (
          <div style={{ position: "absolute", right: 60, top: -22, background: "#fff", color: C.ink, ...caps, fontWeight: 800, fontSize: 24, letterSpacing: 4, padding: "3px 18px 1px" }}>FREE HIT</div>
        )}
      </div>
    </motion.div>
  );
}

const Message = ({ big, small, logos }) => (
  <motion.div variants={slideIn(30)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: "0 30px", textAlign: "center" }}>
    {logos && logos[0]}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ ...caps, fontWeight: 700, fontSize: 48, letterSpacing: 2.5, lineHeight: 1.05 }}>{big}</span>
      {small && <span style={{ ...caps, fontWeight: 500, fontSize: 26, color: C.soft, letterSpacing: 2 }}>{small}</span>}
    </div>
    {logos && logos[1]}
  </motion.div>
);

/** The batting team: logo and code on its colour. */
const TeamBlock = ({ team }) => (
  <motion.div variants={slideIn(-40)} style={{ width: 226, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: `linear-gradient(180deg, ${teamColor(team.id)}, ${teamColor(team.id)}cc)`, clipPath: SLANT(16), paddingRight: 14 }}>
    <Logo team={team} size={54} />
    <span style={{ ...caps, fontWeight: 700, fontSize: 52, letterSpacing: 1.5, lineHeight: 1 }}>{teamCode(team.name)}</span>
  </motion.div>
);

const BatterRow = ({ b }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 48, fontFamily: FONT, textTransform: "uppercase" }}>
    <span style={{ width: 10, color: C.accent, fontSize: 18 }}>{b.isOnStrike ? "▶" : ""}</span>
    <Photo src={b.profilePicture} name={b.name} size={38} />
    <span style={{ flex: 1, fontWeight: b.isOnStrike ? 700 : 500, fontSize: 31, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: b.isOnStrike ? "#fff" : C.soft }}>{b.name}</span>
    <Roll value={b.runs} style={{ fontWeight: 700, fontSize: 38, minWidth: 54, textAlign: "right" }} />
    <span style={{ fontWeight: 500, fontSize: 25, color: C.muted, minWidth: 56 }}>({b.balls})</span>
  </div>
);

/** The broadcast-style bar along the bottom of the picture. */
export default function ScoreBug({ sb, inning, event, tournamentTag, photoOf }) {
  const tag = tournamentTag || `Match ${sb.matchNo}`;
  const eventPhoto = event && photoOf ? photoOf(event.playerId) : undefined;

  /* ---- match over ---- */
  if (sb.status === "completed") {
    const r = sb.matchResult;
    const [a, b] = sb.innings;
    const teamOfInnings = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
    const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
    const winner = r && r.winnerTeamId ? (r.winnerTeamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Frame tag="Result" accent={winner ? teamColor(winner.id) : C.accent} modeKey="done" event={event} eventPhoto={eventPhoto}>
        <Message
          big={!r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`}
          small={[a, b].filter(Boolean).map((i) => `${teamCode(teamOfInnings(i).name)} ${i.totalRuns}/${i.wickets} (${i.overs})`).join("   ·   ")}
          logos={winner ? [<Logo key="w" team={winner} size={64} />, null] : undefined}
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
        <Frame tag="Innings break" accent={teamColor(firstTeam.id)} modeKey="break" event={event} eventPhoto={eventPhoto}>
          <TeamBlock team={firstTeam} />
          <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "center", padding: "0 34px", ...caps, fontWeight: 700, fontSize: 62 }}>
            {first.totalRuns}/{first.wickets} <span style={{ fontSize: 26, color: C.muted, marginLeft: 14 }}>({first.overs})</span>
          </motion.div>
          <Divider />
          <Message big={`${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win`} small={`from ${sb.maxOvers} overs`} />
        </Frame>
      );
    }
    const tossTeam = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Frame tag={tag} accent={C.accent} modeKey="pre" event={event} eventPhoto={eventPhoto}>
        <Message
          big={`${sb.teams.team1.name}  v  ${sb.teams.team2.name}`}
          small={tossTeam ? `${tossTeam.name} won the toss and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "Match starting soon"}
          logos={[<Logo key="a" team={sb.teams.team1} size={66} />, <Logo key="b" team={sb.teams.team2} size={66} />]}
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
    <Frame tag={tag} accent={teamColor(batting.id)} modeKey="live" event={event} eventPhoto={eventPhoto} freeHit={inning.freeHit}>
      <TeamBlock team={batting} />

      {/* the score */}
      <motion.div variants={slideIn(-24)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 28px", minWidth: 310 }}>
        <span style={{ ...caps, fontWeight: 700, fontSize: 80, lineHeight: 1, letterSpacing: 0.5, display: "inline-flex", alignItems: "baseline" }}>
          <Roll value={inning.totalRuns} />
          <span style={{ color: C.muted, margin: "0 3px", fontWeight: 400 }}>/</span>
          <Roll value={inning.wickets} />
        </span>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ ...caps, fontWeight: 600, fontSize: 36 }}>{inning.overs}</div>
          <Label style={{ fontSize: 15 }}>of {sb.maxOvers} ov</Label>
        </div>
      </motion.div>

      <Divider />

      {/* batters */}
      <motion.div variants={slideIn(-24)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", width: 440 }}>
        {inning.currentBatsmen.map((b) => (
          <BatterRow key={b.playerId} b={b} />
        ))}
        {inning.currentBatsmen.length === 0 && <Label>New batter</Label>}
      </motion.div>

      <Divider />

      {/* bowler and this over */}
      <motion.div variants={slideIn(-24)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 24px", width: 430 }}>
        {bowler ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, textTransform: "uppercase" }}>
            <Photo src={bowler.profilePicture} name={bowler.name} size={38} />
            <span style={{ fontWeight: 600, fontSize: 31, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{bowler.name}</span>
            <span style={{ fontWeight: 600, fontSize: 28, color: C.soft }}>
              {bowler.overs}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets}
            </span>
          </div>
        ) : (
          <Label>Next bowler</Label>
        )}
        <motion.div variants={stagger(0.04, 0.1)} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 32 }}>
          <Label style={{ fontSize: 15, marginRight: 4 }}>{bowler ? "This over" : "Last over"}</Label>
          {chips.slice(-8).map((c, i) => (
            <motion.span key={i} variants={pop} style={{ ...CHIP[c.kind], width: 33, minWidth: 33, height: 33, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 700, fontSize: c.text.length > 2 ? 14 : 21, padding: c.text.length > 2 ? "0 5px" : 0 }}>
              {c.text}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      <Divider />

      {/* the state of the game */}
      <motion.div variants={slideIn(-20)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", fontFamily: FONT, textTransform: "uppercase", overflow: "hidden", minWidth: 0 }}>
        {chase ? (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <Label>Target</Label>
              <span style={{ fontWeight: 700, fontSize: 34 }}>{inning.targetScore}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 28, color: need === 0 ? C.green : "#fff", letterSpacing: 1, lineHeight: 1.05, whiteSpace: "nowrap" }}>{need === 0 ? "Target reached" : `Need ${need} off ${left}`}</div>
            <Label style={{ fontSize: 15 }}>
              RRR {inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} · CRR {inning.runRate ? inning.runRate.toFixed(2) : "0.00"}
            </Label>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <Label>CRR</Label>
              <span style={{ fontWeight: 700, fontSize: 34 }}>{inning.runRate ? inning.runRate.toFixed(2) : "0.00"}</span>
            </div>
            {projected ? <div style={{ fontWeight: 600, fontSize: 27, color: C.soft, lineHeight: 1.05 }}>Projected {projected}</div> : null}
            <Label style={{ fontSize: 15, whiteSpace: "nowrap" }}>
              {bowling.name} bowling · Stand {inning.partnershipRuns}
            </Label>
          </>
        )}
      </motion.div>
    </Frame>
  );
}
