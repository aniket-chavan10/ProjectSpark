import React, { useState, useEffect } from "react";
import adminApi from "../../api/adminApi";

const ViewPlayers = () => {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  // Fetch players by team
  useEffect(() => {
    const fetchPlayersByTeam = async () => {
      try {
        const response = await adminApi.getPlayersByTeam();
        console.log("Fetched players for team:", response);
        setPlayers(response); // Assuming `getPlayersByTeam` returns an array of players
      } catch (error) {
        console.error("Error fetching players by team:", error);
        setError("Failed to fetch players. Please try again later.");
      }
    };

    fetchPlayersByTeam();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Team Players</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Players List (Card Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {players.length > 0 ? (
          players.map((player) => (
            <div
              key={player.player_id}
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <div className="flex justify-center mb-4">
                {/* Profile Picture */}
                {player.profile_picture ? (
                  <img
                    src={`http://localhost:3000/${player.profile_picture}`}
                    alt={`${player.full_name}'s profile`}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      No Image
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                {player.full_name}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {player.email}
              </p>
              <p className="text-sm text-gray-600 text-center">
                {player.mobile_number}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No players found for your team.</p>
        )}
      </div>
    </div>
  );
};

export default ViewPlayers;
