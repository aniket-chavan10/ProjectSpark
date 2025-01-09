import React, { useState } from "react";

const BulkGrouping = ({ savedTeams }) => {
  const [selectedGroup, setSelectedGroup] = useState("");
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

  // Handle group selection
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setError(""); // Clear any previous error
  };

  // Handle team selection
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
      // Remove from group if already assigned
      updatedAssignments[index].group = "";
    } else {
      // Check if group is already full
      if (currentGroupTeams.length >= 8) {
        setError(`Group ${selectedGroup} can only have 8 teams.`);
        return;
      }
      updatedAssignments[index].group = selectedGroup;
    }

    setGroupAssignments(updatedAssignments);
    setError(""); // Clear any errors after successful toggle
  };

  // Save or submit group assignments
  const handleSaveGroups = () => {
    const groupedTeams = groupAssignments.filter((team) => team.group !== "");
    console.log("Bulk Group Assignments:", groupedTeams);
    alert("Bulk group assignments saved successfully!");
    // Perform any additional save or submit actions here
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Bulk Grouping
      </h1>

      {/* Group Selection */}
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

      {/* Teams List */}
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

      {/* Save Button */}
      <div className="mt-12 text-center">
        <button
          onClick={handleSaveGroups}
          className="px-8 py-4 rounded-lg shadow-md bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xl font-semibold hover:from-blue-500 hover:to-blue-700 transition-all"
        >
          Save Group Assignments
        </button>
      </div>
    </div>
  );
};

export default BulkGrouping;
