import React, { useEffect, useState } from 'react';
import jwt_decode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Sidebar from '../components/AdminDashboard/Sidebar';
import Dashboard from '../components/AdminDashboard/Dashboard';
import Profile from '../components/AdminDashboard/Profile';
import Alerts from '../components/AdminDashboard/Alerts';
import TeamResults from '../components/AdminDashboard/TeamResults';
import TeamRankings from '../components/AdminDashboard/TeamRankings';
import { teamNewsApi } from '../api/sparkApi';
import Invitation from '../components/AdminDashboard/Invitation';
import PlayersScreen from '../components/AdminDashboard/Team/PlayersScreen';
import SquadScreen from '../components/AdminDashboard/Team/SquadScreen';
import DesktopOnly from '../components/ui/DesktopOnly';

import OrganizerDashboard from '../components/AdminDashboard/Organizer/OrganizerFlow';
import ApplyTournament from '../components/AdminDashboard/ApplyTournament';
import AppliedTeams from '../components/AdminDashboard/ViewAppliedTeams'; // new

// What the team representative needs most on a phone, one tap away at the bottom of the screen.
const PHONE_TABS = [
  { id: 'dashboard', name: 'Home', icon: '🏠' },
  { id: 'players', name: 'Players', icon: '👥' },
  { id: 'squad', name: 'Squad', icon: '🏏' },
  { id: 'results', name: 'Results', icon: '📊' },
  { id: 'alerts', name: 'News', icon: '🔔' },
];

const TITLES = {
  dashboard: 'Dashboard',
  organize: 'Organize',
  apply: 'Apply',
  invitations: 'Invitations',
  profile: 'Profile',
  players: 'My Players',
  squad: 'My Squad',
  alerts: 'Notifications',
  results: 'Results',
  rankings: 'Rankings',
  appliedTeams: 'Applied teams',
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [unread, setUnread] = useState(0);
  const [openMatchId, setOpenMatchId] = useState(null);

  // the team comes from the login token; the bell shows how many notifications are new
  let teamId = null;
  try {
    teamId = Number(jwt_decode(localStorage.getItem('authToken')).team_id) || null;
  } catch {
    teamId = null;
  }
  useEffect(() => {
    let alive = true;
    const check = () => teamNewsApi.notifications({ limit: 1 }).then((d) => alive && setUnread(d.unread)).catch(() => {});
    check();
    const timer = setInterval(check, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const openMatch = (matchId) => {
    setOpenMatchId(matchId);
    setActiveSection('results');
  };

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
      if (window.innerWidth < 768 && isSidebarOpen) toggleSidebar();
    }
  };

  const desktopOnly = (what, node) => (
    <DesktopOnly what={what} alt={{ label: 'Go to My Squad', onClick: () => setActiveSection('squad') }}>
      {node}
    </DesktopOnly>
  );

  const sectionComponents = {
    dashboard: <Dashboard onOpenMatch={openMatch} goTo={setActiveSection} />,
    // scheduling and managing a tournament needs a big screen
    organize: desktopOnly(
      'Organizing a tournament',
      <OrganizerDashboard onViewTeams={(tid) => handleSectionClick('appliedTeams', { tournamentId: tid })} />
    ),
    apply: <ApplyTournament />,
    invitations: <Invitation />,
    profile: <Profile />,
    players: <PlayersScreen />,
    squad: <SquadScreen goToPlayers={() => setActiveSection('players')} />,
    alerts: <Alerts onOpenMatch={openMatch} onUnread={setUnread} goTo={setActiveSection} />,
    rankings: <TeamRankings teamId={teamId} />,
    results: <TeamResults teamId={teamId} openMatchId={openMatchId} clearOpen={() => setOpenMatchId(null)} />,
    appliedTeams: desktopOnly('Managing the teams of a tournament', <AppliedTeams tournamentId={selectedTournamentId} />),
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        activeSection={activeSection}
        handleSectionClick={handleSectionClick}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        unread={unread}
      />

      {/* phone: title bar with the menu button */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-3 md:hidden">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-lg text-white"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="truncate text-base font-bold text-slate-900">{TITLES[activeSection] || 'Dashboard'}</h1>
      </header>

      <motion.div
        className="min-w-0 flex-1 md:ml-64"
        style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-24 pt-[4.5rem] md:p-6"
          >
            {sectionComponents[activeSection]}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* phone: the main things one tap away */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid h-16 grid-cols-6 border-t border-slate-200 bg-white md:hidden" aria-label="Main">
        {PHONE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSectionClick(tab.id)}
            aria-current={activeSection === tab.id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              activeSection === tab.id ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <span className="relative text-xl leading-none" aria-hidden="true">
              {tab.icon}
              {tab.id === 'alerts' && unread > 0 && <span className="absolute -right-2 -top-1 min-w-[1.1rem] rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
            </span>
            {tab.name}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500"
        >
          <span className="text-xl leading-none" aria-hidden="true">☰</span>
          More
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
