import React, { useState } from "react";
import adminApi from "../../api/adminApi"; // Importing the pre-configured API

// Helper function to shuffle the teams
const shuffleTeams = (teams) => {
  const shuffledTeams = [...teams];
  for (let i = shuffledTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
  }
  return shuffledTeams;
};

const RandomGrouping = ({ onSaveGroups, savedTeams }) => {
  const [groupAssignments, setGroupAssignments] = useState(
    savedTeams.map((team) => ({ ...team, group: "" }))
  );

  const [warningVisible, setWarningVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const group = ["A", "B", "C", "D"][index % 4];
      return { ...team, group };
    });

    setGroupAssignments(updatedAssignments);
    setWarningVisible(false);
  };

  // Save or submit group assignments
  const handleSaveGroups = async () => {
    // Check if all teams have been assigned to a group
    const unassignedTeams = groupAssignments.filter((team) => team.group === "");
    if (unassignedTeams.length > 0) {
      setWarningVisible(true);
      return;
    }

    setWarningVisible(false); // Hide warning
    setLoading(true); // Start loading state

    try {
      const groupAssignmentsPayload = groupAssignments.map((team) => ({
        teamId: team.id,
        groupName: team.group,
      }));

      const payload = {
        tournamentId: 6, // Hardcoded tournament ID
        groupAssignments: groupAssignmentsPayload,
        random: true,
      };

      console.log("Payload sent to backend:", JSON.stringify(payload, null, 2));
      const response = await adminApi.assignGroupsToTeams(payload);
      console.log("Groups assigned successfully:", response);

      onSaveGroups(groupAssignments); // Notify parent component
    } catch (err) {
      console.error("Error assigning groups:", err.response?.data || err.message);
      setError("Failed to save group assignments. Please try again.");
    } finally {
      setLoading(false); // Stop loading state
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Random Grouping
      </h1>

      {/* Modal for warning */}
      {warningVisible && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Please randomize the groups before saving.
            </h2>
            <div className="text-center">
              <button
                onClick={() => setWarningVisible(false)}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
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

      {error && (
        <div className="text-red-600 font-semibold text-center mb-4">{error}</div>
      )}

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
              <img
                src={team.profilePicture}
                alt={team.team_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-gray-800">{team.team_name}</span>
            </div>
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

      {/* Save Button */}
      <div className="mt-12 text-center">
        <button
          onClick={handleSaveGroups}
          disabled={loading}
          className={`px-8 py-4 rounded-lg shadow-md bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xl font-semibold hover:from-blue-500 hover:to-blue-700 transition-all ${
            loading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {loading ? "Saving..." : "Save Group Assignments"}
        </button>
      </div>
    </div>
  );
};

export default RandomGrouping;
