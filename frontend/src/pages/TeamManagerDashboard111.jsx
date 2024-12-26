import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TeamManagerDashboard = () => {
    const [players, setPlayers] = useState([]);
    const [playingXI, setPlayingXI] = useState([]);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [profilePhoto, setProfilePhoto] = useState('https://via.placeholder.com/150');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigate = useNavigate();

    // Sidebar sections
    const sections = [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'profile', name: 'Profile' },
        { id: 'playingXI', name: 'Manage Playing XI' },
        { id: 'addPlayer', name: 'Add New Player' },
        { id: 'alerts', name: 'Alerts' },
        { id: 'logout', name: 'Logout' },
    ];

    // Toggle sidebar for mobile view
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Handle profile photo upload
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProfilePhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Logout function
    const handleLogout = () => {
        navigate('/'); // Redirect to login/home page
    };

    // Function to handle when sidebar item is clicked
    const handleSectionClick = (sectionId) => {
        if (sectionId === 'logout') {
            handleLogout();
        } else {
            setActiveSection(sectionId);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div
                className={`fixed z-20 top-0 left-0 h-full w-64 bg-gray-800 shadow-lg transition-transform transform ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
                } md:relative md:translate-x-0`}
            >
                <div className="p-6 border-b border-gray-700 text-center">
                    <h1 className="text-white text-2xl font-bold tracking-wide">Admin Dashboard</h1>
                    <img
                        src={profilePhoto}
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
                                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 ${
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

            {/* Hamburger Button for Mobile */}
            <button
                className="md:hidden text-white bg-gray-800 p-4 rounded-lg absolute top-4 left-4 z-30"
                onClick={toggleSidebar}
            >
                ☰
            </button>

            {/* Main Content */}
            <div
                className={`flex-1 p-6 transition-all duration-300 ${
                    isSidebarOpen ? 'ml-64' : 'ml-0'
                }`}
            >
                {/* Dashboard Section */}
                {activeSection === 'dashboard' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h2 className="text-xl font-semibold">Welcome to the Team Manager Dashboard</h2>
                            <p className="mt-2">Manage your team, view the playing XI, and more!</p>
                        </div>
                    </div>
                )}

                {/* Profile Section */}
                {activeSection === 'profile' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Profile</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <img
                                src={profilePhoto}
                                alt="Profile"
                                className="w-24 h-24 rounded-full mb-4"
                            />
                            <input
                                type="file"
                                onChange={handlePhotoUpload}
                                className="block text-sm text-gray-600 mb-4"
                            />
                            <p className="mt-4">Name: Team Manager</p>
                            <p>Email: manager@example.com</p>
                        </div>
                    </div>
                )}

                {/* Manage Playing XI Section */}
                {activeSection === 'playingXI' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Manage Playing XI</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h2 className="text-xl font-semibold">Playing XI</h2>
                            <ul className="mt-2 space-y-2">
                                {playingXI.length > 0 ? (
                                    playingXI.map((player, index) => (
                                        <li key={index} className="flex justify-between items-center">
                                            <span>{player.name}</span>
                                            <button
                                                onClick={() => {
                                                    setPlayingXI(playingXI.filter((p) => p.name !== player.name));
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))
                                ) : (
                                    <p>No players selected for Playing XI.</p>
                                )}
                            </ul>
                            <button
                                onClick={() => setPlayingXI([...playingXI, { name: 'New Player' }])}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Add Player to Playing XI
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Player Section */}
                {activeSection === 'addPlayer' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Add New Player</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h2 className="text-xl font-semibold">Add New Player Form</h2>
                            {/* Add your player form here */}
                            <form>
                                <div>
                                    <label className="block text-sm">Player Name</label>
                                    <input type="text" className="w-full p-2 mt-2 border rounded" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm">Player Position</label>
                                    <input type="text" className="w-full p-2 mt-2 border rounded" />
                                </div>
                                <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                    Add Player
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Alerts Section */}
                {activeSection === 'alerts' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Alerts</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h2 className="text-xl font-semibold">Upcoming Matches</h2>
                            {/* Display alerts, messages, or notifications */}
                            <ul className="mt-2 space-y-2">
                                <li className="flex justify-between items-center">
                                    <span>Match 1: Team A vs Team B</span>
                                    <span className="text-gray-500">Date: 2024-12-28</span>
                                </li>
                                <li className="flex justify-between items-center">
                                    <span>Match 2: Team C vs Team D</span>
                                    <span className="text-gray-500">Date: 2024-12-30</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamManagerDashboard;
