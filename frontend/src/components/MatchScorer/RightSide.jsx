import React from "react";

const RightSide = () => {
  // Static Data - 11 Players for Each Team
  const leftPlayers = [
    { id: 1, name: "Player 1", photo: "https://via.placeholder.com/50" },
    { id: 2, name: "Player 2", photo: "https://via.placeholder.com/50" },
    { id: 3, name: "Player 3", photo: "https://via.placeholder.com/50" },
    { id: 4, name: "Player 4", photo: "https://via.placeholder.com/50" },
    { id: 5, name: "Player 5", photo: "https://via.placeholder.com/50" },
    { id: 6, name: "Player 6", photo: "https://via.placeholder.com/50" },
    { id: 7, name: "Player 7", photo: "https://via.placeholder.com/50" },
    { id: 8, name: "Player 8", photo: "https://via.placeholder.com/50" },
    { id: 9, name: "Player 9", photo: "https://via.placeholder.com/50" },
    { id: 10, name: "Player 10", photo: "https://via.placeholder.com/50" },
    { id: 11, name: "Player 11", photo: "https://via.placeholder.com/50" },
  ];

  const rightPlayers = [
    { id: 1, name: "Player A", photo: "https://via.placeholder.com/50" },
    { id: 2, name: "Player B", photo: "https://via.placeholder.com/50" },
    { id: 3, name: "Player C", photo: "https://via.placeholder.com/50" },
    { id: 4, name: "Player D", photo: "https://via.placeholder.com/50" },
    { id: 5, name: "Player E", photo: "https://via.placeholder.com/50" },
    { id: 6, name: "Player F", photo: "https://via.placeholder.com/50" },
    { id: 7, name: "Player G", photo: "https://via.placeholder.com/50" },
    { id: 8, name: "Player H", photo: "https://via.placeholder.com/50" },
    { id: 9, name: "Player I", photo: "https://via.placeholder.com/50" },
    { id: 10, name: "Player J", photo: "https://via.placeholder.com/50" },
    { id: 11, name: "Player K", photo: "https://via.placeholder.com/50" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Header Buttons */}
      <div className="col-span-2">
        <div className="flex justify-between items-center bg-gray-800 text-white p-4 rounded-t-lg">
          <div className="flex space-x-4">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Welcome</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Player List</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">T1 Batting</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">T1 Bowling</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">T2 Batting</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">T2 Bowling</button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Match Summary</button>
          </div>
        </div>
      </div>

      {/* Left Column */}
      <div className="space-y-2">
        <div className="bg-gray-800 text-white text-center py-2 font-bold text-lg">
          Update Players
        </div>
        {leftPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-2 ${
              index % 2 === 0 ? "bg-gray-100" : "bg-white"
            }`}
          >
            <div className="flex items-center space-x-4">
              <span className="font-semibold">{player.name}</span>
              <div className="flex space-x-2">
                <button className="w-6 h-6 bg-gray-300 text-white text-xs rounded">1</button>
                <button className="w-6 h-6 bg-gray-300 text-white text-xs rounded">2</button>
                <button className="w-6 h-6 bg-blue-500 text-white text-xs rounded">B</button>
              </div>
            </div>
            <img className="w-10 h-10 rounded-full object-cover" src={player.photo} alt={player.name} />
          </div>
        ))}
      </div>

      {/* Right Column */}
      <div className="space-y-2">
        <div className="bg-gray-800 text-white text-center py-2 font-bold text-lg">
          Update Photos
        </div>
        {rightPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-2 ${
              index % 2 === 0 ? "bg-gray-100" : "bg-white"
            }`}
          >
            <div className="flex items-center space-x-4">
              <span className="font-semibold">{player.name}</span>
              <div className="flex space-x-2">
                <button className="w-6 h-6 bg-gray-300 text-white text-xs rounded">1</button>
                <button className="w-6 h-6 bg-gray-300 text-white text-xs rounded">2</button>
                <button className="w-6 h-6 bg-blue-500 text-white text-xs rounded">B</button>
              </div>
            </div>
            <img className="w-10 h-10 rounded-full object-cover" src={player.photo} alt={player.name} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RightSide;