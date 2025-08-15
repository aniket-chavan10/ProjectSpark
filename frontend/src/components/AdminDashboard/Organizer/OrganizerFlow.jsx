import React, { useEffect, useState } from "react";
import OrganizerDashboard from "../Organizer";
import AppliedTeams from "../ViewAppliedTeams";
import GroupCreation from "../GroupTeams";
import ViewAssignedGroups from "../ViewAssignedGroups";
import ScheduleCreation from "../ScheduleFirstRound";
import api from "../../../api/tournamentApi1";
import MatchCard from "../MatchCard"; // Update the path accordingly

export default function OrganizerFlow() {
  const [step, setStep] = useState(1);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const [tournaments, setTournaments] = useState([]);
  const [appliedTeams, setAppliedTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [tournamentDates, setTournamentDates] = useState({ start_date: null, end_date: null });

  const steps = [
    { id: 1, label: "Tournaments", icon: "🏆" },
    { id: 2, label: "Teams", icon: "👥" },
    { id: 3, label: "Groups", icon: "🏢" },
    { id: 4, label: "Schedule", icon: "📅" },
    { id: 5, label: "Start", icon: "🚀" },
  ];

  const fetchProgress = async (tournamentId) => {
    try {
      let result = await api.getTournamentProgress(tournamentId);
      if (Array.isArray(result)) {
        result = result[0] || {};
      }
      setProgress(result);

      const matchesStarted = Number(result?.matches_started) || 0;
      const scheduleCreated = Number(result?.schedule_created) || 0;
      const groupsCreated = Number(result?.groups_created) || 0;
      const teamsCreated = Number(result?.teams_created) || 0;

      if (matchesStarted) setStep(5);
      else if (scheduleCreated) setStep(4);
      else if (groupsCreated) setStep(3);
      else if (teamsCreated) setStep(2);
      else setStep(2);
    } catch (err) {
      setProgress(null);
      setStep(1);
    }
  };

  const updateProgressStep = async (key, value = true) => {
    if (!selectedTournamentId) return;
    try {
      const result = await api.updateTournamentProgress(selectedTournamentId, { [key]: value });
      setProgress(result);
    } catch (err) {
      // handle error if necessary
    }
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getTournamentsByOrganizer();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res.data)
        ? res.data
        : [];
      setTournaments(list);
      console.log("Fetched Tournaments: ", list);
    } catch (err) {
      console.error("Error fetching tournaments", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTournamentId && tournaments.length > 0) {
      const tournament = tournaments.find((t) => String(t.tournament_id || t.id) === String(selectedTournamentId));
      if (tournament) {
        setTournamentDates({
          start_date: tournament.start_date || null,
          end_date: tournament.end_date || null,
        });
        console.log("Tournament dates set:", tournament.start_date, tournament.end_date);
      } else {
        setTournamentDates({ start_date: null, end_date: null });
        console.warn("Tournament not found in list for selected ID", selectedTournamentId);
      }
    } else {
      setTournamentDates({ start_date: null, end_date: null });
    }
  }, [selectedTournamentId, tournaments]);

  const fetchAppliedTeams = async (tournamentId) => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const res = await api.getAppliedTeams(tournamentId);
      setAppliedTeams(
        Array.isArray(res)
          ? res
          : Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (err) {
      console.error("Error fetching applied teams", err);
    }
    setLoading(false);
  };

  const fetchGroupsForSchedule = async () => {
    if (!selectedTournamentId) return;
    try {
      const data = await api.getGroupsWithTeams(selectedTournamentId);
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups for schedule", err);
    }
  };

  const enrichMatchesWithTeams = (matches, groups) => {
    const allTeams = groups.flatMap((group) => group.teams || []);
    const teamLookup = allTeams.reduce((acc, team) => {
      acc[String(team.id)] = team;
      return acc;
    }, {});

    return matches.map((match) => ({
      ...match,
      team1: teamLookup[String(match.team1_id)] || null,
      team2: teamLookup[String(match.team2_id)] || null,
    }));
  };

  const fetchScheduledMatches = async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    try {
      const matchesResponse = await api.getScheduledMatches(selectedTournamentId);
      const matches = Array.isArray(matchesResponse)
        ? matchesResponse
        : matchesResponse.matches || [];
      console.log("Fetched Scheduled Matches:", matches);

      // Enrich matches with team info
      const enrichedMatches = enrichMatchesWithTeams(matches, groups);
      setScheduledMatches(enrichedMatches);
    } catch (err) {
      console.error("Error fetching scheduled matches", err);
      setScheduledMatches([]);
    }
    setLoading(false);
  };

  const goToAppliedTeams = async (tournamentId) => {
    setSelectedTournamentId(tournamentId);
    try {
      await fetchAppliedTeams(tournamentId);
      await fetchProgress(tournamentId);
    } catch (error) {
      console.error("Error navigating to applied teams", error);
      setStep(1);
    }
  };

  const handleCreateTeams = async () => {
    await updateProgressStep("teams_created");
    setStep(3);
  };

  const goToGroups = () => setStep(3);

  const handleCreateGroups = async (groupData) => {
    if (!selectedTournamentId) return;
    try {
      await api.assignTournamentGroups(selectedTournamentId, groupData);
      await updateProgressStep("groups_created");
      await fetchGroupsForSchedule();
      setStep(4);
    } catch (err) {
      console.error("Error creating groups:", err);
    }
  };

  const goToSchedule = async () => {
    await fetchGroupsForSchedule();
    setStep(4);
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      await api.generateKnockoutSchedule(selectedTournamentId, scheduleData);
      await updateProgressStep("schedule_created");
      setStep(5);
    } catch (err) {
      console.error(err);
    }
  };

  const goToStartMatch = async () => {
    setStep(5);
    await updateProgressStep("matches_started");
  };

  const handleStepClick = (stepId) => setStep(stepId);

  const getStepStatus = (stepId) => {
    if (stepId < step) return "completed";
    if (stepId === step) return "current";
    return "upcoming";
  };

  const handleStartMatch = (matchNo) => {
    fetchScheduledMatches();
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (step === 4 && selectedTournamentId && groups.length === 0) {
      fetchGroupsForSchedule();
    }
  }, [step, selectedTournamentId, groups.length]);

  useEffect(() => {
    console.log(
      "Step changed:", step,
      "Selected Tournament:", selectedTournamentId,
      "Tournament Dates:", tournamentDates
    );
    if (step === 5 && selectedTournamentId) {
      fetchScheduledMatches();
    }
  }, [step, selectedTournamentId, tournamentDates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Progress Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
            <div
              className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 z-0 transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            {steps.map((stepItem) => {
              const status = getStepStatus(stepItem.id);
              return (
                <div key={stepItem.id} className="relative z-10 flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(stepItem.id)}
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold
                      transition-all duration-300 transform hover:scale-105
                      ${
                        status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : status === "current"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      }
                    `}
                  >
                    {status === "completed" ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0
                          01-1.414 0l-4-4a1 1 0
                          011.414-1.414L8 12.586l7.293-7.293a1 1 0
                          011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-lg">{stepItem.icon}</span>
                    )}
                  </button>
                  <div
                    className={`mt-3 text-center ${
                      status === "current"
                        ? "text-blue-600 font-semibold"
                        : status === "completed"
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    <p className="text-sm">{stepItem.label}</p>
                    <p className="text-xs opacity-75">Step {stepItem.id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
          <div className="p-6">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{step}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{steps[step - 1]?.label}</h1>
            </div>

            {loading && <p className="text-gray-500">Loading...</p>}

            {step === 1 && (
              <OrganizerDashboard
                tournaments={tournaments}
                onViewTeams={goToAppliedTeams}
                onRefresh={fetchTournaments}
              />
            )}

            {step === 2 && (
              <AppliedTeams
                tournamentId={selectedTournamentId}
                teams={appliedTeams}
                onContinue={goToGroups}
                onTeamsCreated={handleCreateTeams}
              />
            )}

            {step === 3 &&
              (appliedTeams.some((team) => team.group_name) ? (
                <ViewAssignedGroups teams={appliedTeams} onContinue={goToSchedule} />
              ) : (
                <GroupCreation
                  teams={appliedTeams}
                  groups={groups}
                  onCreateGroups={handleCreateGroups}
                  onContinue={goToSchedule}
                />
              ))}

            {step === 4 && (
              <ScheduleCreation groups={groups} onCreateSchedule={handleCreateSchedule} onContinue={goToStartMatch} />
            )}

            {step === 5 && (
              <div className="py-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Scheduled Matches</h2>
                {loading ? (
                  <p className="text-gray-500 text-center">Loading matches...</p>
                ) : scheduledMatches.length === 0 ? (
                  <p className="text-center text-gray-600">No scheduled matches found.</p>
                ) : (
                  <>
                    {console.log("Rendering matches:", scheduledMatches)}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {scheduledMatches.map((match) => (
                        <MatchCard key={match.match_no} match={match} onStart={handleStartMatch} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
