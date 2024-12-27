import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/PlayerDashboard/Sidebar";
import Dashboard from "../components/PlayerDashboard/Dashboard";
import Profile from "../components/PlayerDashboard/Profile";
import Stats from "../components/PlayerDashboard/Stats";
import Leaderboards from "../components/PlayerDashboard/Leaderboards";

const PlayerDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle logout
  const handleLogout = () => {
    // Remove token and role from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");

    // Redirect to the login page
    navigate("/sign-in");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleLogout={handleLogout}
      />

      {/* Hamburger Button for Mobile */}
      <button
        className="md:hidden text-white bg-gray-800 p-4 rounded-lg absolute top-4 left-4 z-30"
        onClick={toggleSidebar}
      >
        ☰
      </button>

      {/* Main Content */}
      <div
        className={`flex-1 p-6 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {activeSection === "dashboard" && <Dashboard />}
        {activeSection === "profile" && <Profile />}
        {activeSection === "stats" && <Stats />}
        {activeSection === "leaderboards" && <Leaderboards />}
      </div>
    </div>
  );
};

export default PlayerDashboard;
