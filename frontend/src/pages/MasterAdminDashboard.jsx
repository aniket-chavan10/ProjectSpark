import React, { useState } from "react";
import TeamRequests from "../components/MasterAdminDashboard/TeamRequests";
import Sidebar from "../components/MasterAdminDashboard/Sidebar";
import AllTeams from "../components/MasterAdminDashboard/AllTeams";
import OrganizeTournament from "../components/MasterAdminDashboard/OrganizeTournament";
import AllPlayers from '../components/MasterAdminDashboard/AllPlayers'
const MasterAdminDashboard = () => {
  const [activeSection, setActiveSection] = useState(""); // Manage the active section state

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
        {activeSection === "profile" && <div>Profile Section</div>}
        {activeSection === "all-teams" && <AllTeams />}
        {activeSection === "rankings" && <div>Rankings Section</div>}
        {activeSection === "tournamentManager" && <OrganizeTournament />} 
        {activeSection === "managePlayers" && <AllPlayers/>}
        {activeSection === "logout" && <div>You have logged out.</div>}
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
