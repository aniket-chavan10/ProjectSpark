import React, { useState } from "react";

// Helper function to shuffle the teams
const shuffleTeams = (teams) => {
  const shuffledTeams = [...teams];
  for (let i = shuffledTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
  }
  return shuffledTeams;
};

const RandomGrouping = ({ savedTeams }) => {
  const [groupAssignments, setGroupAssignments] = useState(
    savedTeams.map((team) => ({ ...team, group: "" }))
  );

  const [error, setError] = useState("");

  // Define color mapping for each group
  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
  };

  // Function to randomly assign teams to groups
  const handleRandomizeGroups = () => {
    const shuffledTeams = shuffleTeams(savedTeams); // Shuffle teams

    const updatedAssignments = shuffledTeams.map((team, index) => {
      // Assign each team to a group (A, B, C, D) cyclically
      const group = ["A", "B", "C", "D"][index % 4]; // This ensures even distribution
      return { ...team, group };
    });

    setGroupAssignments(updatedAssignments);
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Random Grouping
      </h1>

      {error && (
        <div className="text-red-600 font-semibold text-center mb-4">{error}</div>
      )}

      {/* Randomize Groups Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleRandomizeGroups}
          className="px-8 py-4 rounded-lg shadow-md bg-gradient-to-r from-purple-600 to-purple-800 text-white text-xl font-semibold hover:from-purple-500 hover:to-purple-700 transition-all"
        >
          Randomize Groups
        </button>
      </div>

      {/* Teams List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupAssignments.map((team, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-md flex items-center justify-between transition-all ${
              team.group
                ? `${groupColors[team.group]}`
                : "bg-gradient-to-b from-white via-gray-100 to-gray-200 hover:shadow-lg"
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Profile Picture */}
              <img
                src={team.profilePicture}
                alt={team.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {/* Team Name */}
              <span className="text-lg font-semibold text-gray-800">{team.name}</span>
            </div>
            {/* Assigned Group */}
            <span
              className={`text-sm font-semibold ${
                team.group ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {team.group ? `Group ${team.group}` : "Unassigned"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RandomGrouping;
