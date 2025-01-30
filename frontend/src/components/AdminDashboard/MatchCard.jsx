import React from "react";

const MatchCard = ({ match, onStart }) => {
  return (
    <div
      className={`shadow-md rounded-lg p-6 m-4 w-full transition-all duration-300 transform hover:scale-105 
        ${match.status === "completed" ? "bg-gray-200" : "bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-lg"}`}
    >
      <div className="text-center mb-4">
        <p className="text-sm font-bold text-gray-500">Match #{match.id}</p>
        <p className="text-xs text-gray-400">
          {new Date(match.date).toLocaleDateString()} | {match.time}
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <img
            src={match.team1.logo}
            alt={match.team1.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <p className="text-lg font-semibold text-gray-800">{match.team1.name}</p>
        </div>
        <span className="text-gray-500 text-sm font-semibold">VS</span>
        <div className="flex items-center">
          <img
            src={match.team2.logo}
            alt={match.team2.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <p className="text-lg font-semibold text-gray-800">{match.team2.name}</p>
        </div>
      </div>

      {match.status === "completed" ? (
        <div className="text-center mt-4">
          <p className="text-sm font-medium text-gray-700">
            Winner: <span className="font-bold text-green-600">{match.winner}</span>
          </p>
        </div>
      ) : (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => onStart(match.id)}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Start Match
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
