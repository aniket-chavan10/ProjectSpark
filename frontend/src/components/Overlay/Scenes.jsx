import { AnimatePresence, motion } from "framer-motion";
import { ballsLeft, overChips, runsNeeded, sides, teamColor } from "../Scoring/scoreUtils";
import { C, caps, Divider, EASE, FONT, GLASS, graphic, Letters, Logo, Photo, photoLookup, pop, rise, SHADOW, slideIn, stagger, Tag, TeamSlab } from "./bc";

// The extra screens the operator can put on air. Each one is built like the score bar: coloured layers wipe in
// first, then the content arrives row by row, then a light crosses it. The score bar stays at the bottom;
// "panels" fill the middle of the picture, "thirds" sit just above the score bar.

const CHIP = { dot: "#3b475f", run: "#e8edf6", four: "#4a6c9d", six: "#5d5497", wicket: "#b8433e", extra: "#7b879d" };

/* --------------------------------- frames --------------------------------- */

/** A big panel in the middle of the picture: plain navy card, a thin edge in the accent colour on top. */
function Panel({ children, wide, accent = C.accent, title, sub, tag }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={graphic(0.045, 0.24)}
      style={{ position: "absolute", left: wide ? 120 : 220, right: wide ? 120 : 220, bottom: 238, maxHeight: 790, fontFamily: FONT, color: "#fff", background: GLASS, borderTop: `4px solid ${accent}`, boxShadow: `${SHADOW}, inset 0 0 0 1px rgba(255,255,255,.07)`, overflow: "hidden" }}
    >
      <div style={{ padding: "26px 52px 28px" }}>
        {(title || tag) && (
          <motion.div variants={slideIn(-30)} style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            {title && <span style={{ ...caps, fontWeight: 700, fontSize: 50, lineHeight: 1, letterSpacing: 3 }}>{title}</span>}
            {sub && <span style={{ ...caps, fontWeight: 500, fontSize: 28, color: C.muted, letterSpacing: 2 }}>{sub}</span>}
            {tag}
          </motion.div>
        )}
        {children}
      </div>
    </motion.div>
  );
}

/** A strip just above the score bar. */
function Third({ children, label, accent = C.accent, labelColor }) {
  return (
    <motion.div initial="hidden" animate="show" exit="exit" variants={graphic(0.07, 0.22)} style={{ position: "absolute", left: 96, right: 96, bottom: 238, fontFamily: FONT, color: "#fff" }}>
      {label && <Tag color={labelColor || accent}>{label}</Tag>}
      <div style={{ position: "relative", minHeight: 124, background: GLASS, boxShadow: `${SHADOW}, inset 0 1px 0 rgba(255,255,255,.1)`, borderBottom: `4px solid ${accent}` }}>
        <div style={{ display: "flex", alignItems: "stretch", minHeight: 120 }}>{children}</div>
      </div>
    </motion.div>
  );
}

const Cell = ({ children, grow, style }) => (
  <motion.div variants={slideIn(-26)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 34px", flex: grow ? 1 : "none", minWidth: 0, ...style }}>
    {children}
  </motion.div>
);
const Big = ({ children, size = 52, color }) => <span style={{ ...caps, fontWeight: 700, fontSize: size, lineHeight: 1.05, letterSpacing: 1.5, color: color || "#fff" }}>{children}</span>;
const Small = ({ children, color = C.muted, size = 26 }) => <span style={{ ...caps, fontWeight: 500, fontSize: size, color, letterSpacing: 1.5 }}>{children}</span>;
const Sep = () => <motion.div variants={rise}><Divider /></motion.div>;

const teamOfId = (data, id) => data.teams.find((t) => Number(t.id) === Number(id)) || { id, name: `Team ${id}` };
const findCard = (scorecard, inningId) => (scorecard ? scorecard.innings.find((i) => i.inningId === inningId) : null);

const Badge = ({ children, bg, color = C.ink }) => <span style={{ ...caps, fontWeight: 700, fontSize: 21, background: bg, color, borderRadius: 3, padding: "1px 9px", letterSpacing: 1 }}>{children}</span>;

/* --------------------------------- the scenes --------------------------------- */

function SquadColumn({ team, squad, big }) {
  const playing = squad ? squad.playing : [];
  const reserves = squad ? squad.reserves : [];
  const row = big ? 60 : 48;
  const photo = big ? 48 : 40;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <motion.div variants={slideIn(-80)} style={{ marginBottom: 12 }}>
        <TeamSlab team={team} size={big ? 52 : 42} height={big ? 78 : 64} />
      </motion.div>
      <div>
        {playing.length === 0 && <Small>Squad not announced yet</Small>}
        {playing.map((p, i) => (
          <motion.div key={p.player_id} variants={slideIn(-50)} style={{ display: "flex", alignItems: "center", gap: 16, height: row, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <span style={{ width: 42, ...caps, fontWeight: 800, fontSize: 28, color: C.muted, textAlign: "right" }}>{p.jersey_number ?? i + 1}</span>
            <Photo src={p.profile_picture} name={p.players_name} size={photo} ring={teamColor(team.id)} ringWidth={3} />
            <span style={{ ...caps, fontWeight: 700, fontSize: big ? 36 : 32, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.players_name}</span>
            {p.is_captain && <Badge bg="rgba(255,255,255,.85)">C</Badge>}
            {p.is_keeper && <Badge bg="#8fa9cf">WK</Badge>}
          </motion.div>
        ))}
      </div>
      {reserves.length > 0 && (
        <motion.div variants={rise} style={{ marginTop: 12 }}>
          <Small size={22}>Reserves: {reserves.map((p) => p.players_name).join(", ")}</Small>
        </motion.div>
      )}
    </div>
  );
}

function SquadsScene({ data, payload }) {
  const shown = payload.teamId ? [teamOfId(data, payload.teamId)] : data.teams;
  return (
    <Panel wide={shown.length > 1} title="Playing XI" sub={data.tournament ? data.tournament.name : null}>
      <div style={{ display: "flex", gap: 56 }}>
        {shown.map((t) => (
          <SquadColumn key={t.id} team={t} squad={data.squads[t.id]} big={shown.length === 1} />
        ))}
      </div>
    </Panel>
  );
}

function TossScene({ sb }) {
  const winner = sb.tossWinnerId ? (sb.tossWinnerId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2) : null;
  return (
    <Third label="Toss" accent={winner ? teamColor(winner.id) : C.gold} >
      {winner && (
        <Cell>
          <Logo team={winner} size={92} />
        </Cell>
      )}
      <Cell grow>
        <Big size={58}>{winner ? `${winner.name} won the toss` : "Toss yet to happen"}</Big>
        {winner && <Small size={34} color={C.soft}>and chose to {sb.tossDecision === "bat" ? "bat first" : "bowl first"}</Small>}
      </Cell>
      {winner && (
        <Cell>
          <span style={{ ...caps, fontWeight: 700, fontSize: 40, color: "#fff", padding: "4px 26px", border: "2px solid rgba(255,255,255,.5)" }}>{sb.tossDecision === "bat" ? "BAT" : "BOWL"}</span>
        </Cell>
      )}
    </Third>
  );
}

const PlayerCell = ({ name, photo, role, ring }) => (
  <Cell grow>
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <Photo src={photo} name={name} size={86} ring={ring} ringWidth={4} />
      <div style={{ minWidth: 0 }}>
        <Small size={22}>{role}</Small>
        <div><Big size={46}>{name}</Big></div>
      </div>
    </div>
  </Cell>
);

function OpenersScene({ sb, inning, scorecard, photoOf }) {
  const { batting, bowling } = sides(sb, inning);
  const card = findCard(scorecard, inning.inningId);
  const openers = card && card.batting.length ? card.batting.slice(0, 2).map((b) => ({ id: b.playerId, name: b.name })) : inning.currentBatsmen.map((b) => ({ id: b.playerId, name: b.name }));
  const bowler = card && card.bowling.length ? { id: card.bowling[0].playerId, name: card.bowling[0].name } : inning.currentBowler ? { id: inning.currentBowler.playerId, name: inning.currentBowler.name } : null;
  return (
    <Third label={`${batting.name} innings`} accent={teamColor(batting.id)}>
      {openers.length ? openers.map((o) => <PlayerCell key={o.id} name={o.name} photo={photoOf(o.id)} role="Opening batter" ring={teamColor(batting.id)} />) : <Cell grow><Big>To be decided</Big></Cell>}
      <Sep />
      {bowler ? <PlayerCell name={bowler.name} photo={photoOf(bowler.id)} role={`Opening bowler · ${bowling.name}`} ring={teamColor(bowling.id)} /> : <Cell grow><Big>To be decided</Big></Cell>}
    </Third>
  );
}

function BatterBlock({ b, ring }) {
  return (
    <Cell grow>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Photo src={b.profilePicture} name={b.name} size={88} ring={b.isOnStrike ? C.gold : ring} ringWidth={4} />
        <div style={{ minWidth: 0 }}>
          <Big size={44}>{b.name}{b.isOnStrike ? <span style={{ color: C.gold }}> *</span> : null}</Big>
          <div>
            <span style={{ ...caps, fontWeight: 800, fontSize: 56, lineHeight: 1 }}>{b.runs ?? 0}</span>
            <span style={{ ...caps, fontWeight: 600, fontSize: 30, color: C.muted, marginLeft: 8 }}>({b.balls ?? 0})</span>
            <span style={{ ...caps, fontWeight: 600, fontSize: 26, color: C.soft, marginLeft: 22 }}>4s {b.fours ?? 0} &nbsp; 6s {b.sixes ?? 0} &nbsp; SR {b.strikeRate ?? 0}</span>
          </div>
        </div>
      </div>
    </Cell>
  );
}

function BattersScene({ inning, sb }) {
  const { batting } = sides(sb, inning);
  const list = inning.currentBatsmen;
  return (
    <Third label={`${batting.name} · ${inning.totalRuns}/${inning.wickets}`} accent={teamColor(batting.id)}>
      {list.length === 0 && (
        <Cell grow>
          <Big>Batters to come out</Big>
        </Cell>
      )}
      {list.map((b, i) => (
        <div key={b.playerId} style={{ display: "contents" }}>
          {i > 0 && <Sep />}
          <BatterBlock b={b} ring={teamColor(batting.id)} />
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
    <Third label={`${bowling.name} bowling`} accent={teamColor(bowling.id)}>
      {!b ? (
        <Cell grow>
          <Big>Bowler to be chosen</Big>
        </Cell>
      ) : (
        <>
          <Cell grow>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Photo src={b.profilePicture} name={b.name} size={88} ring={teamColor(bowling.id)} ringWidth={4} />
              <div>
                <Big size={48}>{b.name}</Big>
                <div>
                  <Small size={34} color="#fff">{b.overs} ov &nbsp; {b.maidens} M &nbsp; {b.runsConceded} R &nbsp; <span style={{ color: C.gold }}>{b.wickets} W</span></Small>
                  <Small size={26}> &nbsp; Econ {b.economy ?? "0.00"}</Small>
                </div>
              </div>
            </div>
          </Cell>
          <Sep />
          <Cell>
            <Small>This over</Small>
            <motion.div variants={stagger(0.06, 0.1)} style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {chips.length === 0 && <Small>—</Small>}
              {chips.map((c, i) => (
                <motion.span key={i} variants={pop} style={{ minWidth: 48, height: 48, borderRadius: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px", background: CHIP[c.kind] || CHIP.run, color: c.kind === "run" || c.kind === "extra" ? "#0b1330" : "#fff", ...caps, fontWeight: 800, fontSize: 28 }}>
                  {c.text}
                </motion.span>
              ))}
            </motion.div>
          </Cell>
        </>
      )}
    </Third>
  );
}

/** Before the toss: the two teams face to face, with the match and the tournament. */
function PreviewScene({ data, sb }) {
  const [a, b] = data.teams;
  const stage = data.stage === "group" ? (data.group ? `Group ${data.group}` : "Group stage") : data.stage === "semi" ? "Semi-final" : data.stage === "third_place" ? "Third place" : data.stage === "final" ? "Final" : "";
  return (
    <Panel wide accent={C.accent} title={data.tournament ? data.tournament.name : "Match"} sub={[stage, `Match ${sb.matchNo}`].filter(Boolean).join(" · ")}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 40, padding: "28px 0 20px" }}>
        {[a, b].map((t, i) => (
          <motion.div key={t.id} variants={slideIn(i ? 60 : -60)} style={{ display: "flex", flexDirection: i ? "row-reverse" : "row", alignItems: "center", gap: 32, justifyContent: i ? "flex-start" : "flex-end" }}>
            <Logo team={t} size={170} />
            <span style={{ ...caps, fontWeight: 700, fontSize: 70, lineHeight: 1, letterSpacing: 2, textAlign: i ? "left" : "right" }}>{t.name}</span>
          </motion.div>
        ))}
        <motion.div variants={pop} style={{ ...caps, fontWeight: 600, fontSize: 40, color: C.muted, letterSpacing: 6, order: 0, gridColumn: 2, gridRow: 1 }}>V</motion.div>
      </div>
      <motion.div variants={rise} style={{ display: "flex", justifyContent: "center", gap: 48, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <Small size={30} color={C.soft}>{sb.maxOvers} overs a side</Small>
        {(data.venue || sb.venue) && <Small size={30} color={C.soft}>{data.venue || sb.venue}</Small>}
      </motion.div>
    </Panel>
  );
}

/** The over that was just bowled: every ball, the runs, the bowler and the score after it. */
function OverSummaryScene({ sb, inning, scorecard }) {
  const { bowling } = sides(sb, inning);
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
    <Third label={`End of over ${overNo}`} accent={teamColor(bowling.id)}>
      <Cell>
        <Small>This over</Small>
        <Big size={84}>{runsInOver}<span style={{ fontSize: 34, color: C.muted }}> run{runsInOver === 1 ? "" : "s"}{wicketsInOver ? ` · ${wicketsInOver} wkt` : ""}</span></Big>
      </Cell>
      <Sep />
      <Cell grow>
        <motion.div variants={stagger(0.06, 0.1)} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {chips.map((c, i) => (
            <motion.span key={i} variants={pop} style={{ minWidth: 58, height: 58, borderRadius: 29, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", background: CHIP[c.kind] || CHIP.run, color: c.kind === "run" ? C.ink : "#fff", ...caps, fontWeight: 700, fontSize: 32 }}>
              {c.text}
            </motion.span>
          ))}
        </motion.div>
      </Cell>
      {person && (
        <>
          <Sep />
          <Cell>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Photo src={person.profilePicture} name={person.name} size={64} />
              <div>
                <Big size={36}>{person.name}</Big>
                {stats && <div><Small size={28} color={C.soft}>{stats.overs}-{stats.maidens}-{stats.runs}-{stats.wickets}</Small></div>}
              </div>
            </div>
          </Cell>
        </>
      )}
      <Sep />
      <Cell>
        <Small>{sides(sb, inning).batting.name}</Small>
        <Big size={56}>{inning.totalRuns}/{inning.wickets}</Big>
      </Cell>
    </Third>
  );
}

function PartnershipScene({ inning, sb }) {
  const { batting } = sides(sb, inning);
  const [a, b] = inning.currentBatsmen;
  return (
    <Third label="Partnership" accent={teamColor(batting.id)}>
      <Cell>
        <Big size={96}>{inning.partnershipRuns || 0}</Big>
        <Small>runs together</Small>
      </Cell>
      <Sep />
      {a && <BatterBlock b={a} ring={teamColor(batting.id)} />}
      {b && <Sep />}
      {b && <BatterBlock b={b} ring={teamColor(batting.id)} />}
    </Third>
  );
}

function LastWicketScene({ inning, photoOf }) {
  const w = inning.lastWicket;
  const falls = inning.wicketFalls || [];
  return (
    <Third label="Fall of wicket" accent={C.red}>
      {!w ? (
        <Cell grow>
          <Big>No wicket has fallen</Big>
        </Cell>
      ) : (
        <>
          <Cell>
            <Photo src={photoOf(w.playerOutId)} name={w.playerOutName} size={92} ring={C.red} ringWidth={4} />
          </Cell>
          <Cell grow>
            <Big size={54}>{w.playerOutName}</Big>
            <Small size={32} color={C.soft}>{w.description || "out"}</Small>
          </Cell>
          <Sep />
          <Cell>
            <Small>Score</Small>
            <Big size={52}>{inning.totalRuns}/{inning.wickets}</Big>
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
      <Third label="Projected" accent={teamColor(batting.id)}>
        <Cell grow>
          <Big size={54}>{batting.name}: {inning.totalRuns}/{inning.wickets}</Big>
          <Small size={30} color={C.soft}>Run rate {inning.runRate} · {sb.maxOvers} overs match</Small>
        </Cell>
      </Third>
    );
  }
  const left = ballsLeft(sb, inning);
  return (
    <Third label="Target" accent={teamColor(batting.id)}>
      <Cell>
        <Small>Target</Small>
        <Big size={78}>{inning.targetScore}</Big>
      </Cell>
      <Sep />
      <Cell grow>
        <Big size={56}>{batting.name} need {need} run{need === 1 ? "" : "s"}</Big>
        <Small size={32} color={C.soft}>from {left} ball{left === 1 ? "" : "s"}{inning.requiredRunRate ? ` · required rate ${Number(inning.requiredRunRate).toFixed(2)}` : ""}</Small>
      </Cell>
    </Third>
  );
}

const Th = ({ children, w, left }) => <th style={{ ...caps, fontWeight: 600, fontSize: 22, color: C.muted, textAlign: left ? "left" : "right", padding: "0 8px 8px", width: w }}>{children}</th>;
const Td = ({ children, left, bold, color }) => <td style={{ ...caps, fontWeight: bold ? 800 : 600, fontSize: 31, textAlign: left ? "left" : "right", padding: "2px 8px", color: color || "#fff", whiteSpace: "nowrap", height: 46 }}>{children}</td>;
const Row = ({ children }) => <motion.tr variants={{ hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } }, exit: { opacity: 0 } }} style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>{children}</motion.tr>;

function ScorecardScene({ data, scorecard, payload, photoOf }) {
  const inn = scorecard ? scorecard.innings[(payload.innings || 1) - 1] : null;
  if (!inn) {
    return (
      <Panel title="Scorecard">
        <Small>This innings has not started.</Small>
      </Panel>
    );
  }
  const team = teamOfId(data, inn.teamId);
  return (
    <Panel wide accent={teamColor(team.id)}>
      <motion.div variants={slideIn(-80)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <TeamSlab team={team} size={56} height={86} />
        <span style={{ ...caps, fontWeight: 800, fontSize: 70 }}>
          {inn.runs}/{inn.wickets} <span style={{ fontSize: 32, color: C.muted }}>({inn.overs} ov)</span>
        </span>
      </motion.div>
      <div style={{ display: "flex", gap: 48 }}>
        <table style={{ flex: 1.3, borderCollapse: "collapse" }}>
          <thead>
            <tr><Th left>Batter</Th><Th w={80}>R</Th><Th w={80}>B</Th><Th w={60}>4s</Th><Th w={60}>6s</Th></tr>
          </thead>
          <motion.tbody variants={stagger(0.04, 0.1)}>
            {inn.batting.slice(0, 11).map((b) => (
              <Row key={b.playerId}>
                <Td left bold>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 12, verticalAlign: "middle" }}>
                    <Photo src={photoOf(b.playerId)} name={b.name} size={34} ringWidth={2} ring="rgba(255,255,255,.6)" />
                    {b.name}{b.status === "not out" ? " *" : ""}
                  </span>
                </Td>
                <Td bold>{b.runs}</Td><Td color={C.muted}>{b.balls}</Td><Td color={C.muted}>{b.fours}</Td><Td color={C.muted}>{b.sixes}</Td>
              </Row>
            ))}
          </motion.tbody>
        </table>
        <table style={{ flex: 1, borderCollapse: "collapse", alignSelf: "flex-start" }}>
          <thead>
            <tr><Th left>Bowler</Th><Th w={70}>O</Th><Th w={50}>M</Th><Th w={70}>R</Th><Th w={50}>W</Th></tr>
          </thead>
          <motion.tbody variants={stagger(0.04, 0.2)}>
            {inn.bowling.slice(0, 8).map((b) => (
              <Row key={b.playerId}>
                <Td left bold>{b.name}</Td><Td color={C.muted}>{b.overs}</Td><Td color={C.muted}>{b.maidens}</Td><Td color={C.muted}>{b.runs}</Td><Td bold color={C.gold}>{b.wickets}</Td>
              </Row>
            ))}
          </motion.tbody>
        </table>
      </div>
      <motion.div variants={rise} style={{ marginTop: 12 }}>
        <Small size={25}>Extras {inn.extras.total} (w {inn.extras.wides}, nb {inn.extras.noBalls}, b {inn.extras.byes}, lb {inn.extras.legByes})</Small>
      </motion.div>
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

function StarCard({ name, photo, big, small }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 40, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } }, exit: { opacity: 0 } }} style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 24px", background: "rgba(255,255,255,.05)", borderRadius: 4, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.09)" }}>
      <Photo src={photo} name={name} size={104} ring="rgba(255,255,255,.55)" ringWidth={3} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Big size={42}>{name}</Big>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ ...caps, fontWeight: 800, fontSize: 60, lineHeight: 1 }}>{big}</span>
        <div><Small size={26}>{small}</Small></div>
      </div>
    </motion.div>
  );
}

function SummaryScene({ sb, scorecard, photoOf }) {
  const { bats, bowls } = topPerformers(scorecard);
  return (
    <Panel title="Top performers" sub={sb.status === "completed" ? "Match summary" : "So far"}>
      <div style={{ display: "flex", gap: 44 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <Small size={28}>Batting</Small>
          {bats.map((b) => <StarCard key={b.playerId} name={b.name} photo={photoOf(b.playerId)} big={b.runs} small={`${b.balls} balls`} />)}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <Small size={28}>Bowling</Small>
          {bowls.map((b) => <StarCard key={b.playerId} name={b.name} photo={photoOf(b.playerId)} big={`${b.wickets}-${b.runs}`} small={`${b.overs} overs`} />)}
        </div>
      </div>
    </Panel>
  );
}

function ResultScene({ sb }) {
  const r = sb.matchResult;
  const margin = r && r.marginType === "tiebreak" ? "after a tie" : r && r.marginType === "wickets" ? `by ${r.marginValue} wicket${r.marginValue === 1 ? "" : "s"}` : r && r.marginType === "runs" ? `by ${r.marginValue} run${r.marginValue === 1 ? "" : "s"}` : "";
  const teamOf = (i) => (i.teamId === sb.teams.team1.id ? sb.teams.team1 : sb.teams.team2);
  const winnerId = r && r.winnerTeamId;
  return (
    <Panel title={sb.status === "completed" ? "Full time" : "Match in progress"} accent={winnerId ? teamColor(winnerId) : C.gold}>
      <div>
        {sb.innings.map((i) => {
          const t = teamOf(i);
          const won = winnerId && Number(winnerId) === Number(t.id);
          return (
            <motion.div key={i.inningId} variants={slideIn(-80)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 104, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
              <TeamSlab team={t} size={60} height={86} />
              <span style={{ ...caps, fontWeight: 800, fontSize: 80, color: won ? "#fff" : C.muted }}>
                {i.totalRuns}/{i.wickets} <span style={{ fontSize: 34, color: C.muted }}>({i.overs})</span>
              </span>
            </motion.div>
          );
        })}
      </div>
      <motion.div variants={rise} style={{ marginTop: 34, textAlign: "center" }}>
        <Big size={64} color="#fff">{sb.status !== "completed" ? "Match in progress" : !r ? "Match complete" : r.marginType === "tie" ? "Match tied" : `${r.winnerTeamName} won ${margin}`}</Big>
      </motion.div>
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
    <Third label="Player of the match" accent={teamColor(team.id)}>
      <Cell style={{ padding: "10px 34px" }}>
        <motion.div variants={pop}>
          <Photo src={p.photo} name={p.name} size={150} ring="rgba(255,255,255,.55)" ringWidth={3} />
        </motion.div>
      </Cell>
      <Cell grow>
        <Big size={66}>{p.name}</Big>
        <Small size={32} color={C.soft}>{team.name}</Small>
      </Cell>
      <Sep />
      <Cell>
        {bat && <Big size={50}>{bat.runs} <span style={{ fontSize: 28, color: C.muted }}>({bat.balls})</span></Big>}
        {bowl && bowl.legalBalls > 0 && <Big size={50}>{bowl.wickets}-{bowl.runs} <span style={{ fontSize: 28, color: C.muted }}>({bowl.overs})</span></Big>}
      </Cell>
    </Third>
  );
}

function RankingsScene({ rankings }) {
  const rows = (rankings || []).slice(0, 8);
  return (
    <Panel title="Top teams" sub="Association ranking">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><Th w={90} left>#</Th><Th left>Team</Th><Th w={140}>Played</Th><Th w={120}>Won</Th><Th w={160}>Points</Th></tr>
        </thead>
        <motion.tbody variants={stagger(0.06, 0.1)}>
          {rows.map((r) => (
            <Row key={r.teamId}>
              <Td left bold color={C.gold}>{r.rank}</Td>
              <Td left bold>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14, verticalAlign: "middle" }}>
                  <Logo team={{ id: r.teamId, name: r.name, logo: r.logo }} size={38} ring="rgba(255,255,255,.6)" />
                  {r.name}
                </span>
              </Td>
              <Td color={C.muted}>{r.played}</Td><Td color={C.muted}>{r.won}</Td><Td bold>{r.points}</Td>
            </Row>
          ))}
        </motion.tbody>
      </table>
      {rows.length === 0 && <Small>No ranking yet</Small>}
    </Panel>
  );
}

function MessageScene({ payload }) {
  return (
    <Third label="Spark">
      <Cell grow>
        <Letters text={payload.text} size={58} delay={0.35} style={{ flexWrap: "wrap" }} />
        {payload.subtext && <div style={{ marginTop: 6 }}><Small size={30} color={C.soft}>{payload.subtext}</Small></div>}
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
  const photoOf = photoLookup(sb, data);
  let node = null;
  if (data && sb && inning) {
    switch (scene) {
      case "preview": node = <PreviewScene key="preview" data={data} sb={sb} />; break;
      case "over_summary": node = <OverSummaryScene key={`over${inning.ballsBowled}`} sb={sb} inning={inning} scorecard={scorecard} />; break;
      case "squads": node = <SquadsScene key={`squads${payload.teamId || ""}`} data={data} payload={payload} />; break;
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

/** Scenes that need the full scorecard / the team ranking loaded. */
export const NEEDS_SCORECARD = ["openers", "scorecard", "summary", "potm", "over_summary"];
export const NEEDS_RANKINGS = ["rankings"];
