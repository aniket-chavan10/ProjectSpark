import React, { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuCalendarDays, LuMapPin, LuPencilRuler, LuPlay, LuRadio, LuRepeat } from "react-icons/lu";
import TournamentList from "./TournamentList";
import TeamsStep from "./TeamsStep";
import GroupsStep from "./GroupsStep";
import ReplaceTeamDialog from "./ReplaceTeamDialog";
import ScheduleBuilder from "../Schedule/ScheduleBuilder";
import ScheduleView from "../Schedule/ScheduleView";
import Standings from "../Schedule/Standings";
import api from "../../../api/tournamentApi1";
import { Alert, Badge, Button, Card, Spinner, Stepper } from "../../ui/kit";

const STEPS = [
  { id: 1, label: "Tournaments" },
  { id: 2, label: "Teams" },
  { id: 3, label: "Groups" },
  { id: 4, label: "Schedule" },
  { id: 5, label: "Matches" },
];

const HEADLINES = {
  1: ["Your tournaments", "Pick the tournament you want to run."],
  2: ["Registered teams", "Check who has applied before you make the groups."],
  3: ["Groups", "Divide the teams into groups. Every group plays a mini league that ends with a group final."],
  4: ["Schedule", "Plan the days, set the first-round pairs and let Spark fit the matches in."],
  5: ["Matches", "Start a match to open the scorer. Everything the scorer needs opens in its own tab."],
};

const formatRange = (start, end) => {
  if (!start) return "";
  const opts = { day: "numeric", month: "short" };
  const s = new Date(start).toLocaleDateString("en-IN", opts);
  const e = end ? new Date(end).toLocaleDateString("en-IN", { ...opts, year: "numeric" }) : "";
  return e ? `${s} – ${e}` : s;
};

const messageOf = (err, fallback) => (err && (err.response?.data?.error || err.response?.data?.message || err.error || err.message)) || fallback;

export default function OrganizerFlow({ initial = null, onConsumed }) {
  const [step, setStep] = useState(1);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoaded, setTournamentsLoaded] = useState(false);
  const [appliedTeams, setAppliedTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState(null); // null | { team } : the "replace a team" dialog
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => tournaments.find((t) => String(t.tournament_id || t.id) === String(selectedTournamentId)), [tournaments, selectedTournamentId]);
  const started = !!Number(progress?.matches_started);

  // Furthest step that makes sense for this tournament
  const reachable = useMemo(() => {
    if (!selectedTournamentId) return 1;
    if (Number(progress?.schedule_created)) return 5;
    if (Number(progress?.groups_created)) return 4;
    if (Number(progress?.teams_created)) return 3;
    return 2;
  }, [selectedTournamentId, progress]);

  /* ------------------------------ data ------------------------------ */

  const fetchProgress = async (tournamentId) => {
    try {
      let result = await api.getTournamentProgress(tournamentId);
      if (Array.isArray(result)) result = result[0] || {};
      setProgress(result);
      if (Number(result?.matches_started) || Number(result?.schedule_created)) setStep(5);
      else if (Number(result?.groups_created)) setStep(3);
      else if (Number(result?.teams_created)) setStep(2);
      else setStep(2);
    } catch {
      setProgress(null);
      setStep(2);
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
      setError("Could not load your tournaments.");
    }
    setTournamentsLoaded(true);
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
      setError("Could not load the registered teams.");
    }
    setLoading(false);
  };

  const fetchScheduledMatches = async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    try {
      const res = await api.getScheduledMatches(selectedTournamentId);
      setScheduledMatches(Array.isArray(res) ? res : res?.matches || []);
    } catch {
      setScheduledMatches([]);
      setError("Could not load the scheduled matches.");
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

  const open = async (tournamentId) => {
    setError("");
    setSelectedTournamentId(tournamentId);
    await fetchAppliedTeams(tournamentId);
    await fetchProgress(tournamentId);
  };

  // the dashboard can open straight into one tournament (and a step, e.g. the Teams step to replace a team)
  useEffect(() => {
    if (!initial || !tournamentsLoaded) return;
    let alive = true;
    (async () => {
      await open(initial.id);
      if (alive && initial.step) setStep(initial.step);
      if (onConsumed) onConsumed();
    })();
    return () => {
      alive = false;
    };
  }, [initial, tournamentsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTournamentCreated = async (newTournamentId) => {
    if (!newTournamentId) return;
    setSelectedTournamentId(newTournamentId);
    await fetchAppliedTeams(newTournamentId);
    await fetchProgress(newTournamentId);
    setStep(2);
  };

  const goToGroups = async () => {
    await updateProgressStep("teams_created");
    await fetchAppliedTeams(selectedTournamentId);
    setStep(3);
  };

  const saveGroups = async (assignments) => {
    try {
      await api.assignTournamentGroups(selectedTournamentId, assignments);
    } catch (err) {
      throw new Error(messageOf(err, "Could not save the groups."));
    }
    await updateProgressStep("groups_created");
    await fetchAppliedTeams(selectedTournamentId);
    setStep(4);
  };

  const onTeamReplaced = async (result) => {
    setReplacing(null);
    setNotice(`${result.inTeam.name} now plays in place of ${result.outTeam.name}.`);
    await fetchAppliedTeams(selectedTournamentId);
    if (step === 5) await fetchScheduledMatches();
  };

  const onScheduleSaved = async () => {
    await fetchProgress(selectedTournamentId);
    setStep(5);
  };

  // The match opens in its own tab: squads, toss, then the scoring console
  const openMatch = async (match) => {
    window.open(`/match/${match.id}`, "_blank");
    if (match.status === "scheduled") await updateProgressStep("matches_started");
  };

  const startAction = (match) =>
    match.status === "scheduled" && match.team1_id && match.team2_id ? (
      <Button size="sm" icon={LuPlay} onClick={() => openMatch(match)}>
        Start
      </Button>
    ) : match.status === "completed" ? (
      <Button size="sm" variant="secondary" onClick={() => openMatch(match)} title="Open the match">
        {match.winner_team_name ? `${match.winner_team_name} won` : "Tied"}
      </Button>
    ) : match.status === "live" ? (
      <Button size="sm" variant="danger" icon={LuRadio} onClick={() => openMatch(match)}>
        Live · Score
      </Button>
    ) : null;

  const counts = useMemo(() => {
    const c = { scheduled: 0, live: 0, completed: 0 };
    scheduledMatches.forEach((m) => {
      c[m.status] = (c[m.status] || 0) + 1;
    });
    return c;
  }, [scheduledMatches]);

  /* ------------------------------ render ------------------------------ */

  const [title, subtitle] = HEADLINES[step];

  return (
    <div className="space-y-6">
      {selected && step > 1 && (
        <Card className="!p-4 sm:!p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <button type="button" onClick={() => setStep(1)} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                <LuArrowLeft className="h-3.5 w-3.5" /> All tournaments
              </button>
              <h2 className="truncate text-xl font-bold text-slate-900">{selected.name || "Your tournament"}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <LuCalendarDays className="h-4 w-4" aria-hidden="true" /> {formatRange(selected.start_date, selected.end_date)}
                </span>
                {selected.venue && (
                  <span className="inline-flex items-center gap-1.5">
                    <LuMapPin className="h-4 w-4" aria-hidden="true" /> {selected.venue}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={LuRepeat} onClick={() => setReplacing({ team: null })}>
                Replace a team
              </Button>
              {started ? <Badge tone="red" dot="live">Matches under way</Badge> : <Badge tone="slate">Set-up</Badge>}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto border-t border-slate-100 pt-4">
            <Stepper steps={STEPS} current={step} onSelect={(id) => id <= reachable && setStep(id)} />
          </div>
        </Card>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
      </div>

      {error && (
        <Alert tone="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {loading && step !== 4 && step !== 1 && <Spinner label="Loading…" className="!py-4" />}

      {step === 1 && <TournamentList loaded={tournamentsLoaded} tournaments={tournaments} onViewTeams={open} onRefresh={fetchTournaments} onTournamentCreated={onTournamentCreated} />}

      {step === 2 && <TeamsStep teams={appliedTeams} onContinue={goToGroups} onReplace={(team) => setReplacing({ team })} />}

      {step === 3 && <GroupsStep teams={appliedTeams} locked={started} onSave={saveGroups} onContinue={() => setStep(4)} />}

      {step === 4 && selectedTournamentId && <ScheduleBuilder tournamentId={selectedTournamentId} onSaved={onScheduleSaved} />}

      {step === 5 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">{scheduledMatches.length} matches</Badge>
              {counts.live > 0 && <Badge tone="red" dot="live">{counts.live} live</Badge>}
              <Badge tone="green">{counts.completed} played</Badge>
              <Badge tone="amber">{counts.scheduled} to play</Badge>
            </div>
            <Button variant="secondary" icon={LuPencilRuler} disabled={started} title={started ? "Matches have started" : undefined} onClick={() => setStep(4)}>
              Change the schedule
            </Button>
          </div>
          <Standings tournamentId={selectedTournamentId} matches={scheduledMatches} />
          <ScheduleView matches={scheduledMatches} renderAction={startAction} />
        </div>
      )}

      {replacing && selectedTournamentId && (
        <ReplaceTeamDialog tournamentId={selectedTournamentId} teams={appliedTeams} outTeam={replacing.team} onClose={() => setReplacing(null)} onDone={onTeamReplaced} />
      )}
    </div>
  );
}
