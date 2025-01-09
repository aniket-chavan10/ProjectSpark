import React, { useState } from "react";

const ManualGrouping = ({ savedTeams }) => {
  const [groupAssignments, setGroupAssignments] = useState(
    savedTeams.map((team) => ({ ...team, group: "" }))
  );

  // Handle group selection
  const handleGroupChange = (index, group) => {
    const updatedAssignments = [...groupAssignments];
    updatedAssignments[index].group = group;
    setGroupAssignments(updatedAssignments);
  };

  // Save or submit group assignments
  const handleSaveGroups = () => {
    console.log("Group Assignments:", groupAssignments);
    alert("Groups saved successfully!");
    // Perform any additional save or submit actions here
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Manual Grouping
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupAssignments.map((team, index) => (
          <div
            key={index}
            className="p-6 bg-gradient-to-b from-white via-gray-100 to-gray-200 rounded-lg shadow-md flex justify-between items-center hover:shadow-lg transition-all"
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

            {/* Dropdown for group selection */}
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
          className="px-8 py-4 rounded-lg shadow-md bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xl font-semibold hover:from-blue-500 hover:to-blue-700 transition-all"
        >
          Save Group Assignments
        </button>
      </div>
    </div>
  );
};

export default ManualGrouping;
