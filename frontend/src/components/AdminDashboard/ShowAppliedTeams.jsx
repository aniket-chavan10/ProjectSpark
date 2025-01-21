import React, { useState, useEffect } from "react";
import GroupTeams from "./GroupTeams";
import adminApi from "../../api/adminApi"; // Adjust the path according to your file structure

const ShowAppliedTeams = ({ tournamentId }) => {
  const [teams, setTeams] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showGrouping, setShowGrouping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppliedTeams = async () => {
      try {
        const fetchedTeams = await adminApi.getAppliedTeams(tournamentId); // Call the API method from adminApi
        setTeams(fetchedTeams); // Set teams from the API response
        setLoading(false);
      } catch (err) {
        console.error("Error fetching applied teams:", err);
        setError("Failed to fetch applied teams.");
        setLoading(false);
      }
    };

    fetchAppliedTeams();
  }, [tournamentId]);

  const handleEdit = (index) => {
    setEditIndex(index);
    setIsEditing(true);
    setSearchQuery("");
  };

  const handleSave = (newTeamName) => {
    const updatedTeams = [...teams];
    updatedTeams[editIndex].team_name = newTeamName;
    setTeams(updatedTeams);
    setIsEditing(false);
    setEditIndex(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditIndex(null);
  };

  const filteredTeams = teams.filter((team) =>
    team.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveTeams = () => {
    if (teams.length === 32) {
      setIsSaved(true);
      console.log("Saved Teams:", teams);
    } else {
      alert("You must have exactly 32 teams assigned before saving.");
    }
  };

  const handleProceedToGrouping = () => {
    if (isSaved) {
      setShowGrouping("group");
    } else {
      alert("Please save the teams before proceeding to the next step.");
    }
  };

  if (showGrouping === "group") {
    return <GroupTeams savedTeams={teams} />;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 min-h-screen">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-8 text-center">
        Manage Your Teams
      </h1>

      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg px-8 py-4 shadow-md flex items-center">
          <span className="text-xl font-semibold">
            {teams.length} / 32 Teams Applied
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team, index) => (
          <div
            key={index}
            className="p-6 bg-gradient-to-b from-white via-gray-100 to-gray-200 rounded-lg shadow-md flex justify-between items-center hover:shadow-lg transition-all"
          >
            <div className="flex items-center space-x-4">
              <img
                src={team.logo}
                alt={team.team_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-gray-800">
                {team.team_name}
              </span>
            </div>
            <button
              onClick={() => handleEdit(index)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-md hover:from-blue-500 hover:to-blue-700 transition-all"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center space-y-6">
        <button
          onClick={handleSaveTeams}
          className={`px-8 py-4 rounded-lg shadow-md text-white text-xl font-semibold transition-all ${
            teams.length !== 32
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700"
          }`}
          disabled={teams.length !== 32}
        >
          Save Teams
        </button>

        <button
          onClick={handleProceedToGrouping}
          className={`px-8 py-4 rounded-lg shadow-md text-white text-xl font-semibold transition-all ${
            isSaved
              ? "bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!isSaved}
        >
          Proceed to Grouping
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-1/3">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              Edit Team Name
            </h2>
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {filteredTeams.map((team, index) => (
                <div
                  key={index}
                  onClick={() => handleSave(team.team_name)}
                  className="p-3 hover:bg-blue-100 cursor-pointer text-gray-700"
                >
                  {team.team_name}
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowAppliedTeams;
