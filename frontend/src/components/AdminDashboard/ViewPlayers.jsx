import React, { useState, useEffect } from "react";
import playerApi from "../../api/playerApi";

const ViewPlayers = () => {
  const [players, setPlayers] = useState([]);

  // Fetch players from API
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await playerApi.getAllPlayers();
        console.log("Fetched players:", response.data);
        setPlayers(response.data); // Assuming API returns an array
      } catch (error) {
        console.error("Error fetching players:", error);
        alert("Failed to fetch players. Please try again later.");
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-6 overflow-x-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">All Players</h2>
      {players.length > 0 ? (
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-sm">
              <th className="px-4 py-2 text-gray-800">#</th>
              <th className="px-4 py-2 text-gray-800">Full Name</th>
              <th className="px-4 py-2 text-gray-800">Mobile Number</th>
              <th className="px-4 py-2 text-gray-800">Email</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr
                key={player.id}
                className={`border-b ${
                  index % 2 === 0 ? "bg-gray-100" : "bg-white"
                }`}
              >
                <td className="px-4 py-2 text-center">{index + 1}</td>
                <td className="px-4 py-2">{player.full_name}</td>
                <td className="px-4 py-2">{player.mobile_number}</td>
                <td className="px-4 py-2">{player.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">No players found.</p>
      )}
    </div>
  );
};

export default ViewPlayers;
