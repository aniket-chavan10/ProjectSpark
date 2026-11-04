import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuCircleStop, LuEllipsis, LuRefreshCw, LuUndo2, LuUserRoundX, LuWifi, LuWifiOff } from "react-icons/lu";
import scoringApi from "../../api/scoringApi";
import { watchMatch } from "../../api/matchSocket";
import { SparkMark } from "../../components/layout/AppShell";
import BroadcastMenu from "../../components/Scoring/BroadcastMenu";
import InningsSetup from "../../components/Scoring/InningsSetup";
import MatchResult from "../../components/Scoring/MatchResult";
import PickPanel from "../../components/Scoring/PickPanel";
import PlayersPanel from "../../components/Scoring/PlayersPanel";
import RetirePanel from "../../components/Scoring/RetirePanel";
import ScoreHero from "../../components/Scoring/ScoreHero";
import ScorePad from "../../components/Scoring/ScorePad";
import ScorecardPanel from "../../components/Scoring/ScorecardPanel";
import TieBreakPanel from "../../components/Scoring/TieBreakPanel";
import WicketPanel from "../../components/Scoring/WicketPanel";
import { ActionShell, BallChip, CButton } from "../../components/Scoring/console";
import { cx } from "../../components/ui/kit";
import { ballToRedo, bowlerBlocked, currentInnings, dismissalText, figures, inningsStarted, nonStriker, overChips, sides, striker } from "../../components/Scoring/scoreUtils";

const stageText = (sb) => [`Match ${sb.matchNo}`, `${sb.maxOvers} overs`, sb.venue].filter(Boolean).join(" · ");

/**
 * The scorer's console, built to sit open for a whole match on one screen without scrolling:
 *   left    who is batting and bowling
 *   middle  the scoring pad; whenever the match needs a decision (a wicket, a new batter, the next bowler) the pad is
 *           replaced by that decision, in the same place, with the score and the players still in view
 *   right   the ball by ball log, the scorecard and the match information
 * Everything the scorer does goes through the backend scoring engine, which refuses anything against the Laws of
 * Cricket; the screen only makes the right thing the easy thing. The on-air graphics have their own screen (the
 * graphics desk): the scorer only hands out its link.
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
  const padReason = matchDone ? "The match is over." : inningsDone ? "This innings is complete." : "";

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
    const ok = await run(() => scoringApi.registerBall({ ...ids(), batsmanId: strikerNow.playerId, bowlerId: inning.currentBowler.playerId, lastBallId: inning.lastBallId, ...delivery }));
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
    <span className="rounded bg-zinc-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-100">Completed</span>
  ) : needOpeners ? (
    <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-950">Ready</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" /> Live
    </span>
  );

  const menuItems = [
    { icon: LuUserRoundX, label: "Batter retires…", disabled: padOff || !nonStrikerNow, run: () => setModal("retire") },
    { icon: LuCircleStop, label: "End the innings early…", disabled: matchDone || inningsDone || needOpeners, run: () => setModal("end") },
    { icon: LuRefreshCw, label: "Refresh the scoreboard", run: () => refresh().catch((e) => setError(e.message)) },
    { icon: LuArrowLeft, label: "Close the console", run: onExit },
  ];

  // what the next decision needs the scorer to know: the wicket that just fell, the over that just ended
  const lastFall = inning.wicketFalls[inning.wicketFalls.length - 1];
  const wicketNote = lastFall ? `${lastFall.playerOutName} ${dismissalText(lastFall)} · ${lastFall.scoreAtFall}-${lastFall.wicketNumber}` : null;
  const overChipsNow = overChips(inning);
  const runsInOver = (inning.currentOverSummary || []).reduce((n, b) => n + Number(b.runs || 0) + Number(b.extraRuns || 0), 0);
  const overNo = Math.floor((inning.ballsBowled || 0) / 6);

  const undoFooter = (text) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500">{text}</span>
      <CButton icon={LuUndo2} disabled={busy || !inning.lastBallId} onClick={() => undo()}>
        Undo last ball
      </CButton>
    </div>
  );

  /** The middle of the screen: the pad, or the decision the match is waiting for. */
  const centre = () => {
    if (modal === "wicket" && strikerNow && nonStrikerNow) return <WicketPanel striker={strikerNow} nonStriker={nonStrikerNow} fielders={bowling.players} bowlerId={inning.currentBowler && inning.currentBowler.playerId} freeHit={inning.freeHit} onSubmit={submitWicket} onClose={() => setModal(null)} busy={busy} />;
    if (modal === "retire") return <RetirePanel batters={inning.currentBatsmen} onSubmit={submitRetire} onClose={() => setModal(null)} busy={busy} />;
    if (modal === "survivor")
      return (
        <PickPanel
          title="Who stayed at the crease?"
          subtitle="The new batter has already come in. Choose the batter who was at the crease with the one who got out, so the wicket can be taken back."
          sections={[{ label: "At the crease now", players: inning.currentBatsmen.map((b) => ({ id: b.playerId, name: b.name, photo: b.profilePicture, note: `${b.runs} (${b.balls})` })) }]}
          busy={busy}
          onPick={(id) => undo(id)}
          onBack={() => setModal(null)}
        />
      );
    if (modal === "end")
      return (
        <ActionShell
          tone="danger"
          title="End the innings now?"
          subtitle="Use this when the innings finishes before all out or all overs (a declaration, rain, a side that cannot continue). The target for the chase is set from the score."
          onBack={() => setModal(null)}
          backLabel="Keep playing"
          footer={
            <div className="flex justify-end gap-3">
              <CButton onClick={() => setModal(null)}>Keep playing</CButton>
              <CButton variant="danger" size="lg" disabled={busy} onClick={endInnings}>
                {busy ? "Saving…" : "End the innings"}
              </CButton>
            </div>
          }
        >
          <p className="text-sm text-zinc-200">
            {batting.name} are {inning.totalRuns}/{inning.wickets} after {inning.overs} overs.
          </p>
        </ActionShell>
      );
    if (needBatsman)
      return (
        <PickPanel
          tone="danger"
          title="New batter"
          subtitle={`Who comes in at the ${inning.awaiting.batsmanEnd === "striker" ? "striker's" : "non-striker's"} end?`}
          summary={wicketNote ? <p className="text-[13px] font-medium text-zinc-300">Wicket: {wicketNote}</p> : null}
          sections={batterSections}
          busy={busy}
          onPick={pickBatsman}
          footer={undoFooter("Scored the last ball wrongly? Take it back.")}
        />
      );
    if (needBowler)
      return (
        <PickPanel
          tone="accent"
          title="Next bowler"
          subtitle="Not the bowler of the last over. Each bowler is limited to a fifth of the overs."
          summary={
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-semibold text-zinc-200">
                Over {overNo} complete · {runsInOver} run{runsInOver === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                {overChipsNow.map((c, i) => (
                  <BallChip key={i} c={c} size={26} />
                ))}
              </span>
              <span className="tabular ml-auto text-[13px] font-semibold text-zinc-300">
                {inning.totalRuns}/{inning.wickets}
              </span>
            </div>
          }
          sections={bowlerSections}
          busy={busy}
          onPick={pickBowler}
          footer={undoFooter("Scored the last ball wrongly? Take it back.")}
        />
      );
    return (
      <ScorePad
        disabled={padOff}
        reason={padReason}
        freeHit={inning.freeHit && !padOff}
        busy={busy}
        canUndo={inning.lastBallId > 0}
        canRedo={redo.length > 0 && !padOff}
        canRetire={!padOff && !!nonStrikerNow}
        shortcuts={!menu}
        onRun={onRun}
        onExtra={onExtra}
        onWicket={() => setModal("wicket")}
        onUndo={() => undo()}
        onRedo={redoOne}
        onSwap={swapEnds}
        onRetire={() => setModal("retire")}
      />
    );
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3">
        <button type="button" onClick={onExit} aria-label="Close the console" title="Close the console" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <SparkMark size={24} />
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-sm font-semibold text-white">
            {sb.teams.team1.name} <span className="font-normal text-zinc-500">v</span> {sb.teams.team2.name}
          </h1>
          <p className="hidden truncate text-xs text-zinc-500 md:block">{stageText(sb)}</p>
        </div>
        {status}

        <div className="ml-auto flex items-center gap-3">
          <span className={cx("hidden items-center gap-1.5 text-xs font-medium sm:inline-flex", link === "connected" ? "text-green-400" : "text-amber-400")} title="Live connection">
            {link === "connected" ? <LuWifi className="h-4 w-4" aria-hidden="true" /> : <LuWifiOff className="h-4 w-4" aria-hidden="true" />}
            {link === "connected" ? "Connected" : "Reconnecting"}
          </span>

          <BroadcastMenu matchId={matchId} />

          <div className="relative" ref={menuRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={menu} aria-label="More" onClick={() => setMenu((m) => !m)} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-200 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700">
              <LuEllipsis className="h-4 w-4" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
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
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <item.icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex shrink-0 items-center justify-between gap-3 border-b border-red-900 bg-red-950/60 px-4 py-2 text-[13px] text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-xs font-semibold text-red-300 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <ScoreHero sb={sb} inning={inning} />

      {matchDone ? (
        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <MatchResult sb={sb} onBack={onExit} />
          {sb.matchResult && sb.matchResult.marginType === "tie" && <TieBreakPanel matchId={matchId} squads={{ [sb.teams.team1.id]: sb.teams.team1.players, [sb.teams.team2.id]: sb.teams.team2.players }} onDone={() => refresh().catch((e) => setError(e.message))} />}
          <ScorecardPanel className="h-[34rem]" sb={sb} scorecard={scorecard} inningId={sb.innings[0].inningId} />
        </main>
      ) : needOpeners ? (
        <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[minmax(0,1fr)]">
            <InningsSetup key={inning.inningId} inningsNumber={inning.inningsNumber} battingTeam={batting} bowlingTeam={bowling} banner={breakBanner} onSubmit={submitOpeners} busy={busy} />
            <ScorecardPanel className="min-h-[20rem]" sb={sb} scorecard={scorecard} inningId={sb.innings[0].inningId} />
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[21rem_minmax(0,1fr)_23rem] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[24rem_minmax(0,1fr)_27rem]">
          <div className="order-2 min-h-0 lg:order-1">
            <PlayersPanel className="h-full" inning={inning} awaitingBowler={needBowler} />
          </div>
          <div className="order-1 min-h-[30rem] min-w-0 lg:order-2 lg:min-h-0">{centre()}</div>
          <div className="order-3 min-h-[24rem] lg:min-h-0">
            <ScorecardPanel className="h-full" sb={sb} scorecard={scorecard} inningId={inning.inningId} />
          </div>
        </main>
      )}
    </div>
  );
}
