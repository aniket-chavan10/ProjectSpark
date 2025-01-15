import React from "react";

const SavedGroups = ({ groupedTeams }) => {
  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Grouped Teams
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupedTeams.map((team, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-md flex justify-between items-center transition-all ${
              team.group
                ? groupColors[team.group]
                : "bg-gradient-to-b from-white via-gray-100 to-gray-200"
            }`}
          >
            <div className="flex items-center space-x-4">
              <img
                src={team.profilePicture}
                alt={team.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-gray-800">{team.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {team.group ? `Group ${team.group}` : "Unassigned"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedGroups;
