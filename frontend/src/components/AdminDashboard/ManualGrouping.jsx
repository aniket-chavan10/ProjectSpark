import React, { useState, useEffect } from "react";
import adminApi from "../../api/adminApi"; // Import API functions

const ManualGrouping = ({ savedTeams, onSuccess }) => {
  const tournamentId = 6; // Hardcoded tournamentId for now
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [warningVisible, setWarningVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
  };

  // Update `groupAssignments` whenever `savedTeams` changes
  useEffect(() => {
    setGroupAssignments(
      savedTeams.map((team) => ({ ...team, group: "" }))
    );
  }, [savedTeams]);

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
      // Prepare the groupAssignments for the API request
      const formattedAssignments = groupAssignments.map((team) => ({
        teamId: team.id,
        groupName: team.group,
      }));
  
      // Call the backend API to assign groups to teams
      const response = await adminApi.assignGroupsToTeams(
        tournamentId, // Use hardcoded tournamentId here
        formattedAssignments,
        false // false for manual grouping
      );
  
      console.log("API Response:", response);
      onSuccess(response); // Trigger the parent callback on success
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save group assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        Manual Grouping of Teams
      </h1>

      {/* Warning Modal */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groupAssignments.map((team, index) => (
          <div
            key={team.id}
            className={`p-6 rounded-lg shadow-lg bg-white border border-gray-200 hover:shadow-xl transition-all`}
          >
            <div className="flex flex-col items-center text-center">
              <img
                src={team.profilePicture || "/default-profile.png"}
                alt={team.name}
                className="w-20 h-20 rounded-full object-cover mb-4"
              />
              <span className="text-xl font-semibold text-gray-800 mb-2">
                {team.team_name}
              </span>

              <select
                value={team.group}
                onChange={(e) => handleGroupChange(index, e.target.value)}
                className="px-4 py-2 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="" disabled>Select Group</option>
                <option value="A">Group A</option>
                <option value="B">Group B</option>
                <option value="C">Group C</option>
                <option value="D">Group D</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={handleSaveGroups}
          disabled={loading}
          className={`px-8 py-4 rounded-lg shadow-md text-white text-xl font-semibold transition-all ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700"
          }`}
        >
          {loading ? "Saving..." : "Save Group Assignments"}
        </button>
      </div>
    </div>
  );
};

export default ManualGrouping;
