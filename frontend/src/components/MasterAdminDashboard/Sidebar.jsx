import React from 'react';
import { useNavigate } from 'react-router-dom'; // For page navigation

const Sidebar = ({ activeSection, setActiveSection }) => {
    const navigate = useNavigate(); // To redirect to the home page

    const sections = [
        { id: 'profile', name: 'Profile' },
        { id: 'all-teams', name: 'Teams' },
        { id: 'teamRequests', name: 'Team Requests' },
        { id: 'rankings', name: 'Rankings' },
        { id: 'tournamentManager', name: 'Tournaments' }, // Ensure correct ID here
        { id: 'managePlayers', name: 'Manage Players' },
        { id: 'logout', name: 'Logout' },
    ];

    // Function to handle logout
    const handleLogout = () => {
        navigate('/'); // Redirect to home or login page
    };

    return (
        <div className="w-64 bg-gray-800 min-h-screen flex flex-col">
            <div className="p-6 border-b border-gray-700 text-center">
                <h1 className="text-white text-2xl font-bold tracking-wide">Master Admin Dashboard</h1>
            </div>
            <nav className="flex-1 px-4 py-6">
                <ul className="space-y-3">
                    {sections.map((section) => (
                        <li
                            key={section.id}
                            className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer ${
                                activeSection === section.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            onClick={() => {
                                if (section.id === 'logout') {
                                    handleLogout();
                                } else {
                                    setActiveSection(section.id); // Set the correct section id
                                }
                            }}
                        >
                            {section.name}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="px-6 py-4 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-400">© 2024 Your Company</p>
            </div>
        </div>
    );
};

export default Sidebar;
