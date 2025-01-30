import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = ({
  activeSection,
  setActiveSection,
  isSidebarOpen,
  toggleSidebar,
  handleLogout,
}) => {
  const sections = [
    { id: "dashboard", name: "Dashboard", icon: "🏠" },
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "stats", name: "Stats", icon: "📊" },
    { id: "leaderboards", name: "Leaderboards", icon: "🏆" },
    { id: "logout", name: "Logout", icon: "🚪" },
  ];

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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed z-20 top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl`}
        style={{ overflowY: "auto" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-2xl font-bold tracking-wide"
          >
            Player Dashboard
          </motion.h1>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6">
          <ul className="space-y-2">
            {sections.map((section) => (
              <motion.li
                key={section.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * sections.indexOf(section) }}
                className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                  activeSection === section.id
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
                onClick={() => {
                  if (section.id === "logout") {
                    handleLogout();
                  } else {
                    setActiveSection(section.id);
                    if (window.innerWidth < 768) {
                      toggleSidebar(); // Close sidebar on mobile after clicking a section
                    }
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
      </motion.div>
    </>
  );
};

export default Sidebar;