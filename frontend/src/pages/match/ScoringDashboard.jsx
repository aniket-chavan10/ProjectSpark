import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuCircleStop, LuEllipsis, LuRefreshCw, LuUndo2, LuUserRoundX, LuWifi, LuWifiOff } from "react-icons/lu";
import scoringApi from "../../api/scoringApi";
import { watchMatch } from "../../api/matchSocket";
import { SparkMark } from "../../components/layout/AppShell";
import BroadcastMenu from "../../components/Scoring/BroadcastMenu";
import InningsSetup from "../../components/Scoring/InningsSetup";
import MatchResult from "../../components/Scoring/MatchResult";
import Modal from "../../components/Scoring/Modal";
import PlayerPicker from "../../components/Scoring/PlayerPicker";
import PlayersPanel from "../../components/Scoring/PlayersPanel";
import RetireModal from "../../components/Scoring/RetireModal";
import ScoreHero from "../../components/Scoring/ScoreHero";
import ScorePad from "../../components/Scoring/ScorePad";
import TieBreakPanel from "../../components/Scoring/TieBreakPanel";
import ScorecardPanel from "../../components/Scoring/ScorecardPanel";
import WicketModal from "../../components/Scoring/WicketModal";
import { Alert, Button, cx, LiveBadge } from "../../components/ui/kit";
import { ballToRedo, bowlerBlocked, currentInnings, figures, inningsStarted, nonStriker, sides, striker } from "../../components/Scoring/scoreUtils";

const stageText = (sb) => [`Match ${sb.matchNo}`, `${sb.maxOvers} overs`, sb.venue].filter(Boolean).join(" · ");

/**
 * The scorer's console. Everything the scorer does goes through the backend scoring engine, which refuses
 * anything against the Laws of Cricket; the screen only makes the right thing the easy thing.
 * The on-air graphics have their own screen (the operator console): the scorer only hands out its link.
 */
export default function ScoringDashboard({ matchId, initial, onExit }) {
  const [sb, setSb] = useState(initial);
  const [scorecard, setScorecard] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // "wicket" | "retire" | "survivor" | "end"
  const [menu, setMenu] = useState(false);
  const [redo, setRedo] = useState([]);
  const [link, setLink] = useState("connecting");
  const menuRef = useRef(null);

  const inning = currentInnings(sb);
  const { batting, bowling } = sides(sb, inning);
  const strikerNow = striker(inning);
  const nonStrikerNow = nonStriker(inning);

  /* ----------------------------- live data ----------------------------- */

  useEffect(() => watchMatch(matchId, { onScoreboard: setSb, onStatus: setLink }), [matchId]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const refresh = useCallback(async () => {
    setSb(await scoringApi.getScoreboard(matchId));
  }, [matchId]);

  // the full scorecard follows every ball (it is also what the bowler list needs)
  const cardKey = `${inning.inningId}:${inning.lastBallId}:${inning.wickets}:${sb.status}:${sb.innings.length}:${inning.currentBatsmen.map((b) => b.playerId).join("-")}`;
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      scoringApi
        .getScorecard(matchId)
        .then((c) => !cancelled && setScorecard(c))
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [matchId, cardKey]);

  /* ----------------------------- what is going on ----------------------------- */

  const matchDone = sb.status === "completed";
  const inningsDone = inning.status === "completed";
  const needOpeners = !matchDone && !inningsDone && !inningsStarted(inning);
  const needBatsman = !matchDone && !inningsDone && !needOpeners && !!inning.awaiting.batsmanEnd;
  const needBowler = !matchDone && !inningsDone && !needOpeners && inning.awaiting.bowler;
  const padOff = matchDone || inningsDone || needOpeners || needBatsman || needBowler;
  const padReason = matchDone ? "The match is over." : needBatsman ? "Choose the incoming batsman to carry on." : needBowler ? "Choose the next bowler to carry on." : inningsDone ? "This innings is complete." : "";

  /* ----------------------------- actions ----------------------------- */

  const run = useCallback(
    async (fn) => {
      setBusy(true);
      setError("");
      try {
        const res = await fn();
        if (res && res.data) setSb(res.data);
        return true;
      } catch (e) {
        setError(e.message);
        // a 409 means the scoreboard moved on (another scorer, a double tap): show the current one
        if (e.status === 409) refresh().catch(() => {});
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const ids = () => ({ inningId: inning.inningId, matchId });

  const sendBall = async (delivery, { keepRedo = false } = {}) => {
    if (!strikerNow || !inning.currentBowler) return false;
    const ok = await run(() =>
      scoringApi.registerBall({ ...ids(), batsmanId: strikerNow.playerId, bowlerId: inning.currentBowler.playerId, lastBallId: inning.lastBallId, ...delivery })
    );
    if (ok && !keepRedo) setRedo([]);
    return ok;
  };

  const onRun = useCallback((n) => sendBall({ runsScored: n }), [inning, strikerNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const onExtra = (type, n, as = null) => {
    if (type === "wide") return sendBall({ extraType: "wide", extras: 1 + n, runsScored: 0 });
    // byes / leg-byes run off a no-ball are extras on top of the no-ball, not bat runs
    if (type === "no-ball" && as) return sendBall({ extraType: "no-ball", extras: 1 + n, runsScored: 0, noBallRunsAs: as });
    if (type === "no-ball") return sendBall({ extraType: "no-ball", extras: 1, runsScored: n });
    return sendBall({ extraType: type, extras: n, runsScored: 0 });
  };

  const undo = async (survivorId) => {
    if (!inning.lastBallId) return;
    const newest = inning.recentBalls && inning.recentBalls[0];
    setBusy(true);
    setError("");
    try {
      const res = await scoringApi.undo({ ...ids(), lastBallId: inning.lastBallId, survivorId });
      setSb(res.data);
      if (newest) setRedo((r) => [...r, ballToRedo(newest)]);
      setModal(null);
    } catch (e) {
      // taking back a striker's wicket after the new batsman came in needs to know who stayed
      if (/survivorId/.test(e.message)) setModal("survivor");
      else {
        setError(e.message);
        if (e.status === 409) refresh().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  const redoOne = async () => {
    const item = redo[redo.length - 1];
    if (!item) return;
    let ok;
    if (item.type === "retire") {
      ok = await run(() => scoringApi.retire({ ...ids(), batsmanId: item.batsmanId, retiredOut: item.retiredOut, lastBallId: inning.lastBallId }));
    } else {
      ok = await sendBall(item.delivery, { keepRedo: true });
    }
    if (ok) setRedo((r) => r.slice(0, -1));
  };

  const swapEnds = useCallback(() => {
    if (nonStrikerNow) run(() => scoringApi.changeStriker({ inningId: inning.inningId, newStrikerId: nonStrikerNow.playerId }));
  }, [inning, nonStrikerNow, run]);

  const submitWicket = async (payload) => {
    if (await sendBall(payload)) setModal(null);
  };

  const submitRetire = async ({ batsmanId, retiredOut }) => {
    const ok = await run(() => scoringApi.retire({ ...ids(), batsmanId, retiredOut, lastBallId: inning.lastBallId }));
    if (ok) {
      setModal(null);
      setRedo([]);
    }
  };

  const pickBatsman = (playerId) => run(() => scoringApi.setNewBatsman({ ...ids(), newBatsmanId: playerId, end: inning.awaiting.batsmanEnd }));
  const pickBowler = (playerId) => run(() => scoringApi.setNewBowler({ ...ids(), newBowlerId: playerId }));
  const submitOpeners = (o) => run(() => scoringApi.setInitialPlayers({ ...ids(), ...o }));

  const endInnings = async () => {
    const ok = await run(() => scoringApi.switchInnings({ matchId, currentInningId: inning.inningId, forceEnd: true }));
    if (ok) setModal(null);
  };

  /* ----------------------------- who can be chosen ----------------------------- */

  const batterSections = useMemo(() => {
    const out = new Set(inning.wicketFalls.map((w) => Number(w.playerOutId)));
    const crease = new Set(inning.currentBatsmen.map((b) => b.playerId));
    const retired = new Set(inning.retiredHurt || []);
    const free = batting.players.filter((p) => !out.has(p.playerId) && !crease.has(p.playerId));
    const toRow = (p) => ({ id: p.playerId, name: p.name, photo: p.profilePicture, note: p.jerseyNumber ? `#${p.jerseyNumber}` : undefined });
    return [
      { label: "Retired hurt: may come back", players: free.filter((p) => retired.has(p.playerId)).map(toRow) },
      { label: "Yet to bat", players: free.filter((p) => !retired.has(p.playerId)).map(toRow) },
    ].filter((s) => s.players.length);
  }, [inning, batting]);

  const bowlerSections = useMemo(() => {
    const card = scorecard?.innings.find((i) => i.inningId === inning.inningId);
    const byId = Object.fromEntries((card?.bowling || []).map((b) => [b.playerId, b]));
    const players = bowling.players.map((p) => {
      const b = byId[p.playerId] || { playerId: p.playerId, legalBalls: 0, overs: "0.0", maidens: 0, runs: 0, wickets: 0 };
      return { id: p.playerId, name: p.name, photo: p.profilePicture, note: b.legalBalls ? figures(b) : "Has not bowled", badge: `${b.overs} ov`, blocked: bowlerBlocked({ bowler: b, lastOverBowlerId: card?.lastOverBowlerId, maxOvers: sb.maxOvers }) };
    });
    return [{ label: `${bowling.name}: over ${Math.floor((inning.ballsBowled || 0) / 6) + 1}`, players }];
  }, [scorecard, inning, bowling, sb.maxOvers]);

  /* ----------------------------- small things ----------------------------- */

  const first = sb.innings[0];
  const breakBanner =
    inning.inningsNumber === 2 && needOpeners
      ? `Innings break. ${sb.teams.team1.id === first.teamId ? sb.teams.team1.name : sb.teams.team2.name} scored ${first.totalRuns}/${first.wickets} in ${first.overs} overs. ${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win.`
      : null;

  const status = matchDone ? (
    <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white">Completed</span>
  ) : needOpeners ? (
    <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-950">Ready</span>
  ) : (
    <LiveBadge />
  );

  const menuItems = [
    { icon: LuUserRoundX, label: "Batter retires…", disabled: padOff || !nonStrikerNow, run: () => setModal("retire") },
    { icon: LuCircleStop, label: "End the innings early…", disabled: matchDone || inningsDone || needOpeners, run: () => setModal("end") },
    { icon: LuRefreshCw, label: "Refresh the scoreboard", run: () => refresh().catch((e) => setError(e.message)) },
    { icon: LuArrowLeft, label: "Close the console", run: onExit },
  ];

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="min-h-screen bg-stadium text-white">
      <div className="pointer-events-none fixed inset-0 bg-grid-faint [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="flex h-[68px] w-full items-center gap-4 px-4 sm:px-6 xl:px-8">
          <SparkMark size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="truncate font-display text-xl font-extrabold uppercase tracking-wide sm:text-2xl">
                {sb.teams.team1.name} <span className="text-ink-400">v</span> {sb.teams.team2.name}
              </h1>
              {status}
            </div>
            <p className="truncate text-xs font-semibold text-ink-300">{stageText(sb)}</p>
          </div>

          <span className={cx("hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ring-1 ring-inset sm:inline-flex", link === "connected" ? "bg-green-500/10 text-green-300 ring-green-400/30" : "bg-amber-500/10 text-amber-300 ring-amber-400/30")} title="Live connection">
            {link === "connected" ? <LuWifi className="h-4 w-4" aria-hidden="true" /> : <LuWifiOff className="h-4 w-4" aria-hidden="true" />}
            {link === "connected" ? "Connected" : "Reconnecting"}
          </span>

          <BroadcastMenu matchId={matchId} />

          <div className="relative" ref={menuRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={menu} aria-label="More" onClick={() => setMenu((m) => !m)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 hover:bg-white/15">
              <LuEllipsis className="h-5 w-5" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-slate-800 shadow-pop">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    role="menuitem"
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setMenu(false);
                      item.run();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <item.icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative w-full space-y-5 px-4 py-5 sm:px-6 xl:px-8">
        {error && (
          <Alert tone="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <ScoreHero sb={sb} inning={inning} />

        {matchDone && <MatchResult sb={sb} onBack={onExit} />}
        {matchDone && sb.matchResult && sb.matchResult.marginType === "tie" && <TieBreakPanel matchId={matchId} squads={{ [sb.teams.team1.id]: sb.teams.team1.players, [sb.teams.team2.id]: sb.teams.team2.players }} onDone={() => refresh().catch((e) => setError(e.message))} />}

        {needOpeners && <InningsSetup key={inning.inningId} inningsNumber={inning.inningsNumber} battingTeam={batting} bowlingTeam={bowling} banner={breakBanner} onSubmit={submitOpeners} busy={busy} />}

        {!matchDone && !needOpeners && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="min-w-0 lg:order-1">
              <PlayersPanel inning={inning} onRetire={padOff ? null : () => setModal("retire")} awaitingBowler={needBowler} />
            </div>
            <div className="min-w-0 lg:order-2">
              <ScorePad
                disabled={padOff}
                reason={padReason}
                freeHit={inning.freeHit && !padOff}
                busy={busy}
                canUndo={inning.lastBallId > 0}
                canRedo={redo.length > 0 && !padOff}
                shortcuts={!modal && !menu}
                onRun={onRun}
                onExtra={onExtra}
                onWicket={() => setModal("wicket")}
                onUndo={() => undo()}
                onRedo={redoOne}
                onSwap={swapEnds}
              />
            </div>
            <div className="min-w-0 lg:order-3 lg:col-span-2 2xl:sticky 2xl:top-[5.25rem] 2xl:col-span-1">
              <ScorecardPanel sb={sb} scorecard={scorecard} inningId={inning.inningId} />
            </div>
          </div>
        )}

        {(matchDone || needOpeners) && <ScorecardPanel sb={sb} scorecard={scorecard} inningId={sb.innings[0].inningId} />}
      </main>

      {/* ---- a choice the scorer has to make before the next ball ---- */}
      {needBatsman && !modal && (
        <PlayerPicker
          locked
          busy={busy}
          title="New batsman"
          subtitle={`Who comes in at the ${inning.awaiting.batsmanEnd === "striker" ? "striker's" : "non-striker's"} end?`}
          sections={batterSections}
          onPick={pickBatsman}
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Picked the wrong ball? Take it back.</span>
              <Button variant="secondary" size="sm" icon={LuUndo2} disabled={busy || !inning.lastBallId} onClick={() => undo()}>
                Undo last ball
              </Button>
            </div>
          }
        />
      )}
      {needBowler && !needBatsman && !modal && (
        <PlayerPicker
          locked
          busy={busy}
          title="Next bowler"
          subtitle="The over is complete. Nobody bowls two overs in a row, and each bowler is limited to a fifth of the overs."
          sections={bowlerSections}
          onPick={pickBowler}
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Scored the last ball wrongly?</span>
              <Button variant="secondary" size="sm" icon={LuUndo2} disabled={busy || !inning.lastBallId} onClick={() => undo()}>
                Undo last ball
              </Button>
            </div>
          }
        />
      )}

      {modal === "wicket" && strikerNow && nonStrikerNow && <WicketModal striker={strikerNow} nonStriker={nonStrikerNow} fielders={bowling.players} freeHit={inning.freeHit} onSubmit={submitWicket} onClose={() => setModal(null)} busy={busy} />}
      {modal === "retire" && <RetireModal batters={inning.currentBatsmen} onSubmit={submitRetire} onClose={() => setModal(null)} busy={busy} />}
      {modal === "survivor" && (
        <PlayerPicker
          title="Who stayed at the crease?"
          subtitle="The new batsman has already come in. Choose the batter who was at the crease with the one who got out, so the wicket can be taken back."
          sections={[{ label: "At the crease now", players: inning.currentBatsmen.map((b) => ({ id: b.playerId, name: b.name, photo: b.profilePicture, note: `${b.runs} (${b.balls})` })) }]}
          busy={busy}
          onPick={(id) => undo(id)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "end" && (
        <Modal
          title="End the innings now?"
          subtitle="Use this when the innings finishes before all out or all overs (a declaration, rain, a side that cannot continue). The target for the chase is set from the score."
          onClose={() => setModal(null)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Keep playing
              </Button>
              <Button variant="danger" busy={busy} onClick={endInnings}>
                End the innings
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-700">
            {batting.name} are {inning.totalRuns}/{inning.wickets} after {inning.overs} overs.
          </p>
        </Modal>
      )}
    </div>
  );
}
