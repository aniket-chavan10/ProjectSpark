import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Sidebar from '../components/AdminDashboard/Sidebar';
import Dashboard from '../components/AdminDashboard/Dashboard';
import Profile from '../components/AdminDashboard/Profile';
import ManagePlayingXI from '../components/AdminDashboard/ManagePlayingXI';
import AddNewPlayer from '../components/AdminDashboard/AddNewPlayer';
import Alerts from '../components/AdminDashboard/Alerts';
import ViewPlayers from '../components/AdminDashboard/ViewPlayers';
import Invitation from '../components/AdminDashboard/Invitation';

import OrganizerDashboard from '../components/AdminDashboard/Organizer/OrganizerFlow';
import ApplyTournament from '../components/AdminDashboard/ApplyTournament';
import AppliedTeams from '../components/AdminDashboard/ViewAppliedTeams'; // new

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleLogout = () => navigate('/');

  const handleSectionClick = (sectionId, extraData) => {
    if (sectionId === 'logout') {
      handleLogout();
    } else {
      if (sectionId === 'appliedTeams' && extraData?.tournamentId) {
        setSelectedTournamentId(extraData.tournamentId);
      }
      setActiveSection(sectionId);
      if (window.innerWidth < 768) toggleSidebar();
    }
  };

  const sectionComponents = {
    dashboard: <Dashboard />,
    organize: (
      <OrganizerDashboard
        onViewTeams={(tid) =>
          handleSectionClick('appliedTeams', { tournamentId: tid })
        }
      />
    ),
    apply: <ApplyTournament />,
    invitations: <Invitation />,
    profile: <Profile />,
    playingXI: <ManagePlayingXI />,
    addPlayer: <AddNewPlayer />,
    viewPlayers: <ViewPlayers />,
    alerts: <Alerts />,
    appliedTeams: <AppliedTeams tournamentId={selectedTournamentId} />,
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        activeSection={activeSection}
        handleSectionClick={handleSectionClick}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="md:hidden fixed top-4 left-4 z-30 p-3 bg-gray-800 text-white rounded-lg shadow-lg"
        onClick={toggleSidebar}
      >
        ☰
      </motion.button>

      <motion.div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        } md:ml-64`}
        style={{ height: '100vh', overflowY: 'auto' }}
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
