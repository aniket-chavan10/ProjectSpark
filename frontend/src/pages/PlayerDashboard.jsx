import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="md:hidden fixed top-4 left-4 z-30 p-3 bg-gray-800 text-white rounded-lg shadow-lg"
        onClick={toggleSidebar}
      >
        ☰
      </motion.button>

      {/* Main Content */}
      <motion.div
        className={`flex-1 p-6 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        } md:ml-64`}
        style={{
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === "dashboard" && <Dashboard />}
            {activeSection === "profile" && <Profile />}
            {activeSection === "stats" && <Stats />}
            {activeSection === "leaderboards" && <Leaderboards />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default PlayerDashboard;