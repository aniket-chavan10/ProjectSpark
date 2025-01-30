import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/MasterAdminDashboard/Sidebar';
import TeamRequests from '../components/MasterAdminDashboard/TeamRequests';
import AllTeams from '../components/MasterAdminDashboard/AllTeams';
import OrganizeTournament from '../components/MasterAdminDashboard/OrganizeTournament';

const MasterAdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('profile'); // Default to 'profile'

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Main Content */}
      <div className="flex-1 p-6 ml-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'teamRequests' && <TeamRequests />}
            {activeSection === 'profile' && <div>Profile Section</div>}
            {activeSection === 'all-teams' && <AllTeams />}
            {activeSection === 'rankings' && <div>Rankings Section</div>}
            {activeSection === 'tournamentManager' && <OrganizeTournament />}
            {activeSection === 'managePlayers' && <div>Manage Players Section</div>}
            {activeSection === 'logout' && <div>You have logged out.</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;