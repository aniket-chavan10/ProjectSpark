import React, { useEffect, useState } from "react";
import masterAdminApi from "../../api/masterAdminApi";

const AllTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApprovedTeams = async () => {
      setLoading(true);
      try {
        const response = await masterAdminApi.getAllVillages();
        if (response.data) {
          const approvedTeams = response.data.filter(
            (team) => team.status === "approved"
          );
          setTeams(approvedTeams);
        }
      } catch (err) {
        setError("Failed to fetch teams.");
        console.error("Error fetching teams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedTeams();
  }, []);

  if (loading) {
    return <p className="text-gray-600 text-center">Loading teams...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Approved Teams
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.length === 0 ? (
          <p className="text-center text-gray-600 col-span-full">
            No approved teams available.
          </p>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center transition-transform duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <div
                className="w-24 h-24 mb-4 rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: "#4C51BF" }}
              >
                {team.team_name[0].toUpperCase()}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 uppercase text-center mb-2">
                {team.team_name}
              </h3>
              <p className="text-gray-500 text-center">{team.village_name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllTeams;
