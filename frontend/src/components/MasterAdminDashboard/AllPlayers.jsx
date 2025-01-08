import React, { useEffect, useState } from "react";
import playersApi from "../../api/playerApi";

function AllPlayers() {
  const [players, setPlayers] = useState([]); // Assuming an array of players
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const response = await playersApi.getAllPlayers(); // Using getAllPlayers method
        setPlayers(response.data || []);
        setLoading(false);
      } catch (err) {
        setError("Error fetching players.");
        console.error(err);
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="p-4">
      {loading ? (
        <h2>Loading players...</h2>
      ) : error ? (
        <h2>{error}</h2>
      ) : (
        <div>
          <h1 className="text-lg font-bold mb-4">All Players</h1>
          <table className="table-auto w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2 border border-gray-300">Name</th>
                <th className="px-4 py-2 border border-gray-300">Team</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border border-gray-300">{player.full_name}</td>
                  <td className="px-4 py-2 border border-gray-300">{player.team_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AllPlayers;
