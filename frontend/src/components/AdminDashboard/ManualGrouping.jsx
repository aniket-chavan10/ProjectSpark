import React, { useState } from "react";
import adminApi from "../../api/adminApi"; // Importing the pre-configured adminApi

const ManualGrouping = ({ savedTeams, onSaveGroups }) => {
  const [groupAssignments, setGroupAssignments] = useState(
    savedTeams.map((team) => ({
      id: team.team_id,
      team_name: team.team_name,
      team_logo: team.profilePicture || "https://via.placeholder.com/50?text=No+Logo",
      group: "",
    }))
  );
  const [warningVisible, setWarningVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
  };

  const handleGroupChange = (index, group) => {
    const updatedAssignments = [...groupAssignments];
    updatedAssignments[index].group = group;
    setGroupAssignments(updatedAssignments);
  };

  const handleSaveGroups = async () => {
    const unassignedTeams = groupAssignments.filter((team) => team.group === "");
    if (unassignedTeams.length > 0) {
      setWarningVisible(true);
      return;
    }
  
    setWarningVisible(false);
    setLoading(true);
  
    try {
      const groupAssignmentsPayload = groupAssignments.map((team) => ({
        teamId: team.id, // Ensure the correct property is used
        groupName: team.group,
      }));
  
      const payload = {
        tournamentId: 7, // Replace with dynamic ID if necessary
        groupAssignments: groupAssignmentsPayload,
        random: false,
      };
  
      console.log("Payload sent to backend:", JSON.stringify(payload, null, 2));
  
      const response = await adminApi.assignGroupsToTeams(payload);
      console.log("Groups assigned successfully:", response.data);
      onSaveGroups(groupAssignments);
    } catch (error) {
      console.error("Error assigning groups:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Manual Grouping
      </h1>

      {warningVisible && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Please assign all teams to groups before saving.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupAssignments.map((team, index) => (
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
                src={team.team_logo}
                alt={team.team_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-gray-800">{team.team_name}</span>
            </div>
            <select
              value={team.group}
              onChange={(e) => handleGroupChange(index, e.target.value)}
              className="px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Select Group
              </option>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="C">Group C</option>
              <option value="D">Group D</option>
            </select>
          </div>
        ))}
      </div>

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

export default ManualGrouping;
