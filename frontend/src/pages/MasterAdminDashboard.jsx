import React, { useState } from "react";
import TeamRequests from "../components/MasterAdminDashboard/TeamRequests";
import Sidebar from "../components/MasterAdminDashboard/Sidebar";
import AllTeams from "../components/MasterAdminDashboard/AllTeams";

const MasterAdminDashboard = () => {
  const [activeSection, setActiveSection] = useState(""); // Manage the active section state

  const handleUpdateStatus = (id, status) => {
    setTeamRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === id ? { ...request, status } : request
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar to switch sections */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeSection === "teamRequests" && <TeamRequests />}
        {/* Add other sections when active */}
        {activeSection === "profile" && <div>Profile Section</div>}
        {activeSection === "all-teams" && <AllTeams />}
        {activeSection === "rankings" && <div>Rankings Section</div>}
        {activeSection === "managePlayers" && <div>Manage Players Section</div>}
        {activeSection === "logout" && <div>You have logged out.</div>}
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
