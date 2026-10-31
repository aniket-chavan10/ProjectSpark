import { AnimatePresence, motion } from "framer-motion";
import { apiOrigin } from "../../api/matchSocket";
import { ballsLeft, overChips, projectedScore, runsNeeded, sides, teamCode, teamColor } from "../Scoring/scoreUtils";

// Everything is drawn on a fixed 1920 x 1080 canvas (see OverlayPage), so sizes here are in canvas pixels.
const FONT = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', Impact, sans-serif";

const CHIP = {
  dot: { background: "rgba(255,255,255,0.14)", color: "#cbd5e1" },
  run: { background: "#ffffff", color: "#0b1330" },
  four: { background: "#0ea5e9", color: "#ffffff" },
  six: { background: "#a855f7", color: "#ffffff" },
  wicket: { background: "#ef4444", color: "#ffffff" },
  extra: { background: "#f59e0b", color: "#1f1300" },
};

const BANNER = {
  four: ["#0369a1", "#0ea5e9"],
  six: ["#6b21a8", "#c026d3"],
  wicket: ["#991b1b", "#ef4444"],
  milestone: ["#a16207", "#fbbf24"],
};

const logoUrl = (team) => (team.logo ? (/^https?:/.test(team.logo) ? team.logo : `${apiOrigin()}/${String(team.logo).replace(/\\/g, "/").replace(/^\/+/, "")}`) : null);

function TeamSlab({ team, width = 190 }) {
  const logo = logoUrl(team);
  return (
    <div style={{ width, background: teamColor(team.id), display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: "100%", clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)", paddingRight: 14 }}>
      {logo ? <img src={logo} alt="" style={{ width: 66, height: 66, borderRadius: 33, objectFit: "cover", background: "#fff" }} /> : null}
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 56, letterSpacing: 2, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.35)" }}>{teamCode(team.name)}</span>
    </div>
  );
}

const Divider = () => <div style={{ width: 2, alignSelf: "stretch", margin: "14px 0", background: "linear-gradient(transparent, rgba(255,255,255,.25), transparent)" }} />;

const Label = ({ children, style }) => <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, letterSpacing: 3, color: "#94a3b8", textTransform: "uppercase", ...style }}>{children}</div>;

function Banner({ event }) {
  const [from, to] = BANNER[event.kind] || BANNER.four;
  return (
    <motion.div
      key={event.key}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      style={{ position: "absolute", right: 0, bottom: 132, minWidth: 560, height: 96, display: "flex", alignItems: "stretch", filter: "drop-shadow(0 10px 24px rgba(0,0,0,.45))" }}
    >
      <div style={{ background: `linear-gradient(90deg, ${from}, ${to})`, display: "flex", alignItems: "center", padding: "0 34px", clipPath: "polygon(0 0, 100% 0, 100% 100%, 5% 100%)" }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 68, letterSpacing: 4, color: "#fff", lineHeight: 1 }}>{event.title}</span>
      </div>
      <div style={{ background: "#0b1330", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", minWidth: 280 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, textTransform: "uppercase", letterSpacing: 1 }}>{event.name}</span>
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 24, color: "#cbd5e1", letterSpacing: 1 }}>{event.detail}</span>
      </div>
    </motion.div>
  );
}

function Shell({ tag, children, event }) {
  return (
    <div style={{ position: "absolute", left: 96, right: 96, bottom: 52 }}>
      <AnimatePresence>{event && <Banner event={event} />}</AnimatePresence>
      {tag && (
        <div style={{ display: "inline-block", fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: "#0b1330", background: "#fbbf24", padding: "4px 22px 3px", clipPath: "polygon(0 0, 100% 0, 96% 100%, 0 100%)", marginLeft: 0 }}>{tag}</div>
      )}
      <div style={{ display: "flex", alignItems: "stretch", height: 112, background: "linear-gradient(90deg, #0a1128 0%, #15235a 55%, #0a1128 100%)", borderRadius: "0 14px 14px 14px", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.08)", color: "#fff" }}>{children}</div>
    </div>
  );
}

const Message = ({ big, small }) => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "0 40px", textAlign: "center" }}>
    <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, letterSpacing: 3, textTransform: "uppercase", lineHeight: 1.05 }}>{big}</span>
    {small && <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: "#cbd5e1", letterSpacing: 2, textTransform: "uppercase" }}>{small}</span>}
  </div>
);

/** The broadcast-style bar along the bottom of the picture. */
export default function ScoreBug({ sb, inning, event, tournamentTag }) {
  const tag = tournamentTag || `Match ${sb.matchNo}`;

  /* ---- match over ---- */
  if (sb.status === "completed") {
    const r = sb.matchResult;
    const [a, b] = sb.innings;
    const nameOf = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1.name : sb.teams.team2.name);
    const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
    return (
      <Shell tag={tag}>
        <Message big={!r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`} small={[a, b].filter(Boolean).map((i) => `${teamCode(nameOf(i))} ${i.totalRuns}/${i.wickets} (${i.overs})`).join("   ·   ")} />
      </Shell>
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
        <Shell tag="Innings break">
          <TeamSlab team={firstTeam} />
          <div style={{ display: "flex", alignItems: "center", padding: "0 34px", fontFamily: FONT, fontWeight: 800, fontSize: 64 }}>
            {first.totalRuns}-{first.wickets} <span style={{ fontSize: 28, color: "#94a3b8", marginLeft: 14 }}>({first.overs})</span>
          </div>
          <Divider />
          <Message big={`${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win`} small={`from ${sb.maxOvers} overs`} />
        </Shell>
      );
    }
    const tossTeam = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
    return (
      <Shell tag={tag}>
        <Message big={`${sb.teams.team1.name}  v  ${sb.teams.team2.name}`} small={tossTeam ? `${tossTeam.name} won the toss and chose to ${sb.tossDecision === "bat" ? "bat" : "bowl"}` : "Match starting soon"} />
      </Shell>
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
    <Shell tag={tag} event={event}>
      {/* team and score */}
      <TeamSlab team={batting} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 30px", minWidth: 330 }}>
        <AnimatePresence mode="popLayout">
          <motion.span key={`${inning.totalRuns}-${inning.wickets}`} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} style={{ fontFamily: FONT, fontWeight: 800, fontSize: 78, lineHeight: 1, letterSpacing: 1 }}>
            {inning.totalRuns}-{inning.wickets}
          </motion.span>
        </AnimatePresence>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38 }}>{inning.overs}</div>
          <Label style={{ fontSize: 17 }}>of {sb.maxOvers} ov</Label>
        </div>
      </div>

      <Divider />

      {/* batters */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, padding: "0 28px", minWidth: 440 }}>
        {inning.currentBatsmen.map((b) => (
          <div key={b.playerId} style={{ display: "flex", alignItems: "baseline", gap: 12, fontFamily: FONT, textTransform: "uppercase" }}>
            <span style={{ width: 22, color: "#fbbf24", fontSize: 26 }}>{b.isOnStrike ? "▶" : ""}</span>
            <span style={{ flex: 1, fontWeight: b.isOnStrike ? 800 : 600, fontSize: 34, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: b.isOnStrike ? "#fff" : "#cbd5e1" }}>{b.name}</span>
            <span style={{ fontWeight: 800, fontSize: 38, minWidth: 54, textAlign: "right" }}>{b.runs}</span>
            <span style={{ fontWeight: 500, fontSize: 26, color: "#94a3b8", minWidth: 62 }}>({b.balls})</span>
          </div>
        ))}
        {inning.currentBatsmen.length === 0 && <Label>New batter</Label>}
      </div>

      <Divider />

      {/* bowler and this over */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 28px", minWidth: 470 }}>
        {bowler ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, fontFamily: FONT, textTransform: "uppercase" }}>
            <span style={{ fontWeight: 700, fontSize: 34, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 }}>{bowler.name}</span>
            <span style={{ fontWeight: 600, fontSize: 30, color: "#cbd5e1" }}>
              {bowler.overs}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets}
            </span>
          </div>
        ) : (
          <Label>Next bowler</Label>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Label style={{ fontSize: 17, marginRight: 6 }}>{bowler ? "This over" : "Last over"}</Label>
          {chips.slice(-8).map((c, i) => (
            <span key={i} style={{ ...CHIP[c.kind], width: 38, minWidth: 38, height: 38, borderRadius: 19, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: c.text.length > 2 ? 17 : 24, padding: c.text.length > 2 ? "0 6px" : 0 }}>
              {c.text}
            </span>
          ))}
        </div>
      </div>

      <Divider />

      {/* the state of the game */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", gap: 0, fontFamily: FONT, textTransform: "uppercase", overflow: "hidden" }}>
        {chase ? (
          <>
            <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
              <Label>Target</Label>
              <span style={{ fontWeight: 800, fontSize: 34 }}>{inning.targetScore}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 28, color: need === 0 ? "#4ade80" : "#fbbf24", letterSpacing: 1, lineHeight: 1.05 }}>{need === 0 ? "Target reached" : `Need ${need} off ${left}`}</div>
            <Label style={{ fontSize: 16 }}>RRR {inning.requiredRunRate ? inning.requiredRunRate.toFixed(2) : "0.00"} · CRR {inning.runRate ? inning.runRate.toFixed(2) : "0.00"}</Label>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
              <Label>CRR</Label>
              <span style={{ fontWeight: 800, fontSize: 34 }}>{inning.runRate ? inning.runRate.toFixed(2) : "0.00"}</span>
            </div>
            {projected ? <div style={{ fontWeight: 700, fontSize: 26, color: "#cbd5e1", lineHeight: 1.05 }}>Projected {projected}</div> : null}
            <Label style={{ fontSize: 16 }}>
              {bowling.name} bowling · Partnership {inning.partnershipRuns}
            </Label>
          </>
        )}
      </div>

      {inning.freeHit && (
        <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ position: "absolute", right: 22, top: -20, background: "#fbbf24", color: "#1f1300", fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: 4, padding: "4px 20px 2px", borderRadius: 6 }}>
          FREE HIT
        </motion.div>
      )}
    </Shell>
  );
}
