import React from 'react';

const Sidebar = ({ sections, activeSection, handleSectionClick, toggleSidebar, isSidebarOpen }) => {
    return (
        <div
            className={`fixed z-20 top-0 left-0 h-full w-64 bg-gray-800 shadow-lg transition-transform transform ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
            } md:relative md:translate-x-0`}
        >
            <div className="p-6 border-b border-gray-700 text-center">
                <h1 className="text-white text-2xl font-bold tracking-wide">Admin Dashboard</h1>
                <img
                    src="https://via.placeholder.com/150"
                    alt="Admin Profile"
                    className="w-16 h-16 rounded-full mx-auto mt-4"
                />
                <p className="text-gray-400 mt-2">Admin</p>
            </div>
            <nav className="px-4 py-6">
                <ul className="space-y-3">
                    {sections.map((section) => (
                        <li
                            key={section.id}
                            className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer ${
                                activeSection === section.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            onClick={() => handleSectionClick(section.id)}
                        >
                            {section.name}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="px-6 py-4 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-400">© 2024 Team Manager</p>
            </div>
        </div>
    );
};

export default Sidebar;
