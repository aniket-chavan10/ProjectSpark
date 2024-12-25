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
        console.log("API Response:", response); // Log the full API response
        if (response.data) {
          console.log("Data from API:", response.data); // Log data to see if it's valid
          const approvedTeams = response.data.filter(
            (team) => team.status === "approved"
          );
          console.log("Filtered Approved Teams:", approvedTeams); // Log approved teams
          setTeams(approvedTeams);
        } else {
          console.log("No data found in response");
        }
      } catch (err) {
        setError("Failed to fetch teams.");
        console.error("Error fetching teams:", err); // Log error details
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedTeams();
  }, []);

  if (loading) {
    return <p>Loading teams...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.length === 0 ? (
        <p className="text-center text-gray-600">No approved teams available.</p>
      ) : (
        teams.map((team) => (
          <div
            key={team.id}
            className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center transition-transform duration-300 transform hover:scale-105 hover:shadow-xl"
          >
            <div
              className="w-24 h-24 mb-4 rounded-full bg-gray-300 flex items-center justify-center"
              style={{ backgroundColor: "#4C51BF" }} // You can customize this background color
            >
              <span className="text-white text-xl font-bold ">{team.team_name[0]}</span> {/* Initials or some fallback */}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 uppercase">{team.team_name}</h3>
            <p className="text-gray-500">{team.village_name}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default AllTeams;
