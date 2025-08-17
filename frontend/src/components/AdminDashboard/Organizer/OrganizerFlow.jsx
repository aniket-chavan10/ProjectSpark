import React, { useEffect, useState } from "react";
import OrganizerDashboard from "../Organizer";
import AppliedTeams from "../ViewAppliedTeams";
import GroupCreation from "../GroupTeams";
import ViewAssignedGroups from "../ViewAssignedGroups";
import ScheduleCreation from "../ScheduleFirstRound";
import api from "../../../api/tournamentApi1";
import MatchCard from "../MatchCard";

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

  // Fetch tournament progress and set step accordingly (with debug logs)
  const fetchProgress = async (tournamentId) => {
    try {
      let result = await api.getTournamentProgress(tournamentId);
      if (Array.isArray(result)) result = result[0] || {};
      setProgress(result);

      console.log("Progress result:", result);

      // Use exact key names from API response
      const matchesStarted = Number(result?.matches_started) || 0;
      const scheduleCreated = Number(result?.schedule_created) || 0;
      const groupsCreated = Number(result?.groups_created) || 0;
      const teamsCreated = Number(result?.teams_created) || 0;

      console.log(
        `Parsed progress - matchesStarted: ${matchesStarted}, scheduleCreated: ${scheduleCreated}, groupsCreated: ${groupsCreated}, teamsCreated: ${teamsCreated}`
      );

      if (matchesStarted) {
        console.log("Setting step to 5 because matchesStarted is true");
        setStep(5);
      } else if (scheduleCreated) {
        console.log("Setting step to 5 because scheduleCreated is true");
        setStep(5);
      } else if (groupsCreated) {
        console.log("Setting step to 3 because groupsCreated is true");
        setStep(3);
      } else if (teamsCreated) {
        console.log("Setting step to 2 because teamsCreated is true");
        setStep(2);
      } else {
        console.log("Setting step to 1 as default");
        setStep(1);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
      setProgress(null);
      setStep(1);
    }
  };

  // Update progress in backend
  const updateProgressStep = async (key, value = true) => {
    if (!selectedTournamentId) return;
    try {
      const result = await api.updateTournamentProgress(selectedTournamentId, { [key]: value });
      setProgress(result);
    } catch {
      // optionally log error here
    }
  };

  // Fetch tournaments assigned to organizer
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getTournamentsByOrganizer();
      const list = Array.isArray(res) ? res : Array.isArray(res.data) ? res.data : [];
      setTournaments(list);
    } catch (err) {
      console.error("Error fetching tournaments", err);
    }
    setLoading(false);
  };

  // Fetch applied teams for a tournament
  const fetchAppliedTeams = async (tournamentId) => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const res = await api.getAppliedTeams(tournamentId);
      console.log("Applied Teams Response:", res);
      const list = Array.isArray(res) ? res : Array.isArray(res.data) ? res.data : [];
      setAppliedTeams(list);
    } catch (err) {
      console.error("Error fetching applied teams", err);
      setAppliedTeams([]);
    }
    setLoading(false);
  };

  // Fetch groups with teams for schedule step
  const fetchGroupsForSchedule = async () => {
    if (!selectedTournamentId) return [];
    try {
      const data = await api.getGroupsWithTeams(selectedTournamentId);
      setGroups(data);
      return data;
    } catch (err) {
      console.error("Failed fetching groups", err);
      setGroups([]);
      return [];
    }
  };

  // Enrich matches data with team info or placeholder text
  const enrichMatchesWithTeamsAndPlaceholders = (matches, groups) => {
    const allTeams = groups.flatMap((g) => g.teams || []);
    const teamLookup = allTeams.reduce((acc, team) => {
      acc[String(team.id)] = team;
      return acc;
    }, {});

    const matchIdToMatchNo = matches.reduce((acc, m) => {
      acc[m.id] = m.match_no;
      return acc;
    }, {});

    return matches.map((match) => {
      const team1 = teamLookup[String(match.team1_id)];
      const team1Name = team1?.name
        ? team1.name
        : match.dependent_match1_id
        ? `Winner of Match ${matchIdToMatchNo[match.dependent_match1_id] || "?"}`
        : "TBD";

      const team2 = teamLookup[String(match.team2_id)];
      const team2Name = team2?.name
        ? team2.name
        : match.dependent_match2_id
        ? `Winner of Match ${matchIdToMatchNo[match.dependent_match2_id] || "?"}`
        : "TBD";

      return {
        ...match,
        team1: team1 || null,
        team1DisplayName: team1Name,
        team2: team2 || null,
        team2DisplayName: team2Name,
      };
    });
  };

  // Fetch scheduled matches and enrich them
  const fetchScheduledMatches = async (groupsData) => {
    if (!selectedTournamentId) return;
    setLoading(true);
    try {
      const matchesResponse = await api.getScheduledMatches(selectedTournamentId);
      const matches = Array.isArray(matchesResponse)
        ? matchesResponse
        : matchesResponse.matches || [];

      const enrichedMatches = enrichMatchesWithTeamsAndPlaceholders(matches, groupsData || groups);
      setScheduledMatches(enrichedMatches);
    } catch (err) {
      console.error("Error fetching scheduled matches", err);
      setScheduledMatches([]);
    }
    setLoading(false);
  };

  // Effect to fetch schedule matches when step is 5
  useEffect(() => {
    if (step === 5 && selectedTournamentId) {
      (async () => {
        const groupsData = await fetchGroupsForSchedule();
        await fetchScheduledMatches(groupsData);
      })();
    }
  }, [step, selectedTournamentId]);

  // Effect to update tournament dates when selected tournament or tournaments list changes
  useEffect(() => {
    if (selectedTournamentId && tournaments.length) {
      const tournament = tournaments.find(
        (t) => String(t.tournament_id || t.id) === String(selectedTournamentId)
      );
      if (tournament) {
        setTournamentDates({
          start_date: tournament.start_date || null,
          end_date: tournament.end_date || null,
        });
      } else {
        setTournamentDates({ start_date: null, end_date: null });
      }
    } else {
      setTournamentDates({ start_date: null, end_date: null });
    }
  }, [selectedTournamentId, tournaments]);

  // When a new tournament is created, select it and move to step 2
  const onTournamentCreated = async (newTournamentId) => {
    if (!newTournamentId) return;
    setSelectedTournamentId(newTournamentId);
    await fetchProgress(newTournamentId);
    setStep(2);
  };

  // When "View Teams" clicked, load teams and progress, do NOT override step set by fetchProgress
  const goToAppliedTeams = async (tournamentId) => {
    setSelectedTournamentId(tournamentId);
    try {
      await fetchAppliedTeams(tournamentId);
      await fetchProgress(tournamentId);
      // Removed setStep(2) to allow fetchProgress to control step accurately
    } catch {
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
            />
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
                onTournamentCreated={onTournamentCreated}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {scheduledMatches.map((match) => (
                      <MatchCard key={match.match_no} match={match} onStart={handleStartMatch} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
