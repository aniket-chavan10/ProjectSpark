// src/components/OrganizerFlow/OrganizerFlow.jsx
import React, { useState } from "react";
import OrganizerDashboard from "../Organizer";
import AppliedTeams from "../ShowAppliedTeams";
import GroupCreation from "../GroupTeams";
import ScheduleCreation from "../ScheduleFirstRound";

export default function OrganizerFlow() {
  const [step, setStep] = useState(1);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const steps = [
    { id: 1, label: "Tournaments", icon: "🏆" },
    { id: 2, label: "Teams", icon: "👥" },
    { id: 3, label: "Groups", icon: "🏢" },
    { id: 4, label: "Schedule", icon: "📅" },
    { id: 5, label: "Start", icon: "🚀" }
  ];

  const goToAppliedTeams = (tournamentId) => {
    setSelectedTournamentId(tournamentId);
    setStep(2);
  };

  const goToGroups = () => setStep(3);
  const goToSchedule = () => setStep(4);
  const goToStartMatch = () => setStep(5);

  const handleStepClick = (stepId) => {
    // TEMP: Allow navigation to any step
    // ORIGINAL:
    // if (stepId <= step || stepId === step) {
    setStep(stepId);
    // }
  };

  const getStepStatus = (stepId) => {
    if (stepId < step) return "completed";
    if (stepId === step) return "current";
    return "upcoming";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Progress Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative">
            {/* Progress Line Background */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
            
            {/* Progress Line Fill */}
            <div 
              className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 z-0 transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((stepItem) => {
              const status = getStepStatus(stepItem.id);
              return (
                <div key={stepItem.id} className="relative z-10 flex flex-col items-center">
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(stepItem.id)}
                    // disabled={stepItem.id > step} // TEMP: Commented so all steps are clickable
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold
                      transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
                      ${status === "completed" 
                        ? "bg-green-500 border-green-500 text-white shadow-lg hover:bg-green-600" 
                        : status === "current"
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                        : "bg-white border-gray-300 text-gray-400"}
                      cursor-pointer
                    `}
                  >
                    {status === "completed" ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-lg">{stepItem.icon}</span>
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className={`
                    mt-3 text-center min-w-max
                    ${status === "current" ? "text-blue-600 font-semibold" : 
                      status === "completed" ? "text-green-600 font-medium" : "text-gray-400"}
                  `}>
                    <p className="text-sm font-medium">{stepItem.label}</p>
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
            {/* Current Step Indicator */}
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{step}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {steps[step - 1]?.label}
                </h1>
              </div>
              <p className="text-gray-600 mt-2 ml-11">
                {step === 1 && "Manage your tournaments and view tournament details"}
                {step === 2 && "Review and manage teams that have applied to your tournament"}
                {step === 3 && "Create groups and organize teams for the competition"}
                {step === 4 && "Set up match schedules for the first round"}
                {step === 5 && "Tournament is ready to begin!"}
              </p>
            </div>

            {/* Step Content */}
            <div className="animate-fadeIn">
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
              {step === 5 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Tournament Started!</h2>
                  <p className="text-gray-600 text-lg">Your tournament is now live and ready for matches.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
