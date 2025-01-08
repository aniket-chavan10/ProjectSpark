// BulkGrouping.jsx
import React, { useState } from "react";

const BulkGrouping = ({ teams, setGroups }) => {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [selectedTeams, setSelectedTeams] = useState([]);

  const groupNames = ['A', 'B', 'C', 'D'];

  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  const handleTeamSelection = (index) => {
    const updatedSelectedTeams = [...selectedTeams];
    if (updatedSelectedTeams.includes(index)) {
      const teamIndex = updatedSelectedTeams.indexOf(index);
      updatedSelectedTeams.splice(teamIndex, 1);
    } else {
      updatedSelectedTeams.push(index);
    }
    setSelectedTeams(updatedSelectedTeams);
  };

  const assignTeamsToGroup = () => {
    const updatedGroups = [...groups];
    selectedTeams.forEach((index) => {
      updatedGroups[index] = selectedGroup;
    });
    setGroups(updatedGroups);
    setSelectedTeams([]);
  };

  return (
    <div>
      <div className="mb-6">
        <label className="mr-4">Select Group for Bulk Assignment:</label>
        <select
          className="p-2 border rounded-md"
          onChange={handleGroupChange}
          value={selectedGroup}
        >
          {groupNames.map((group) => (
            <option key={group} value={group}>
              Group {group}
            </option>
          ))}
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
  );
};

export default BulkGrouping;
