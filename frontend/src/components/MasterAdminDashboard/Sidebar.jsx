import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const navigate = useNavigate();

  const sections = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'all-teams', name: 'Teams', icon: '👥' },
    { id: 'teamRequests', name: 'Team Requests', icon: '📨' },
    { id: 'rankings', name: 'Rankings & points', icon: '🏆' },
    { id: 'announcements', name: 'Announcements', icon: '📢' },
    { id: 'bans', name: 'Bans', icon: '⛔' },
    { id: 'tournamentManager', name: 'Tournaments', icon: '📅' },
    { id: 'managePlayers', name: 'Players', icon: '🏏' },
    { id: 'schedules', name: 'Schedules', icon: '🗓️' },
    { id: 'awards', name: 'Awards', icon: '🏅' },
    { id: 'sponsors', name: 'Sponsors', icon: '🤝' },
    { id: 'logout', name: 'Logout', icon: '🚪' },
  ];

  const handleLogout = () => {
    navigate('/'); // Redirect to home or login page
  };

  return (
    <div className="fixed z-20 top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white text-2xl font-bold tracking-wide"
        >
          Master Admin Dashboard
        </motion.h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {sections.map((section) => (
            <motion.li
              key={section.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * sections.indexOf(section) }}
              className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => {
                if (section.id === 'logout') {
                  handleLogout();
                } else {
                  setActiveSection(section.id);
                }
              }}
            >
              <span className="text-lg mr-3">{section.icon}</span>
              <span>{section.name}</span>
              <motion.div
                className="ml-auto opacity-0 group-hover:opacity-100"
                whileHover={{ scale: 1.1 }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.div>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-6 py-4 border-t border-gray-700 text-center mt-auto"
      >
        <p className="text-sm text-gray-400">© 2024 Your Company</p>
      </motion.div>
    </div>
  );
};

export default Sidebar;