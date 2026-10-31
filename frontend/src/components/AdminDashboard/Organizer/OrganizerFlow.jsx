import React, { useEffect, useMemo, useState } from "react";
import OrganizerDashboard from "../Organizer";
import AppliedTeams from "../ViewAppliedTeams";
import GroupCreation from "../GroupTeams";
import ViewAssignedGroups from "../ViewAssignedGroups";
import ScheduleBuilder from "../Schedule/ScheduleBuilder";
import ScheduleView from "../Schedule/ScheduleView";
import Standings from "../Schedule/Standings";
import api from "../../../api/tournamentApi1";
import { btn, card } from "../../ui/classes";

const STEPS = [
  { id: 1, label: "Tournaments" },
  { id: 2, label: "Teams" },
  { id: 3, label: "Groups" },
  { id: 4, label: "Schedule" },
  { id: 5, label: "Matches" },
];

const formatRange = (start, end) => {
  if (!start) return "";
  const opts = { day: "numeric", month: "short" };
  const s = new Date(start).toLocaleDateString("en-IN", opts);
  const e = end ? new Date(end).toLocaleDateString("en-IN", { ...opts, year: "numeric" }) : "";
  return e ? `${s} – ${e}` : s;
};

function Stepper({ step, onStep, reachable }) {
  return (
    <nav aria-label="Tournament set-up steps" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const state = s.id < step ? "done" : s.id === step ? "current" : "todo";
          const enabled = s.id <= reachable;
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onStep(s.id)}
                aria-current={state === "current" ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  state === "current" ? "bg-emerald-600 text-white" : state === "done" ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-500"
                } ${!enabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    state === "current" ? "bg-white/20" : state === "done" ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {state === "done" ? "✓" : s.id}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-300 sm:w-8" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function OrganizerFlow() {
  const [step, setStep] = useState(1);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const [tournaments, setTournaments] = useState([]);
  const [appliedTeams, setAppliedTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => tournaments.find((t) => String(t.tournament_id || t.id) === String(selectedTournamentId)),
    [tournaments, selectedTournamentId]
  );

  // Furthest step that makes sense for this tournament
  const reachable = useMemo(() => {
    if (!selectedTournamentId) return 1;
    if (Number(progress?.schedule_created)) return 5;
    if (Number(progress?.groups_created)) return 4;
    if (Number(progress?.teams_created)) return 3;
    return 2;
  }, [selectedTournamentId, progress]);

  const fail = (message) => setError(message);

  /* ------------------------------ data ------------------------------ */

  const fetchProgress = async (tournamentId) => {
    try {
      let result = await api.getTournamentProgress(tournamentId);
      if (Array.isArray(result)) result = result[0] || {};
      setProgress(result);
      if (Number(result?.matches_started) || Number(result?.schedule_created)) setStep(5);
      else if (Number(result?.groups_created)) setStep(3);
      else if (Number(result?.teams_created)) setStep(2);
      else setStep(1);
    } catch {
      setProgress(null);
      setStep(1);
    }
  };

  const updateProgressStep = async (key, value = true) => {
    if (!selectedTournamentId) return;
    try {
      setProgress(await api.updateTournamentProgress(selectedTournamentId, { [key]: value }));
    } catch {
      /* the screen still works; the progress marker just is not saved */
    }
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getTournamentsByOrganizer();
      setTournaments(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch {
      fail("Could not load your tournaments.");
    }
    setLoading(false);
  };

  const fetchAppliedTeams = async (tournamentId) => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const res = await api.getAppliedTeams(tournamentId);
      setAppliedTeams(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch {
      setAppliedTeams([]);
      fail("Could not load the registered teams.");
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    if (!selectedTournamentId) return [];
    try {
      const data = await api.getGroupsWithTeams(selectedTournamentId);
      setGroups(data);
      return data;
    } catch {
      setGroups([]);
      return [];
    }
  };

  const fetchScheduledMatches = async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    try {
      const res = await api.getScheduledMatches(selectedTournamentId);
      setScheduledMatches(Array.isArray(res) ? res : res?.matches || []);
    } catch {
      setScheduledMatches([]);
      fail("Could not load the scheduled matches.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (step === 5 && selectedTournamentId) fetchScheduledMatches();
  }, [step, selectedTournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------ actions ------------------------------ */

  const onTournamentCreated = async (newTournamentId) => {
    if (!newTournamentId) return;
    setSelectedTournamentId(newTournamentId);
    await fetchProgress(newTournamentId);
    setStep(2);
  };

  const goToAppliedTeams = async (tournamentId) => {
    setError("");
    setSelectedTournamentId(tournamentId);
    await fetchAppliedTeams(tournamentId);
    await fetchProgress(tournamentId);
  };

  const handleCreateTeams = async () => {
    await updateProgressStep("teams_created");
    setStep(3);
  };

  const handleCreateGroups = async (groupData) => {
    if (!selectedTournamentId) return;
    try {
      await api.assignTournamentGroups(selectedTournamentId, groupData);
      await updateProgressStep("groups_created");
      await fetchGroups();
      await fetchAppliedTeams(selectedTournamentId);
      setStep(4);
    } catch {
      fail("Could not save the groups.");
    }
  };

  const onScheduleSaved = async () => {
    await fetchProgress(selectedTournamentId);
    setStep(5);
  };

  // The match opens in its own tab: squads, toss, then the scoring dashboard
  const openMatch = async (match) => {
    window.open(`/match/${match.id}`, "_blank");
    if (match.status === "scheduled") await updateProgressStep("matches_started");
  };

  const startAction = (match) =>
    match.status === "scheduled" && match.team1_id && match.team2_id ? (
      <button type="button" className={btn.primary} onClick={() => openMatch(match)}>
        Start
      </button>
    ) : match.status === "completed" ? (
      <button type="button" className={btn.secondary} onClick={() => openMatch(match)} title="Open the scorecard">
        {match.winner_team_name ? `${match.winner_team_name} won` : "Tied"}
      </button>
    ) : match.status === "live" ? (
      <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onClick={() => openMatch(match)}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Live · Score
      </button>
    ) : null;

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="mx-auto max-w-5xl">
      {selected && step > 1 && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <button type="button" onClick={() => setStep(1)} className="text-xs font-medium text-emerald-700 hover:underline">
              ← All tournaments
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{selected.name || "Your tournament"}</h1>
            <p className="text-sm text-slate-500">
              {formatRange(selected.start_date, selected.end_date)}
              {selected.venue ? ` · ${selected.venue}` : ""}
            </p>
          </div>
        </header>
      )}

      <div className={`${card} mb-5 p-3 sm:p-4`}>
        <Stepper step={step} onStep={setStep} reachable={reachable} />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {loading && step !== 4 && <p className="mb-4 text-sm text-slate-500">Loading…</p>}

      {step === 1 && (
        <OrganizerDashboard tournaments={tournaments} onViewTeams={goToAppliedTeams} onRefresh={fetchTournaments} onTournamentCreated={onTournamentCreated} />
      )}

      {step === 2 && <AppliedTeams tournamentId={selectedTournamentId} teams={appliedTeams} onContinue={() => handleCreateTeams()} onTeamsCreated={handleCreateTeams} />}

      {step === 3 &&
        (appliedTeams.some((team) => team.group_name) ? (
          <ViewAssignedGroups teams={appliedTeams} onContinue={async () => { await fetchGroups(); setStep(4); }} />
        ) : (
          <GroupCreation teams={appliedTeams} groups={groups} onCreateGroups={handleCreateGroups} onContinue={async () => { await fetchGroups(); setStep(4); }} />
        ))}

      {step === 4 && selectedTournamentId && <ScheduleBuilder tournamentId={selectedTournamentId} onSaved={onScheduleSaved} />}

      {step === 5 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Match schedule</h2>
            <button type="button" className={btn.secondary} onClick={() => setStep(4)}>
              Change the schedule
            </button>
          </div>
          <Standings tournamentId={selectedTournamentId} matches={scheduledMatches} />
          <ScheduleView matches={scheduledMatches} renderAction={startAction} />
        </div>
      )}
    </div>
  );
}
