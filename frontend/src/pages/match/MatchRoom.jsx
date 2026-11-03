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
      <div className="flex min-h-screen items-center justify-center bg-stadium p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-pop">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-ink-950">Could not open this match</h1>
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

  if (!step)
    return (
      <div className="flex min-h-screen items-center justify-center bg-stadium text-ink-200">
        <Spinner label="Opening the match…" className="!text-ink-200" />
      </div>
    );

  if (step === "scoring") return <ScoringDashboard matchId={liveMatchId} initial={scoreboard} onExit={exit} />;

  return (
    <div className="min-h-screen bg-stadium text-white">
      <div className="pointer-events-none fixed inset-0 bg-grid-faint [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="flex h-[72px] w-full items-center gap-4 px-4 sm:px-6 xl:px-10">
          <SparkMark size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-spark-400">Match set-up</p>
            <p className="truncate font-display text-xl font-extrabold uppercase tracking-wide">
              {details.team1 && details.team2 ? (
                <>
                  {details.team1.team_name} <span className="text-ink-400">v</span> {details.team2.team_name}
                </>
              ) : (
                "Match"
              )}
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/[0.05] px-4 py-2 ring-1 ring-inset ring-white/10 md:block">
            <Stepper steps={STEPS} current={step} />
          </div>
          <button type="button" onClick={exit} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 hover:bg-white/15">
            <LuX className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="relative w-full px-4 py-6 sm:px-6 xl:px-10">
        <div key={step} className="animate-fade-up">
          {step === "details" && <MatchDetailsStep details={details} onNext={() => setStep("toss")} />}
          {step === "toss" && <TossStep details={details} onBack={() => setStep("details")} onConfirm={confirmToss} busy={busy} error={tossError} />}
        </div>
      </main>
    </div>
  );
}
