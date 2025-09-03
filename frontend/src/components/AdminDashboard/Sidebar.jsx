import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({
  activeSection,
  handleSectionClick,
  toggleSidebar,
  isSidebarOpen,
}) => {
  const sections = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },

    // Tournament parent menu with submenus
    {
      id: 'tournament',
      name: 'Tournament',
      icon: '🏆',
      children: [
        { id: 'organize', name: 'Organize', icon: '📅' },
        { id: 'apply', name: 'Apply', icon: '📝' }
      ]
    },

    { id: 'invitations', name: 'Invitation', icon: '✉️' },
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'playingXI', name: 'Manage Playing XI', icon: '🏏' },
    { id: 'addPlayer', name: 'Add New Player', icon: '➕' },
    { id: 'viewPlayers', name: 'View Players', icon: '👥' },
    { id: 'alerts', name: 'Alerts', icon: '🔔' },
    { id: 'logout', name: 'Logout', icon: '🚪' },
  ];

  const [openMenu, setOpenMenu] = React.useState(null); // for expanding/collapsing menus

  const handleMenuToggle = (sectionId) => {
    setOpenMenu(openMenu === sectionId ? null : sectionId);
  };

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-10 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -256 }}
        animate={{ x: isSidebarOpen || window.innerWidth >= 768 ? 0 : -256 }}
        exit={{ x: -256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed z-20 top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl"
        style={{ overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-2xl font-bold tracking-wide"
          >
            Admin Dashboard
          </motion.h1>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6">
          <ul className="space-y-2">
            {sections.map((section) => {
              if (section.children) {
                // Parent menu (Tournament)
                return (
                  <li key={section.id}>
                    <div
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 transition-all`}
                      onClick={() => handleMenuToggle(section.id)}
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{section.icon}</span>
                        <span>{section.name}</span>
                      </div>
                      <span>{openMenu === section.id ? "▲" : "▼"}</span>
                    </div>

                    {/* Submenu items */}
                    {openMenu === section.id && (
                      <ul className="ml-10 mt-2 space-y-2">
                        {section.children.map((child) => (
                          <li
                            key={child.id}
                            onClick={() => handleSectionClick(child.id)}
                            className={`flex items-center px-4 py-2 rounded-lg cursor-pointer text-sm transition-all duration-300 ${
                              activeSection === child.id
                                ? "bg-blue-600 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            <span className="mr-2">{child.icon}</span>
                            {child.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // Normal flat menu items
              return (
                <li
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${
                    activeSection === section.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span className="text-lg mr-3">{section.icon}</span>
                  <span>{section.name}</span>
                </li>
              );
            })}
          </ul>
        </nav>
      </motion.div>
    </>
  );
};

export default Sidebar;