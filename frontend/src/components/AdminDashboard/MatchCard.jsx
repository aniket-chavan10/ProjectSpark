import React from "react";

const MatchCard = ({ match, onStart }) => {
  const handleStart = () => {
    const url = `http://localhost:5174/matches/details/${match.id}`;
    window.open(url, "_blank");
    onStart(match.match_no);
  };

  // Display team name or placeholder for dependent matches
  const formatTeamName = (team, depMatchId) => {
    if (team && team.name) return team.name;
    if (depMatchId) return `Winner of Match ${depMatchId}`;
    return "TBD";
  };

  const team1Name = formatTeamName(match.team1, match.dependent_match1_id);
  const team2Name = formatTeamName(match.team2, match.dependent_match2_id);

  const team1Logo = match.team1?.logo || null;
  const team2Logo = match.team2?.logo || null;

  return (
    <div className={`shadow-md rounded-lg p-6 m-4 w-full transition-transform hover:scale-105 
      ${match.status === "completed" ? "bg-gray-200" : "bg-gradient-to-r from-blue-50 to-blue-100"}`}>
      <div className="text-center mb-4">
        <p className="text-sm font-bold text-gray-500">Match #{match.match_no}</p>
        <p className="text-xs text-gray-400">{match.match_date ? new Date(match.match_date).toLocaleDateString() : "Date N/A"} | {match.match_time || "Time N/A"}</p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {team1Logo ? <img src={team1Logo} alt={team1Name} className="w-12 h-12 rounded-full mr-3" /> :
            <div className="w-12 h-12 rounded-full mr-3 bg-gray-300 flex justify-center items-center text-xs">?</div>}
          <p className="text-lg font-semibold text-gray-800">{team1Name}</p>
        </div>
        <span className="text-gray-500 font-semibold">VS</span>
        <div className="flex items-center">
          {team2Logo ? <img src={team2Logo} alt={team2Name} className="w-12 h-12 rounded-full mr-3" /> :
            <div className="w-12 h-12 rounded-full mr-3 bg-gray-300 flex justify-center items-center text-xs">?</div>}
          <p className="text-lg font-semibold text-gray-800">{team2Name}</p>
        </div>
      </div>
      {match.status === "completed" ? (
        <div className="text-center mt-4">
          <p className="text-sm font-medium text-gray-700">Winner: <span className="text-green-600 font-bold">{match.winner_team_name || "N/A"}</span></p>
        </div>
      ) : (
        <div className="flex justify-center">
          <button onClick={handleStart} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition">Start</button>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
