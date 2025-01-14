// OneByOneGrouping.jsx
import React from "react";

const OneByOneGrouping = ({ teams, setGroups }) => {
  const groupNames = ['A', 'B', 'C', 'D'];

  const oneByOneGroupTeams = () => {
    const updatedGroups = Array(teams.length).fill(null);
    let groupIndex = 0;

    teams.forEach((_, index) => {
      updatedGroups[index] = groupNames[groupIndex];
      groupIndex = (groupIndex + 1) % groupNames.length;
    });

    setGroups(updatedGroups);
  };

  return (
    <div>
      <button
        onClick={oneByOneGroupTeams}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        One by One Grouping
      </button>
    </div>
  );
};

export default OneByOneGrouping;
