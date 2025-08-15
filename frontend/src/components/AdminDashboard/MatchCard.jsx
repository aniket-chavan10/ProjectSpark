import React from "react";

const MatchCard = ({ match, onStart }) => {
  console.log("MatchCard received match:", match);
  const handleStartMatch = (matchNo) => {
    const externalProjectBaseUrl = "http://localhost:5173"; // Update with actual URL
    const matchUrl = `${externalProjectBaseUrl}/matches/details/${matchNo}`;

    window.open(matchUrl, "_blank"); // Opens the new tab with match number
    onStart(matchNo); // Pass match_no to onStart callback
  };

  // Safe fallback data
  const team1 = match.team1 || { logo: "", name: "Team 1" };
  const team2 = match.team2 || { logo: "", name: "Team 2" };

  return (
    <div
      className={`shadow-md rounded-lg p-6 m-4 w-full transition-all duration-300 transform hover:scale-105 
        ${match.status === "completed" ? "bg-gray-200" : "bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-lg"}`}
    >
      <div className="text-center mb-4">
        <p className="text-sm font-bold text-gray-500">Match #{match.match_no}</p>
        <p className="text-xs text-gray-400">
          {match.date ? new Date(match.date).toLocaleDateString() : "Date N/A"} | {match.time || "Time N/A"}
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {team1.logo ? (
            <img
              src={team1.logo}
              alt={team1.name}
              className="w-12 h-12 rounded-full mr-3"
            />
          ) : (
            <div className="w-12 h-12 rounded-full mr-3 bg-gray-300" />
          )}
          <p className="text-lg font-semibold text-gray-800">{team1.name}</p>
        </div>

        <span className="text-gray-500 text-sm font-semibold">VS</span>

        <div className="flex items-center">
          {team2.logo ? (
            <img
              src={team2.logo}
              alt={team2.name}
              className="w-12 h-12 rounded-full mr-3"
            />
          ) : (
            <div className="w-12 h-12 rounded-full mr-3 bg-gray-300" />
          )}
          <p className="text-lg font-semibold text-gray-800">{team2.name}</p>
        </div>
      </div>

      {match.status === "completed" ? (
        <div className="text-center mt-4">
          <p className="text-sm font-medium text-gray-700">
            Winner: <span className="font-bold text-green-600">{match.winner || "N/A"}</span>
          </p>
        </div>
      ) : (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => handleStartMatch(match.match_no)}
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
