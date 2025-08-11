// src/components/OrganizerFlow/OrganizerFlow.jsx
import React, { useState } from "react";
import OrganizerDashboard from "../Organizer";
import AppliedTeams from "../ViewAppliedTeams";
import GroupCreation from "../ManualGrouping"; // Placeholder for future
import ScheduleCreation from "../ScheduleFirstRound"; // Placeholder

export default function OrganizerFlow() {
  const [step, setStep] = useState(1);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const goToAppliedTeams = (tournamentId) => {
    setSelectedTournamentId(tournamentId);
    setStep(2);
  };

  const goToGroups = () => setStep(3);
  const goToSchedule = () => setStep(4);
  const goToStartMatch = () => setStep(5);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Stepper header */}
      <div className="flex justify-center mb-8 space-x-4">
        {["Tournaments", "Teams", "Groups", "Schedule", "Start"].map(
          (label, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                step === idx + 1 ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              {idx + 1}. {label}
            </div>
          )
        )}
      </div>

      {/* Steps */}
      {step === 1 && <OrganizerDashboard onViewTeams={goToAppliedTeams} />}
      {step === 2 && (
        <AppliedTeams
          tournamentId={selectedTournamentId}
          onContinue={goToGroups}
        />
      )}
      {step === 3 && (
        <GroupCreation
          tournamentId={selectedTournamentId}
          onContinue={goToSchedule}
        />
      )}
      {step === 4 && (
        <ScheduleCreation
          tournamentId={selectedTournamentId}
          onContinue={goToStartMatch}
        />
      )}
      {step === 5 && <p className="text-center">Match Started!</p>}
    </div>
  );
}
