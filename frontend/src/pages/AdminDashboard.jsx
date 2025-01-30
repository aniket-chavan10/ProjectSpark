import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/AdminDashboard/Sidebar';
import Dashboard from '../components/AdminDashboard/Dashboard';
import Profile from '../components/AdminDashboard/Profile';
import ManagePlayingXI from '../components/AdminDashboard/ManagePlayingXI';
import AddNewPlayer from '../components/AdminDashboard/AddNewPlayer';
import Alerts from '../components/AdminDashboard/Alerts';
import ViewPlayers from '../components/AdminDashboard/ViewPlayers';
import Organizer from '../components/AdminDashboard/Organizer';
import Invitation from '../components/AdminDashboard/Invitation';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    navigate('/'); // Redirect to login/home page
  };

  const handleSectionClick = (sectionId) => {
    if (sectionId === 'logout') {
      handleLogout();
    } else {
      setActiveSection(sectionId);
      if (window.innerWidth < 768) {
        toggleSidebar(); // Close sidebar on mobile after clicking a section
      }
    }
  };

  // Define the components to render based on activeSection
  const sectionComponents = {
    dashboard: <Dashboard />,
    organizer: <Organizer />,
    invitations: <Invitation />,
    profile: <Profile />,
    playingXI: <ManagePlayingXI />,
    addPlayer: <AddNewPlayer />,
    viewPlayers: <ViewPlayers />,
    alerts: <Alerts />,
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        handleSectionClick={handleSectionClick}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
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
        className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} md:ml-64`}
        style={{
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {sectionComponents[activeSection]}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;