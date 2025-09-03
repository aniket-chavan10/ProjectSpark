// src/components/OrganizerFlow/AppliedTeams.jsx
import React from "react";

export default function AppliedTeams({ tournamentId, teams = [], onContinue }) {
  const totalSlots = 32;
  const slots = Array.from({ length: totalSlots }, (_, i) => teams[i] || null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        Applied Teams ({teams.length}/{totalSlots})
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {slots.map((team, idx) => (
          <div 
            key={idx} 
            className={`border p-2 rounded-xl flex flex-col items-center ${
              team ? "bg-white" : "bg-gray-100 border-dashed"
            }`}
          >
            {team ? (
              <>
                {team.logo ? (
                  <img 
                    src={team.logo} 
                    alt={team.team_name} 
                    className="w-16 h-16 rounded-full" 
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                    No Logo
                  </div>
                )}
                <p className="mt-2 font-semibold">{team.team_name}</p>
                <p className="text-xs text-gray-500">
                  Captain: {team.captain_name || "N/A"}
                </p>
                <span 
                  className={`px-2 py-1 rounded text-white text-xs mt-1 ${
                    team.status === "approved"
                      ? "bg-green-500"
                      : team.status === "pending"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                >
                  {team.status}
                </span>
              </>
            ) : (
              <span className="text-gray-400 text-sm">Empty Slot</span>
            )}
          </div>
        ))}
      </div>
      {teams.length >= 2 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onContinue(tournamentId)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow"
          >
            Continue to Group Creation →
          </button>
        </div>
      )}
    </div>
  );
}
