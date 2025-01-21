import React, { useState } from 'react';

const matches = [
  {
    id: 1,
    team1: { name: "Team Alpha", logo: "https://picsum.photos/seed/team1/50" },
    team2: { name: "Team Beta", logo: "https://picsum.photos/seed/team2/50" },
    date: "2025-01-10",
    time: "18:00",
    isPast: true,
    winner: "Team Alpha",
    wonBy: "30 runs",
  },
  {
    id: 2,
    team1: { name: "Team Gamma", logo: "https://picsum.photos/seed/team3/50" },
    team2: { name: "Team Delta", logo: "https://picsum.photos/seed/team4/50" },
    date: "2025-01-11",
    time: "15:00",
    isPast: true,
    winner: "Team Gamma",
    wonBy: "5 wickets",
  },
  {
    id: 3,
    team1: { name: "Team Epsilon", logo: "https://picsum.photos/seed/team5/50" },
    team2: { name: "Team Zeta", logo: "https://picsum.photos/seed/team6/50" },
    date: "2025-01-12",
    time: "14:00",
    isPast: true,
    winner: "Team Epsilon",
    wonBy: "2 wickets",
  },
  {
    id: 4,
    team1: { name: "Team Eta", logo: "https://picsum.photos/seed/team7/50" },
    team2: { name: "Team Theta", logo: "https://picsum.photos/seed/team8/50" },
    date: "2025-01-13",
    time: "16:00",
    isPast: true,
    winner: "Team Eta",
    wonBy: "20 runs",
  },
  // Continue with the rest of the matches
  ...Array.from({ length: 27 }, (_, i) => ({
    id: i + 5,
    team1: { name: `Team ${String.fromCharCode(65 + (i % 26))}A`, logo: `https://picsum.photos/seed/team${i + 9}/50` },
    team2: { name: `Team ${String.fromCharCode(66 + (i % 26))}B`, logo: `https://picsum.photos/seed/team${i + 10}/50` },
    date: `2025-01-${14 + ((i + 1) % 11)}`,
    time: `${10 + (i % 12)}:00`,
    isPast: false,
    winner: null,
    wonBy: null,
  })),
];

const MatchCard = ({ match, onUpdate, onStart }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(match.date);
  const [editedTime, setEditedTime] = useState(match.time);

  const handleSave = () => {
    onUpdate(match.id, editedDate, editedTime);
    setIsEditing(false);
  };

  return (
    <div
      className={`shadow-md rounded-lg p-4 m-4 w-full transition-all duration-300 transform hover:scale-105 ${
        match.isPast
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-lg"
      }`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-300 to-blue-300 text-white font-bold mb-4">
        {match.id}
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <img
            src={match.team1.logo}
            alt={match.team1.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <p className="text-lg font-semibold text-gray-800">{match.team1.name}</p>
        </div>
        <span className="text-gray-500 text-sm">VS</span>
        <div className="flex items-center">
          <img
            src={match.team2.logo}
            alt={match.team2.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <p className="text-lg font-semibold text-gray-800">{match.team2.name}</p>
        </div>
      </div>
      {match.isPast ? (
        <div className="text-gray-700 text-sm">
          <p>
            <span className="font-semibold">Winner:</span> {match.winner}
          </p>
          <p>
            <span className="font-semibold">Won by:</span> {match.wonBy}
          </p>
          <div className="mt-4 flex justify-end">
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Match History
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="text-gray-700 text-sm">
          <div className="mb-2">
            <label className="font-semibold mr-2">Date:</label>
            <input
              type="date"
              value={editedDate}
              onChange={(e) => setEditedDate(e.target.value)}
              className="border rounded px-2 py-1 text-gray-800"
            />
          </div>
          <div>
            <label className="font-semibold mr-2">Time:</label>
            <input
              type="time"
              value={editedTime}
              onChange={(e) => setEditedTime(e.target.value)}
              className="border rounded px-2 py-1 text-gray-800"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-700 text-sm">
          <p>
            <span className="font-semibold">Date:</span> {match.date}
          </p>
          <p>
            <span className="font-semibold">Time:</span> {match.time}
          </p>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => onStart(match.id)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Start Match
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ShowMatchSequence = () => {
  const [matchesState, setMatchesState] = useState(matches);

  const handleUpdate = (id, date, time) => {
    setMatchesState((prevMatches) =>
      prevMatches.map((match) =>
        match.id === id ? { ...match, date, time } : match
      )
    );
  };

  const handleStart = (id) => {
    console.log(`Match ${id} started!`);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Match Results and Upcoming Matches</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Display past matches with results */}
        {matchesState.filter(match => match.isPast).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onUpdate={handleUpdate}
            onStart={handleStart}
          />
        ))}

        {/* Display upcoming matches */}
        {matchesState.filter(match => !match.isPast).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onUpdate={handleUpdate}
            onStart={handleStart}
          />
        ))}
      </div>
    </div>
  );
};

export default ShowMatchSequence;
