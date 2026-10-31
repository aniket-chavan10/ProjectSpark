import { AnimatePresence, motion } from "framer-motion";
import { fileUrl } from "../../api/sparkApi";
import { ballsLeft, overChips, runsNeeded, sides, teamCode, teamColor } from "../Scoring/scoreUtils";

// The extra screens the operator can put on air (squads, scorecard, openers ...). Drawn on the same fixed
// 1920 x 1080 canvas as the score bar, so sizes are canvas pixels. The score bar stays at the bottom;
// "panels" fill the middle of the picture, "thirds" sit just above the score bar.

const FONT = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', Impact, sans-serif";
const PANEL_BG = "linear-gradient(160deg, rgba(10,17,40,.96) 0%, rgba(21,35,90,.96) 60%, rgba(10,17,40,.96) 100%)";
const CHIP = { dot: "#475569", run: "#ffffff", four: "#0ea5e9", six: "#a855f7", wicket: "#ef4444", extra: "#f59e0b" };

const caps = { fontFamily: FONT, textTransform: "uppercase", letterSpacing: 2 };
const muted = "#94a3b8";

function Slab({ team, big }) {
  return (
    <div style={{ background: teamColor(team.id), color: "#fff", ...caps, fontWeight: 800, fontSize: big ? 46 : 40, padding: big ? "6px 30px" : "6px 22px", clipPath: "polygon(0 0, 100% 0, 96% 100%, 0 100%)", display: "inline-block" }}>
      {team.name || teamCode(team.name)}
    </div>
  );
}

const Heading = ({ children, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 18 }}>
    <span style={{ ...caps, fontWeight: 800, fontSize: 56, color: "#fff", lineHeight: 1 }}>{children}</span>
    {sub && <span style={{ ...caps, fontWeight: 600, fontSize: 30, color: muted }}>{sub}</span>}
  </div>
);

/** A big panel in the middle of the picture. */
function Panel({ children, wide }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      style={{ position: "absolute", left: wide ? 120 : 220, right: wide ? 120 : 220, bottom: 200, maxHeight: 810, background: PANEL_BG, borderRadius: 18, padding: "28px 48px", color: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.1)", overflow: "hidden", fontFamily: FONT }}
    >
      {children}
    </motion.div>
  );
}

/** A strip just above the score bar. */
function Third({ children, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      style={{ position: "absolute", left: 96, right: 96, bottom: 202, filter: "drop-shadow(0 12px 28px rgba(0,0,0,.5))" }}
    >
      {label && <div style={{ display: "inline-block", ...caps, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: "#0b1330", background: "#fbbf24", padding: "4px 22px 3px", clipPath: "polygon(0 0, 100% 0, 96% 100%, 0 100%)" }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "stretch", minHeight: 120, background: PANEL_BG, borderRadius: "0 14px 14px 14px", color: "#fff", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.1)" }}>{children}</div>
    </motion.div>
  );
}

const Cell = ({ children, grow, style }) => <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px 34px", flex: grow ? 1 : "none", fontFamily: FONT, ...style }}>{children}</div>;
const Big = ({ children, size = 52 }) => <span style={{ ...caps, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: 1.5 }}>{children}</span>;
const Small = ({ children, color = muted, size = 26 }) => <span style={{ ...caps, fontWeight: 600, fontSize: size, color, letterSpacing: 1.5 }}>{children}</span>;
const Rule = () => <div style={{ width: 2, alignSelf: "stretch", margin: "14px 0", background: "linear-gradient(transparent, rgba(255,255,255,.25), transparent)" }} />;

const Photo = ({ src, name, size = 150 }) => {
  const url = fileUrl(src);
  const initials = String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return url ? (
    <img src={url} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", background: "#1e293b", border: "4px solid rgba(255,255,255,.85)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: "#1e293b", border: "4px solid rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center", ...caps, fontWeight: 800, fontSize: size / 2.6 }}>{initials || "?"}</div>
  );
};

const teamOfId = (data, id) => data.teams.find((t) => Number(t.id) === Number(id)) || { id, name: `Team ${id}` };
const findCard = (scorecard, inningId) => (scorecard ? scorecard.innings.find((i) => i.inningId === inningId) : null);

/* ------------------------------- the scenes ------------------------------- */

function SquadColumn({ team, squad }) {
  const playing = squad ? squad.playing : [];
  const reserves = squad ? squad.reserves : [];
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Slab team={team} big />
      <div style={{ marginTop: 10 }}>
        {playing.length === 0 && <Small>Squad not announced yet</Small>}
        {playing.map((p, i) => (
          <div key={p.player_id} style={{ display: "flex", alignItems: "center", gap: 16, height: 44, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <span style={{ width: 44, ...caps, fontWeight: 700, fontSize: 28, color: muted, textAlign: "right" }}>{p.jersey_number ?? i + 1}</span>
            <span style={{ ...caps, fontWeight: 700, fontSize: 34, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.players_name}</span>
            {p.is_captain && <span style={{ ...caps, fontWeight: 800, fontSize: 24, background: "#fbbf24", color: "#0b1330", borderRadius: 6, padding: "1px 10px" }}>C</span>}
            {p.is_keeper && <span style={{ ...caps, fontWeight: 800, fontSize: 24, background: "#38bdf8", color: "#0b1330", borderRadius: 6, padding: "1px 10px" }}>WK</span>}
          </div>
        ))}
      </div>
      {reserves.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Small size={24}>Reserves: {reserves.map((p) => p.players_name).join(", ")}</Small>
        </div>
      )}
    </div>
  );
}

function SquadsScene({ data, payload }) {
  const shown = payload.teamId ? [teamOfId(data, payload.teamId)] : data.teams;
  return (
    <Panel wide={shown.length > 1}>
      <Heading sub={data.tournament ? data.tournament.name : null}>{shown.length > 1 ? "Playing XI" : "Playing XI"}</Heading>
      <div style={{ display: "flex", gap: 56 }}>
        {shown.map((t) => (
          <SquadColumn key={t.id} team={t} squad={data.squads[t.id]} />
        ))}
      </div>
    </Panel>
  );
}

function TossScene({ sb }) {
  const winner = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
  return (
    <Third label="Toss">
      <Cell grow>
        <Big size={58}>{winner ? `${winner.name} won the toss` : "Toss yet to happen"}</Big>
        {winner && <Small size={34} color="#e2e8f0">and chose to {sb.tossDecision === "bat" ? "bat first" : "bowl first"}</Small>}
      </Cell>
    </Third>
  );
}

function BatterBlock({ b, mark }) {
  return (
    <Cell grow>
      <Big size={46}>
        {mark}
        {b.name}
      </Big>
      <Small size={32} color="#e2e8f0">
        {b.runs ?? 0} <span style={{ color: muted }}>({b.balls ?? 0})</span> &nbsp; 4s {b.fours ?? 0} &nbsp; 6s {b.sixes ?? 0} &nbsp; SR {b.strikeRate ?? 0}
      </Small>
    </Cell>
  );
}

function OpenersScene({ sb, inning, scorecard }) {
  const { batting, bowling } = sides(sb, inning);
  const card = findCard(scorecard, inning.inningId);
  const openers = card && card.batting.length ? card.batting.slice(0, 2).map((b) => b.name) : inning.currentBatsmen.map((b) => b.name);
  const bowler = card && card.bowling.length ? card.bowling[0].name : inning.currentBowler ? inning.currentBowler.name : null;
  return (
    <Third label={`${batting.name} innings`}>
      <Cell grow>
        <Small>Opening batters</Small>
        <Big size={48}>{openers.length ? openers.join("  &  ") : "To be decided"}</Big>
      </Cell>
      <Rule />
      <Cell grow>
        <Small>Opening bowler · {bowling.name}</Small>
        <Big size={48}>{bowler || "To be decided"}</Big>
      </Cell>
    </Third>
  );
}

function BattersScene({ inning, sb }) {
  const { batting } = sides(sb, inning);
  const list = inning.currentBatsmen;
  return (
    <Third label={`${batting.name} · ${inning.totalRuns}/${inning.wickets}`}>
      {list.length === 0 && (
        <Cell grow>
          <Big>Batters to come out</Big>
        </Cell>
      )}
      {list.map((b, i) => (
        <div key={b.playerId} style={{ display: "contents" }}>
          {i > 0 && <Rule />}
          <BatterBlock b={b} mark={b.isOnStrike ? "▶ " : ""} />
        </div>
      ))}
    </Third>
  );
}

function BowlerScene({ inning, sb }) {
  const { bowling } = sides(sb, inning);
  const b = inning.currentBowler;
  const chips = overChips(inning);
  return (
    <Third label={`${bowling.name} bowling`}>
      {!b ? (
        <Cell grow>
          <Big>Bowler to be chosen</Big>
        </Cell>
      ) : (
        <>
          <Cell grow>
            <Big size={50}>{b.name}</Big>
            <Small size={34} color="#e2e8f0">
              {b.overs} ov &nbsp; {b.maidens} M &nbsp; {b.runsConceded} R &nbsp; {b.wickets} W &nbsp; <span style={{ color: muted }}>Econ {b.economy ?? "0.00"}</span>
            </Small>
          </Cell>
          <Rule />
          <Cell>
            <Small>This over</Small>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {chips.length === 0 && <Small>—</Small>}
              {chips.map((c, i) => (
                <span key={i} style={{ minWidth: 46, height: 46, borderRadius: 23, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px", background: CHIP[c.kind] || CHIP.run, color: c.kind === "run" || c.kind === "extra" ? "#0b1330" : "#fff", ...caps, fontWeight: 800, fontSize: 28 }}>
                  {c.text}
                </span>
              ))}
            </div>
          </Cell>
        </>
      )}
    </Third>
  );
}

function PartnershipScene({ inning }) {
  const [a, b] = inning.currentBatsmen;
  return (
    <Third label="Partnership">
      <Cell>
        <Big size={86}>{inning.partnershipRuns || 0}</Big>
        <Small>runs</Small>
      </Cell>
      <Rule />
      {a && <BatterBlock b={a} mark={a.isOnStrike ? "▶ " : ""} />}
      {b && <Rule />}
      {b && <BatterBlock b={b} mark={b.isOnStrike ? "▶ " : ""} />}
    </Third>
  );
}

function LastWicketScene({ inning }) {
  const w = inning.lastWicket;
  const falls = inning.wicketFalls || [];
  return (
    <Third label="Fall of wicket">
      {!w ? (
        <Cell grow>
          <Big>No wicket has fallen</Big>
        </Cell>
      ) : (
        <>
          <Cell grow>
            <Big size={52}>{w.playerOutName}</Big>
            <Small size={32} color="#e2e8f0">{w.description || "out"}</Small>
          </Cell>
          <Rule />
          <Cell>
            <Small>Score</Small>
            <Big size={48}>
              {inning.totalRuns}/{inning.wickets}
            </Big>
            <Small>{falls.length ? `${falls.length} down` : ""} {w.over ? `· ${w.over} ov` : ""}</Small>
          </Cell>
        </>
      )}
    </Third>
  );
}

function TargetScene({ sb, inning }) {
  const { batting } = sides(sb, inning);
  const need = runsNeeded(inning);
  if (inning.inningsNumber < 2 || need === null) {
    return (
      <Third label="Projected">
        <Cell grow>
          <Big size={52}>{batting.name}: {inning.totalRuns}/{inning.wickets}</Big>
          <Small size={30} color="#e2e8f0">Run rate {inning.runRate} · {sb.maxOvers} overs match</Small>
        </Cell>
      </Third>
    );
  }
  const left = ballsLeft(sb, inning);
  return (
    <Third label="Target">
      <Cell>
        <Small>Target</Small>
        <Big size={70}>{inning.targetScore}</Big>
      </Cell>
      <Rule />
      <Cell grow>
        <Big size={54}>{batting.name} need {need} run{need === 1 ? "" : "s"}</Big>
        <Small size={32} color="#e2e8f0">from {left} ball{left === 1 ? "" : "s"}{inning.requiredRunRate ? ` · required rate ${Number(inning.requiredRunRate).toFixed(2)}` : ""}</Small>
      </Cell>
    </Third>
  );
}

const Th = ({ children, w, left }) => <th style={{ ...caps, fontWeight: 600, fontSize: 24, color: muted, textAlign: left ? "left" : "right", padding: "0 8px 6px", width: w }}>{children}</th>;
const Td = ({ children, left, bold, color }) => <td style={{ ...caps, fontWeight: bold ? 800 : 600, fontSize: 32, textAlign: left ? "left" : "right", padding: "3px 8px", color: color || "#fff", whiteSpace: "nowrap" }}>{children}</td>;

function ScorecardScene({ data, scorecard, payload }) {
  const inn = scorecard ? scorecard.innings[(payload.innings || 1) - 1] : null;
  if (!inn) {
    return (
      <Panel>
        <Heading>Scorecard</Heading>
        <Small>This innings has not started.</Small>
      </Panel>
    );
  }
  const team = teamOfId(data, inn.teamId);
  return (
    <Panel wide>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Slab team={team} big />
        <span style={{ ...caps, fontWeight: 800, fontSize: 64 }}>
          {inn.runs}/{inn.wickets} <span style={{ fontSize: 32, color: muted }}>({inn.overs} ov)</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 48 }}>
        <table style={{ flex: 1.25, borderCollapse: "collapse" }}>
          <thead>
            <tr><Th left>Batter</Th><Th w={80}>R</Th><Th w={80}>B</Th><Th w={60}>4s</Th><Th w={60}>6s</Th></tr>
          </thead>
          <tbody>
            {inn.batting.slice(0, 11).map((b) => (
              <tr key={b.playerId}>
                <Td left bold>{b.name}{b.status === "not out" ? " *" : ""}</Td>
                <Td bold>{b.runs}</Td><Td color={muted}>{b.balls}</Td><Td color={muted}>{b.fours}</Td><Td color={muted}>{b.sixes}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ flex: 1, borderCollapse: "collapse", alignSelf: "flex-start" }}>
          <thead>
            <tr><Th left>Bowler</Th><Th w={70}>O</Th><Th w={50}>M</Th><Th w={70}>R</Th><Th w={50}>W</Th></tr>
          </thead>
          <tbody>
            {inn.bowling.slice(0, 8).map((b) => (
              <tr key={b.playerId}>
                <Td left bold>{b.name}</Td><Td color={muted}>{b.overs}</Td><Td color={muted}>{b.maidens}</Td><Td color={muted}>{b.runs}</Td><Td bold>{b.wickets}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <Small size={26}>Extras {inn.extras.total} (w {inn.extras.wides}, nb {inn.extras.noBalls}, b {inn.extras.byes}, lb {inn.extras.legByes})</Small>
      </div>
    </Panel>
  );
}

/** The best two batters and bowlers across both innings. */
function topPerformers(scorecard) {
  if (!scorecard) return { bats: [], bowls: [] };
  const bats = scorecard.innings.flatMap((i) => i.batting.map((b) => ({ ...b, teamId: i.teamId }))).sort((a, b) => b.runs - a.runs).slice(0, 2);
  const bowls = scorecard.innings.flatMap((i) => i.bowling).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 2);
  return { bats, bowls };
}

function SummaryScene({ sb, scorecard }) {
  const { bats, bowls } = topPerformers(scorecard);
  return (
    <Panel>
      <Heading sub={sb.status === "completed" ? "Match summary" : "So far"}>Top performers</Heading>
      <div style={{ display: "flex", gap: 56 }}>
        <div style={{ flex: 1 }}>
          <Small size={28}>Batting</Small>
          {bats.map((b) => (
            <div key={b.playerId} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 76, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
              <Big size={44}>{b.name}</Big>
              <span style={{ ...caps, fontWeight: 800, fontSize: 52 }}>{b.runs}<span style={{ fontSize: 28, color: muted }}> ({b.balls})</span></span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <Small size={28}>Bowling</Small>
          {bowls.map((b) => (
            <div key={b.playerId} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 76, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
              <Big size={44}>{b.name}</Big>
              <span style={{ ...caps, fontWeight: 800, fontSize: 52 }}>{b.wickets}-{b.runs}<span style={{ fontSize: 28, color: muted }}> ({b.overs})</span></span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ResultScene({ sb }) {
  const r = sb.matchResult;
  const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
  const nameOf = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
  return (
    <Panel>
      <Heading>{sb.status === "completed" ? "Full time" : "Match in progress"}</Heading>
      <div style={{ marginTop: 20 }}>
        {sb.innings.map((i) => (
          <div key={i.inningId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 96, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <Slab team={nameOf(i)} big />
            <span style={{ ...caps, fontWeight: 800, fontSize: 76 }}>{i.totalRuns}/{i.wickets} <span style={{ fontSize: 34, color: muted }}>({i.overs})</span></span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 34, textAlign: "center" }}>
        <Big size={72}>{sb.status !== "completed" ? "Match in progress" : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`}</Big>
      </div>
    </Panel>
  );
}

function PotmScene({ data, scorecard }) {
  const p = data.playerOfMatch || data.suggestedPlayerOfMatch;
  if (!p) {
    return (
      <Third label="Player of the match">
        <Cell grow>
          <Big>To be announced</Big>
        </Cell>
      </Third>
    );
  }
  const team = teamOfId(data, p.teamId);
  const bat = scorecard && scorecard.innings.flatMap((i) => i.batting).find((b) => b.playerId === p.id);
  const bowl = scorecard && scorecard.innings.flatMap((i) => i.bowling).find((b) => b.playerId === p.id);
  return (
    <Third label="Player of the match">
      <Cell style={{ padding: "14px 30px" }}>
        <Photo src={p.photo} name={p.name} size={120} />
      </Cell>
      <Cell grow>
        <Big size={60}>{p.name}</Big>
        <Small size={30} color="#e2e8f0">{team.name}</Small>
      </Cell>
      <Rule />
      <Cell>
        {bat && <Big size={44}>{bat.runs} <span style={{ fontSize: 26, color: muted }}>({bat.balls})</span></Big>}
        {bowl && bowl.legalBalls > 0 && <Big size={44}>{bowl.wickets}-{bowl.runs} <span style={{ fontSize: 26, color: muted }}>({bowl.overs})</span></Big>}
      </Cell>
    </Third>
  );
}

function RankingsScene({ rankings }) {
  const rows = (rankings || []).slice(0, 8);
  return (
    <Panel>
      <Heading sub="Association ranking">Top teams</Heading>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><Th w={90} left>#</Th><Th left>Team</Th><Th w={140}>Played</Th><Th w={120}>Won</Th><Th w={160}>Points</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teamId} style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
              <Td left bold color="#fbbf24">{r.rank}</Td><Td left bold>{r.name}</Td><Td color={muted}>{r.played}</Td><Td color={muted}>{r.won}</Td><Td bold>{r.points}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <Small>No ranking yet</Small>}
    </Panel>
  );
}

function MessageScene({ payload }) {
  return (
    <Third label="Spark">
      <Cell grow>
        <Big size={56}>{payload.text}</Big>
        {payload.subtext && <Small size={30} color="#e2e8f0">{payload.subtext}</Small>}
      </Cell>
    </Third>
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
  let node = null;
  if (data && sb && inning) {
    switch (scene) {
      case "squads": node = <SquadsScene key="squads" data={data} payload={payload} />; break;
      case "toss": node = <TossScene key="toss" sb={sb} />; break;
      case "openers": node = <OpenersScene key="openers" sb={sb} inning={inning} scorecard={scorecard} />; break;
      case "batters": node = <BattersScene key="batters" sb={sb} inning={inning} />; break;
      case "bowler": node = <BowlerScene key="bowler" sb={sb} inning={inning} />; break;
      case "partnership": node = <PartnershipScene key="partnership" inning={inning} />; break;
      case "last_wicket": node = <LastWicketScene key="last_wicket" inning={inning} />; break;
      case "scorecard": node = <ScorecardScene key={`scorecard${payload.innings}`} data={data} scorecard={scorecard} payload={payload} />; break;
      case "target": node = <TargetScene key="target" sb={sb} inning={inning} />; break;
      case "summary": node = <SummaryScene key="summary" sb={sb} scorecard={scorecard} />; break;
      case "result": node = <ResultScene key="result" sb={sb} />; break;
      case "potm": node = <PotmScene key="potm" data={data} scorecard={scorecard} />; break;
      case "rankings": node = <RankingsScene key="rankings" rankings={rankings} />; break;
      case "message": node = <MessageScene key={`message${payload.text}`} payload={payload} />; break;
      default: node = null;
    }
  }
  return <AnimatePresence mode="wait">{node}</AnimatePresence>;
}

/** Scenes that need the full scorecard / the team ranking loaded. */
export const NEEDS_SCORECARD = ["openers", "scorecard", "summary", "potm"];
export const NEEDS_RANKINGS = ["rankings"];
