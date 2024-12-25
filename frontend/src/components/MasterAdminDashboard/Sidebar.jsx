import React from 'react';
import { useNavigate } from 'react-router-dom';  // For page navigation

const Sidebar = ({ activeSection, setActiveSection }) => {
    const navigate = useNavigate();  // To redirect to the home page

    const sections = [
        { id: 'profile', name: 'Profile' },
        { id: 'all-teams', name: 'Teams' },
        { id: 'teamRequests', name: 'Team Requests' },
        { id: 'rankings', name: 'Rankings' },
        { id: 'managePlayers', name: 'Manage Players' },
        { id: 'logout', name: 'Logout' },
    ];

    // Function to handle logout
    const handleLogout = () => {
        // Redirect to the home page (or login page)
        navigate('/');  // '/' can be changed to your desired home or login page route
    };

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col">
            <div className="p-6 text-center border-b border-gray-700">
                <h1 className="font-bold text-xl">Master Admin</h1>
            </div>
            <nav className="flex-1 p-4">
                <ul>
                    {sections.map((section) => (
                        <li
                            key={section.id}
                            className={`py-3 px-4 rounded-lg mb-2 cursor-pointer transition-colors duration-200 ${
                                activeSection === section.id
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-300 hover:bg-gray-600 hover:text-white'
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
        </div>
    );
};

export default Sidebar;
