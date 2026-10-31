import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import scoringApi from "../../api/scoringApi";
import MatchDetailsStep from "./MatchDetailsStep";
import ScoringDashboard from "./ScoringDashboard";
import TossStep from "./TossStep";

const STEPS = [
  { id: "details", label: "Match & squads" },
  { id: "toss", label: "Toss" },
  { id: "scoring", label: "Scoring" },
];

function Steps({ step }) {
  const at = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Steps">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2" aria-current={i === at ? "step" : undefined}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < at ? "bg-emerald-600 text-white" : i === at ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>{i < at ? "✓" : i + 1}</span>
          <span className={`hidden font-medium sm:inline ${i === at ? "text-slate-900" : "text-slate-500"}`}>{s.label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-slate-300" />}
        </li>
      ))}
    </ol>
  );
}

/**
 * /match/:fixtureId  (opens in its own tab from the schedule)
 * Match & squads -> toss -> scoring dashboard. A match that already had its toss goes straight to scoring.
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
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-lg font-bold text-slate-900">Could not open this match</h1>
          <p className="mt-2 text-sm text-red-600" role="alert">{loadError}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={load} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Try again
            </button>
            <button type="button" onClick={exit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!step) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Opening the match…</div>;
  }

  if (step === "scoring") return <ScoringDashboard matchId={liveMatchId} initial={scoreboard} onExit={exit} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Steps step={step} />
          <button type="button" onClick={exit} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Close
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {step === "details" && <MatchDetailsStep details={details} onNext={() => setStep("toss")} />}
        {step === "toss" && <TossStep details={details} onBack={() => setStep("details")} onConfirm={confirmToss} busy={busy} error={tossError} />}
      </main>
    </div>
  );
}
