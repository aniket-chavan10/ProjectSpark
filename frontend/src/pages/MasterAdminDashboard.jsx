import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/MasterAdminDashboard/Sidebar';
import TeamRequests from '../components/MasterAdminDashboard/TeamRequests';
import AllTeams from '../components/MasterAdminDashboard/AllTeams';
import TournamentScheduler from '../components/MasterAdminDashboard/TournamentScheduler';
import Announcements from '../components/MasterAdminDashboard/Announcements';
import Bans from '../components/MasterAdminDashboard/Bans';
import RankingPoints from '../components/MasterAdminDashboard/RankingPoints';
import AwardsAdmin from '../components/MasterAdminDashboard/AwardsAdmin';
import SponsorsAdmin from '../components/MasterAdminDashboard/SponsorsAdmin';
import AssociationTeams from '../components/MasterAdminDashboard/AssociationTeams';
import AssociationPlayers from '../components/MasterAdminDashboard/AssociationPlayers';
import AssociationSchedules from '../components/MasterAdminDashboard/AssociationSchedules';

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
            {activeSection === 'all-teams' && <AssociationTeams goTo={setActiveSection} />}
            {activeSection === 'rankings' && <RankingPoints />}
            {activeSection === 'announcements' && <Announcements />}
            {activeSection === 'bans' && <Bans />}
            {activeSection === 'tournamentManager' && <TournamentScheduler />}
            {activeSection === 'managePlayers' && <AssociationPlayers goTo={setActiveSection} />}
            {activeSection === 'schedules' && <AssociationSchedules />}
            {activeSection === 'awards' && <AwardsAdmin />}
            {activeSection === 'sponsors' && <SponsorsAdmin />}
            {activeSection === 'logout' && <div>You have logged out.</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;