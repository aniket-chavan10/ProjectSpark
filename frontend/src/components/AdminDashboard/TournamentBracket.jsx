import React, { useState } from 'react';

// Sample teams for Round 1
const teams = [
  "Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6", "Team 7", "Team 8",
  "Team 9", "Team 10", "Team 11", "Team 12", "Team 13", "Team 14", "Team 15", "Team 16"
];

// Function to create a match component
const Match = ({ match, onSelectWinner }) => {
  return (
    <div className="flex justify-between items-center space-x-4 p-4 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
      <span className="text-xl font-semibold text-gray-800">{match[0]}</span>
      <span className="text-xl font-semibold text-gray-800">{match[1]}</span>
      <div className="space-x-2">
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          onClick={() => onSelectWinner(match[0])}
        >
          Choose {match[0]}
        </button>
        <button 
          className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
          onClick={() => onSelectWinner(match[1])}
        >
          Choose {match[1]}
        </button>
      </div>
    </div>
  );
};

// Function to create a round component
const Round = ({ roundNumber, matches, onSelectWinner, isFinal, roundIndex }) => {
  return (
    <div className="flex flex-col items-center mb-10 space-y-4 relative">
      <h3 className={`text-2xl font-bold ${isFinal ? 'text-red-600' : 'text-indigo-600'} mb-6`}>Round {roundNumber}</h3>
      <div className="space-y-8">
        {matches.map((match, index) => (
          <Match key={index} match={match} onSelectWinner={onSelectWinner} />
        ))}
      </div>

      {/* Connecting lines to the next round */}
      {roundIndex < 3 && (
        <div className="absolute top-0 right-0 bottom-0 left-0">
          <svg className="absolute top-0 left-0 right-0 bottom-0 w-full h-full" viewBox="0 0 100 100">
            <line x1="100%" y1="0" x2="100%" y2="100%" stroke="gray" strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  );
};

const TournamentBracket = () => {
  const [teamsInRound, setTeamsInRound] = useState([teams]);

  const onSelectWinner = (winner) => {
    // Get the current round index
    const currentRoundIndex = teamsInRound.length - 1;
    
    // Get the teams from the current round
    const currentRoundTeams = teamsInRound[currentRoundIndex];
    
    // Create the next round based on winners
    const nextRoundTeams = [];
    
    // For each match in the current round, the winner moves to the next round
    for (let i = 0; i < currentRoundTeams.length; i += 2) {
      const match = currentRoundTeams.slice(i, i + 2);
      if (match[0] === winner) {
        nextRoundTeams.push(match[0]);
      } else if (match[1] === winner) {
        nextRoundTeams.push(match[1]);
      }
    }

    // If this is the last round, the winner is the champion
    if (nextRoundTeams.length === 1) {
      alert(`${nextRoundTeams[0]} is the champion!`);
      return;
    }
    
    // Set the new state of the next round teams
    setTeamsInRound([
      ...teamsInRound,
      nextRoundTeams
    ]);
  };

  const getMatchesForRound = (roundIndex) => {
    const teamsInThisRound = teamsInRound[roundIndex];
    const matches = [];
    for (let i = 0; i < teamsInThisRound.length; i += 2) {
      matches.push([teamsInThisRound[i], teamsInThisRound[i + 1]]);
    }
    return matches;
  };

  return (
    <div className="max-w-6xl mx-auto py-12 relative">
      <div className="flex justify-between space-x-6">
        {/* Round 1 */}
        <Round
          roundNumber={1}
          matches={getMatchesForRound(0)}
          onSelectWinner={onSelectWinner}
          roundIndex={0}
        />
        
        {/* Round 2 */}
        {teamsInRound[1] && (
          <Round
            roundNumber={2}
            matches={getMatchesForRound(1)}
            onSelectWinner={onSelectWinner}
            roundIndex={1}
          />
        )}

        {/* Round 3 */}
        {teamsInRound[2] && (
          <Round
            roundNumber={3}
            matches={getMatchesForRound(2)}
            onSelectWinner={onSelectWinner}
            roundIndex={2}
          />
        )}

        {/* Round 4 (Finals) */}
        {teamsInRound[3] && (
          <Round
            roundNumber={4}
            matches={getMatchesForRound(3)}
            onSelectWinner={onSelectWinner}
            isFinal
            roundIndex={3}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;
