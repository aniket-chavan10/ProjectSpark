import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/AdminDashboard/Sidebar';
import Dashboard from '../components/AdminDashboard/Dashboard';
import Profile from '../components/AdminDashboard/Profile';
import ManagePlayingXI from '../components/AdminDashboard/ManagePlayingXI';
import AddNewPlayer from '../components/AdminDashboard/AddNewPlayer';
import Alerts from '../components/AdminDashboard/Alerts';
import ViewPlayers from '../components/AdminDashboard/ViewPlayers';
import Organizer from '../components/AdminDashboard/Organizer';  // Import the new Organizer component

const AdminDashboard = () => {
    const [players, setPlayers] = useState([]);
    const [playingXI, setPlayingXI] = useState([]);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [profilePhoto, setProfilePhoto] = useState('https://via.placeholder.com/150');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigate = useNavigate();

    // Sidebar sections
    const sections = [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'organizer', name: 'Organizer' },  // Added the Organizer section
        { id: 'profile', name: 'Profile' },
        { id: 'playingXI', name: 'Manage Playing XI' },
        { id: 'addPlayer', name: 'Add New Player' },
        { id: 'viewPlayers', name: 'View Players' },
        { id: 'alerts', name: 'Alerts' },
        { id: 'logout', name: 'Logout' },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        navigate('/'); // Redirect to login/home page
    };

    const handleSectionClick = (sectionId) => {
        if (sectionId === 'logout') {
            handleLogout();
        } else {
            setActiveSection(sectionId);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar
                sections={sections}
                activeSection={activeSection}
                handleSectionClick={handleSectionClick}
                toggleSidebar={toggleSidebar}
                isSidebarOpen={isSidebarOpen}
            />

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
                {activeSection === 'dashboard' && <Dashboard />}
                {activeSection === 'organizer' && <Organizer />} {/* Render the Organizer component */}
                {activeSection === 'profile' && <Profile profilePhoto={profilePhoto} setProfilePhoto={setProfilePhoto} />}
                {activeSection === 'playingXI' && <ManagePlayingXI />}
                {activeSection === 'addPlayer' && <AddNewPlayer />}
                {activeSection === 'viewPlayers' && <ViewPlayers />}
                {activeSection === 'alerts' && <Alerts />}
            </div>
        </div>
    );
};

export default AdminDashboard;
