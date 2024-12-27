import React, { useState } from "react";
import UpcomingTournaments from "../Tournaments/UpcomingTournaments";
import RecentTournaments from "../Tournaments/RecentTournaments";
import OrganizeTournament from "../Tournaments/OrganizeTournament";

const TournamentManager = () => {
  // Static data for villages
  const staticVillages = [
    { id: 1, name: "Village A" },
    { id: 2, name: "Village B" },
    { id: 3, name: "Village C" },
  ];

  // Static data for upcoming and recent tournaments
  const staticUpcomingTournaments = [
    { id: 1, village_name: "Village A", date: "2024-12-30" },
    { id: 2, village_name: "Village B", date: "2024-12-31" },
  ];
  const staticRecentTournaments = [
    { id: 1, village_name: "Village C", date: "2024-12-25" },
    { id: 2, village_name: "Village B", date: "2024-12-20" },
  ];

  const [activeTab, setActiveTab] = useState("upcoming"); // Tab state: upcoming, recent, organize

  const handleScheduleTournament = (village, date) => {
    alert(`Tournament scheduled successfully for ${village} on ${date}`);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (Ensure it remains visible) */}
      <div className="w-1/4 bg-gray-200 p-4">
        <h2 className="text-2xl font-semibold">Tournament Manager</h2>
        <ul>
          <li className="mt-4">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`w-full p-2 text-left text-gray-700 ${
                activeTab === "upcoming" ? "bg-blue-500 text-white" : "hover:bg-gray-300"
              }`}
            >
              Upcoming Tournaments
            </button>
          </li>
          <li className="mt-4">
            <button
              onClick={() => setActiveTab("recent")}
              className={`w-full p-2 text-left text-gray-700 ${
                activeTab === "recent" ? "bg-blue-500 text-white" : "hover:bg-gray-300"
              }`}
            >
              Recent Tournaments
            </button>
          </li>
          <li className="mt-4">
            <button
              onClick={() => setActiveTab("organize")}
              className={`w-full p-2 text-left text-gray-700 ${
                activeTab === "organize" ? "bg-blue-500 text-white" : "hover:bg-gray-300"
              }`}
            >
              Organize Tournament
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-100">
        {/* Render the active tab's component */}
        {activeTab === "upcoming" && (
          <UpcomingTournaments tournaments={staticUpcomingTournaments} />
        )}
        {activeTab === "recent" && (
          <RecentTournaments tournaments={staticRecentTournaments} />
        )}
        {activeTab === "organize" && (
          <OrganizeTournament
            villages={staticVillages}
            onScheduleTournament={handleScheduleTournament}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentManager;
