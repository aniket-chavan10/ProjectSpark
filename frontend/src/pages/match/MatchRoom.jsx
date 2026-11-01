import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LuX } from "react-icons/lu";
import scoringApi from "../../api/scoringApi";
import { SparkMark } from "../../components/layout/AppShell";
import { Alert, Button, Spinner, Stepper } from "../../components/ui/kit";
import MatchDetailsStep from "./MatchDetailsStep";
import ScoringDashboard from "./ScoringDashboard";
import TossStep from "./TossStep";

const STEPS = [
  { id: "details", label: "Squads" },
  { id: "toss", label: "Toss" },
  { id: "scoring", label: "Scoring" },
];

/**
 * /match/:fixtureId  (opens in its own tab from the schedule)
 * Squads -> toss -> scoring console. A match that already had its toss goes straight to scoring.
 */
export default function MatchRoom() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(null);
  const [details, setDetails] = useState(null);
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tossError, setTossError] = useState("");

  const enterScoring = useCallback(async (matchId) => {
    const sb = await scoringApi.getScoreboard(matchId);
    setLiveMatchId(matchId);
    setScoreboard(sb);
    setStep("scoring");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const d = await scoringApi.getMatchDetails(fixtureId);
      setDetails(d);
      if (d.match.match_id) await enterScoring(d.match.match_id); // the toss is done: carry on scoring
      else setStep("details");
    } catch (e) {
      setLoadError(e.message);
    }
  }, [fixtureId, enterScoring]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmToss = async (toss) => {
    setBusy(true);
    setTossError("");
    try {
      const res = await scoringApi.setToss(fixtureId, toss);
      await enterScoring(res.matchId);
    } catch (e) {
      setTossError(e.message);
      if (e.status === 409) load(); // already recorded: pick up from where it is
    } finally {
      setBusy(false);
    }
  };

  const exit = () => {
    window.close();
    setTimeout(() => navigate("/admin-dashboard"), 150);
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-pop">
          <h1 className="text-lg font-semibold text-slate-900">Could not open this match</h1>
          <div className="mt-4 text-left">
            <Alert tone="error">{loadError}</Alert>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={load}>Try again</Button>
            <Button variant="secondary" onClick={exit}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!step) return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Spinner label="Opening the match…" /></div>;

  if (step === "scoring") return <ScoringDashboard matchId={liveMatchId} initial={scoreboard} onExit={exit} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <SparkMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Match set-up</p>
            <p className="truncate text-sm font-semibold">
              {details.team1 && details.team2 ? `${details.team1.team_name} v ${details.team2.team_name}` : "Match"}
            </p>
          </div>
          <div className="hidden rounded-xl bg-white px-3 py-1.5 sm:block">
            <Stepper steps={STEPS} current={step} />
          </div>
          <button type="button" onClick={exit} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15 hover:bg-white/15">
            <LuX className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {step === "details" && <MatchDetailsStep details={details} onNext={() => setStep("toss")} />}
        {step === "toss" && <TossStep details={details} onBack={() => setStep("details")} onConfirm={confirmToss} busy={busy} error={tossError} />}
      </main>
    </div>
  );
}
