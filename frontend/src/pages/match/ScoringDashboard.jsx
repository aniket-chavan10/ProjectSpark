import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import scoringApi from "../../api/scoringApi";
import { watchMatch } from "../../api/matchSocket";
import { btn } from "../../components/ui/classes";
import InningsSetup from "../../components/Scoring/InningsSetup";
import MatchResult from "../../components/Scoring/MatchResult";
import Modal from "../../components/Scoring/Modal";
import PlayerPicker from "../../components/Scoring/PlayerPicker";
import PlayersPanel from "../../components/Scoring/PlayersPanel";
import RetireModal from "../../components/Scoring/RetireModal";
import ScoreHero from "../../components/Scoring/ScoreHero";
import ScorePad from "../../components/Scoring/ScorePad";
import OverlayDesk from "../../components/Scoring/OverlayDesk";
import TieBreakPanel from "../../components/Scoring/TieBreakPanel";
import ScorecardPanel from "../../components/Scoring/ScorecardPanel";
import WicketModal from "../../components/Scoring/WicketModal";
import { ballToRedo, bowlerBlocked, currentInnings, figures, inningsStarted, nonStriker, sides, striker } from "../../components/Scoring/scoreUtils";

/**
 * The scorer's screen. Everything the scorer does goes through the backend scoring engine, which refuses
 * anything against the Laws of Cricket; the screen only makes the right thing the easy thing.
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
  const [copied, setCopied] = useState(false);
  const errorRef = useRef(null);

  const inning = currentInnings(sb);
  const { batting, bowling } = sides(sb, inning);
  const strikerNow = striker(inning);
  const nonStrikerNow = nonStriker(inning);

  /* ----------------------------- live data ----------------------------- */

  useEffect(() => watchMatch(matchId, { onScoreboard: setSb, onStatus: setLink }), [matchId]);

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

  const onExtra = (type, n) => {
    if (type === "wide") return sendBall({ extraType: "wide", extras: 1 + n, runsScored: 0 });
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
    const toRow = (p) => ({ id: p.playerId, name: p.name, note: p.jerseyNumber ? `#${p.jerseyNumber}` : undefined });
    return [
      { label: "Retired hurt — may come back", players: free.filter((p) => retired.has(p.playerId)).map(toRow) },
      { label: "Yet to bat", players: free.filter((p) => !retired.has(p.playerId)).map(toRow) },
    ].filter((s) => s.players.length);
  }, [inning, batting]);

  const bowlerSections = useMemo(() => {
    const card = scorecard?.innings.find((i) => i.inningId === inning.inningId);
    const byId = Object.fromEntries((card?.bowling || []).map((b) => [b.playerId, b]));
    const players = bowling.players.map((p) => {
      const b = byId[p.playerId] || { playerId: p.playerId, legalBalls: 0, overs: "0.0", maidens: 0, runs: 0, wickets: 0 };
      return { id: p.playerId, name: p.name, note: b.legalBalls ? figures(b) : "Has not bowled", badge: `${b.overs} ov`, blocked: bowlerBlocked({ bowler: b, lastOverBowlerId: card?.lastOverBowlerId, maxOvers: sb.maxOvers }) };
    });
    return [{ label: `${bowling.name} — over ${Math.floor((inning.ballsBowled || 0) / 6) + 1}`, players }];
  }, [scorecard, inning, bowling, sb.maxOvers]);

  /* ----------------------------- small things ----------------------------- */

  const overlayUrl = `${window.location.origin}/overlay/${matchId}`;
  const copyOverlay = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy. The overlay link is " + overlayUrl);
    }
    setMenu(false);
  };

  const first = sb.innings[0];
  const breakBanner =
    inning.inningsNumber === 2 && needOpeners
      ? `Innings break. ${sb.teams.team1.id === first.teamId ? sb.teams.team1.name : sb.teams.team2.name} scored ${first.totalRuns}/${first.wickets} in ${first.overs} overs. ${batting.name} need ${inning.targetScore || first.totalRuns + 1} to win.`
      : null;

  const statusChip = matchDone ? ["Completed", "bg-slate-200 text-slate-700"] : needOpeners ? ["Ready", "bg-amber-100 text-amber-800"] : ["Live", "bg-red-100 text-red-700"];

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusChip[1]}`}>{statusChip[0]}</span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                {sb.teams.team1.name} v {sb.teams.team2.name}
              </h1>
              <p className="truncate text-xs text-slate-500">
                Match {sb.matchNo} · {sb.maxOvers} overs{sb.venue ? ` · ${sb.venue}` : ""}
              </p>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500" title="Live connection">
              <span className={`h-2.5 w-2.5 rounded-full ${link === "connected" ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="hidden sm:inline">{link === "connected" ? "Live" : "Reconnecting"}</span>
            </span>
            <a href={`/overlay/${matchId}`} target="_blank" rel="noreferrer" className={`${btn.secondary} !px-3 !py-2`}>
              Overlay ↗
            </a>
            <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className={`${btn.secondary} !px-3 !py-2`}>
              ⋯
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {[
                  { label: "Batter retires…", disabled: padOff || !nonStrikerNow, run: () => setModal("retire") },
                  { label: "End the innings early…", disabled: matchDone || inningsDone || needOpeners, run: () => setModal("end") },
                  { label: copied ? "Link copied ✓" : "Copy overlay link", run: copyOverlay },
                  { label: "Refresh the scoreboard", run: () => refresh().catch((e) => setError(e.message)) },
                  { label: "Close this screen", run: onExit },
                ].map((item) => (
                  <button
                    key={item.label}
                    role="menuitem"
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setMenu(false);
                      item.run();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6">
        {error && (
          <div ref={errorRef} className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="shrink-0 font-semibold text-red-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <ScoreHero sb={sb} inning={inning} />

        {matchDone && <MatchResult sb={sb} onBack={onExit} />}
        {matchDone && sb.matchResult && sb.matchResult.marginType === "tie" && <TieBreakPanel matchId={matchId} onDone={() => refresh().catch((e) => setError(e.message))} />}

        {needOpeners && <InningsSetup key={inning.inningId} inningsNumber={inning.inningsNumber} battingTeam={batting} bowlingTeam={bowling} banner={breakBanner} onSubmit={submitOpeners} busy={busy} />}

        {!matchDone && !needOpeners && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="min-w-0 space-y-4 lg:col-span-7">
              <PlayersPanel inning={inning} onRetire={padOff ? null : () => setModal("retire")} awaitingBowler={needBowler} />
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
            <div className="min-w-0 space-y-4 lg:col-span-5">
              <ScorecardPanel sb={sb} scorecard={scorecard} inningId={inning.inningId} overlayUrl={overlayUrl} />
              <OverlayDesk matchId={matchId} sb={sb} />
            </div>
          </div>
        )}

        {(matchDone || needOpeners) && <ScorecardPanel sb={sb} scorecard={scorecard} inningId={sb.innings[0].inningId} overlayUrl={overlayUrl} />}
        {(matchDone || needOpeners) && <OverlayDesk matchId={matchId} sb={sb} />}
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
              <button type="button" className={btn.secondary} disabled={busy || !inning.lastBallId} onClick={() => undo()}>
                ↶ Undo last ball
              </button>
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
              <button type="button" className={btn.secondary} disabled={busy || !inning.lastBallId} onClick={() => undo()}>
                ↶ Undo last ball
              </button>
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
          sections={[{ label: "At the crease now", players: inning.currentBatsmen.map((b) => ({ id: b.playerId, name: b.name, note: `${b.runs} (${b.balls})` })) }]}
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
              <button type="button" className={btn.secondary} onClick={() => setModal(null)}>
                Keep playing
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300" disabled={busy} onClick={endInnings}>
                {busy ? "Ending…" : "End the innings"}
              </button>
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
