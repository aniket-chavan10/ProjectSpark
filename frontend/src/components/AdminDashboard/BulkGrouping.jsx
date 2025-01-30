import React, { useState, useEffect, useContext } from "react";
import adminApi from "../../api/adminApi"; // Importing the pre-configured adminApi
import { TournamentContext } from "../../contexts/TournamentContext";

const BulkGrouping = ({ savedTeams, onSaveGroups }) => {
  const { tournamentId } = useContext(TournamentContext); // Access tournamentId from context

  const [groupAssignments, setGroupAssignments] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [error, setError] = useState("");
  const [warningVisible, setWarningVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const groupColors = {
    A: "bg-blue-200",
    B: "bg-green-200",
    C: "bg-yellow-200",
    D: "bg-red-200",
  };

  useEffect(() => {
    if (Array.isArray(savedTeams) && savedTeams.length > 0) {
      const initializedTeams = savedTeams.map((team) => ({
        id: team.team_id || team.id,
        team_name: team.team_name || `Team ${team.id}`,
        profilePicture:
          team.team_logo || `https://via.placeholder.com/50?text=T${team.id}`,
        group: team.group || "",
      }));
      setGroupAssignments(initializedTeams);
    } else {
      console.error("Invalid savedTeams data:", savedTeams);
      setGroupAssignments([]);
    }
  }, [savedTeams]);

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setError("");
  };

  const handleTeamToggle = (index) => {
    if (!selectedGroup) {
      setError("Please select a group before assigning teams.");
      return;
    }

    const updatedAssignments = [...groupAssignments];
    const currentGroupTeams = updatedAssignments.filter(
      (team) => team.group === selectedGroup
    );

    if (updatedAssignments[index].group === selectedGroup) {
      updatedAssignments[index].group = "";
    } else {
      if (currentGroupTeams.length >= 8) {
        setError(`Group ${selectedGroup} can only have 8 teams.`);
        return;
      }
      updatedAssignments[index].group = selectedGroup;
    }

    setGroupAssignments(updatedAssignments);
    setError("");
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
        teamId: team.id,
        groupName: team.group,
      }));

      const payload = {
        tournamentId, // Use tournamentId from context
        groupAssignments: groupAssignmentsPayload,
        random: false,
      };

      console.log("Payload sent to backend:", JSON.stringify(payload, null, 2));
      const response = await adminApi.assignGroupsToTeams(payload);
      console.log("Groups assigned successfully:", response);

      onSaveGroups(groupAssignments);
      setSelectedGroup("");
    } catch (error) {
      console.error("Error assigning groups:", error.response?.data || error.message);
      setError("Failed to save group assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Bulk Grouping
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

      <div className="flex justify-center space-x-4 mb-8">
        {["A", "B", "C", "D"].map((group) => (
          <button
            key={group}
            onClick={() => handleGroupSelect(group)}
            className={`px-8 py-4 rounded-lg text-white text-xl font-semibold ${
              selectedGroup === group
                ? "bg-blue-600"
                : "bg-gradient-to-r from-teal-500 to-teal-700"
            } hover:from-teal-400 hover:to-teal-600 transition-all`}
          >
            Select Group {group}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-600 font-semibold text-center mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupAssignments.map((team, index) => (
          <div
            key={index}
            onClick={() => handleTeamToggle(index)}
            className={`p-6 rounded-lg shadow-md flex items-center justify-between cursor-pointer transition-all ${
              team.group === selectedGroup
                ? `${groupColors[selectedGroup]}`
                : "bg-gradient-to-b from-white via-gray-100 to-gray-200 hover:shadow-lg"
            }`}
          >
            <div className="flex items-center space-x-4">
              <img
                src={team.profilePicture}
                alt={team.team_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-gray-800">
                {team.team_name}
              </span>
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

export default BulkGrouping;
