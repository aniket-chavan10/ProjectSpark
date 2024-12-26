import React from 'react';

const Sidebar = ({ activeSection, setActiveSection, isSidebarOpen, toggleSidebar, handleLogout }) => {
    const sections = [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'profile', name: 'Profile' },
        { id: 'stats', name: 'Stats' },
        { id: 'leaderboards', name: 'Leaderboards' },
        { id: 'logout', name: 'Logout' },
    ];

    return (
        <div
            className={`fixed z-20 top-0 left-0 h-screen w-64 bg-gray-800 shadow-lg transition-transform transform ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
            } md:relative md:translate-x-0`}
        >
            <div className="p-6 border-b border-gray-700 text-center">
                <h1 className="text-white text-2xl font-bold tracking-wide">Player Dashboard</h1>
            </div>
            <nav className="px-4 py-6">
                <ul className="space-y-3">
                    {sections.map((section) => (
                        <li
                            key={section.id}
                            className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer  ${
                                activeSection === section.id
                                    ? 'bg-blue-600 text-white'
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
                            {section.name}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="px-6 py-4 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-400">© 2024 Player Dashboard</p>
            </div>
        </div>
    );
};

export default Sidebar;
