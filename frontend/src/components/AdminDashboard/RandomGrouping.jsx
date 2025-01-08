// RandomGrouping.jsx
import React from "react";

const RandomGrouping = ({ teams, setGroups }) => {
  const groupNames = ['A', 'B', 'C', 'D'];

  const randomGroupTeams = () => {
    const shuffledTeams = [...teams];
    let assignedGroups = [];

    // Shuffle and assign groups randomly
    shuffledTeams.forEach(() => {
      const randomGroup = groupNames[Math.floor(Math.random() * groupNames.length)];
      assignedGroups.push(randomGroup);
    });

    setGroups(assignedGroups);
  };

  return (
    <div>
      <button
        onClick={randomGroupTeams}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Random Grouping
      </button>
    </div>
  );
};

export default RandomGrouping;
