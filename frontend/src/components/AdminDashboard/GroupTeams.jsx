import React, { useState } from "react";

const GroupTeams = () => {
  const registeredTeams = [
    "Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6", "Team 7", "Team 8",
    "Team 9", "Team 10", "Team 11", "Team 12", "Team 13", "Team 14", "Team 15", "Team 16",
    "Team 17", "Team 18", "Team 19", "Team 20", "Team 21", "Team 22", "Team 23", "Team 24",
    "Team 25", "Team 26", "Team 27", "Team 28", "Team 29", "Team 30", "Team 31", "Team 32",
  ];

  const groupColors = {
    A: "bg-red-200",
    B: "bg-blue-200",
    C: "bg-green-200",
    D: "bg-yellow-200"
  };

  const [teams, setTeams] = useState(registeredTeams);
  const [groups, setGroups] = useState(Array(registeredTeams.length).fill(null));
  const [groupingMethod, setGroupingMethod] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editName, setEditName] = useState("");

  // Handle the group selection for Bulk Grouping
  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  // Handle team selection for Bulk Grouping
  const handleTeamSelection = (index) => {
    const updatedSelectedTeams = [...selectedTeams];
    if (updatedSelectedTeams.includes(index)) {
      const teamIndex = updatedSelectedTeams.indexOf(index);
      updatedSelectedTeams.splice(teamIndex, 1); // Remove team if already selected
    } else {
      updatedSelectedTeams.push(index); // Add team to the selection
    }
    setSelectedTeams(updatedSelectedTeams);
  };

  // Assign selected teams to the chosen group
  const assignTeamsToGroup = () => {
    const updatedGroups = [...groups];
    selectedTeams.forEach((index) => {
      updatedGroups[index] = selectedGroup; // Assign the selected group to the team
    });
    setGroups(updatedGroups);
    setSelectedTeams([]); // Clear the selection after assignment
    setGroupingMethod(null); // Exit Bulk Grouping mode
  };

  // Handle Random Grouping
  const randomGroupTeams = () => {
    const groupNames = ['A', 'B', 'C', 'D'];
    const shuffledTeams = [...teams];
    let assignedGroups = [];

    // Shuffle and assign groups randomly
    shuffledTeams.forEach((_, index) => {
      const randomGroup = groupNames[Math.floor(Math.random() * groupNames.length)];
      assignedGroups[index] = randomGroup;
    });

    setGroups(assignedGroups);
  };

  // Handle One-by-One Grouping
  const oneByOneGroupTeams = () => {
    const groupNames = ['A', 'B', 'C', 'D'];
    const updatedGroups = [...groups];

    let groupIndex = 0;
    teams.forEach((_, index) => {
      updatedGroups[index] = groupNames[groupIndex];
      groupIndex = (groupIndex + 1) % groupNames.length;
    });

    setGroups(updatedGroups);
  };

  // Bulk Grouping option
  const bulkGroupAssign = () => {
    setGroupingMethod("bulk");
  };

  // Function to handle team editing
  const handleEdit = (index) => {
    setIsEditing(true);
    setEditIndex(index);
    setEditName(teams[index]);
  };

  const handleSaveEdit = () => {
    const updatedTeams = [...teams];
    updatedTeams[editIndex] = editName;
    setTeams(updatedTeams);
    setIsEditing(false);
    setEditIndex(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditIndex(null);
    setEditName("");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Teams</h1>

      {/* Grouping Options */}
      {groupingMethod === null && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Choose a Grouping Method</h2>
          <button
            onClick={bulkGroupAssign}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 mr-4"
          >
            Bulk Grouping
          </button>
          <button
            onClick={randomGroupTeams}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-4"
          >
            Random Grouping
          </button>
          <button
            onClick={oneByOneGroupTeams}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            One by One Grouping
          </button>
        </div>
      )}

      {/* Show group selection and team selection for Bulk Grouping */}
      {groupingMethod === "bulk" && (
        <div>
          <div className="mb-6">
            <label className="mr-4">Select Group for Bulk Assignment:</label>
            <select
              className="p-2 border rounded-md"
              onChange={handleGroupChange}
              value={selectedGroup}
            >
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="C">Group C</option>
              <option value="D">Group D</option>
            </select>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Select Teams to Assign</h3>
            <div className="grid grid-cols-4 gap-4">
              {teams.map((team, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`team-${index}`}
                    checked={selectedTeams.includes(index)}
                    onChange={() => handleTeamSelection(index)}
                    className="mr-2"
                  />
                  <label htmlFor={`team-${index}`} className="text-gray-700">{team}</label>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={assignTeamsToGroup}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Assign Selected Teams
          </button>
        </div>
      )}

      {/* Display the teams in 8-8-8-8 columns */}
      <div className="flex gap-8 mb-6">
        <div className="flex-1">
          {teams.slice(0, 8).map((team, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${groupColors[groups[index]] || 'bg-white'}`}
            >
              <span className="text-lg font-semibold text-gray-700">{team}</span>
              <button
                onClick={() => handleEdit(index)}
                className="text-blue-500 underline hover:text-blue-700"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {teams.slice(8, 16).map((team, index) => (
            <div
              key={index + 8}
              className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${groupColors[groups[index + 8]] || 'bg-white'}`}
            >
              <span className="text-lg font-semibold text-gray-700">{team}</span>
              <button
                onClick={() => handleEdit(index + 8)}
                className="text-blue-500 underline hover:text-blue-700"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {teams.slice(16, 24).map((team, index) => (
            <div
              key={index + 16}
              className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${groupColors[groups[index + 16]] || 'bg-white'}`}
            >
              <span className="text-lg font-semibold text-gray-700">{team}</span>
              <button
                onClick={() => handleEdit(index + 16)}
                className="text-blue-500 underline hover:text-blue-700"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {teams.slice(24).map((team, index) => (
            <div
              key={index + 24}
              className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${groupColors[groups[index + 24]] || 'bg-white'}`}
            >
              <span className="text-lg font-semibold text-gray-700">{team}</span>
              <button
                onClick={() => handleEdit(index + 24)}
                className="text-blue-500 underline hover:text-blue-700"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
            <h2 className="text-xl font-bold mb-4">Edit Team Name</h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTeams;
