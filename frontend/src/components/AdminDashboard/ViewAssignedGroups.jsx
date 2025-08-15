import React from "react";

export default function AssignedGroupsView({ teams, onContinue }) {
  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
    null: "bg-gray-200"
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Current Group Assignments</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.map(team => (
          <div
            key={team.team_id}
            className={`p-4 rounded shadow ${groupColors[team.group_name || "null"]}`}
          >
            <img
              src={team.logo}
              alt={team.team_name}
              className="w-12 h-12 rounded-full object-cover mb-2"
            />
            <p className="font-semibold">{team.team_name}</p>
            <p className="text-sm text-gray-700">
              {team.group_name ? `Group ${team.group_name}` : "No Group Assigned"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onContinue}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
        >
          Continue to Schedule
        </button>
      </div>
    </div>
  );
}
