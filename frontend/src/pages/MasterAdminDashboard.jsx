import React, { useState } from 'react';
import TeamRequests from "./TeamRequests"; // Import the TeamRequests component

const MasterAdminDashboard = () => {
    const [activeSection, setActiveSection] = useState('profile');
    const [teams, setTeams] = useState([
        { id: 1, name: 'Team A', status: 'Pending' },
        { id: 2, name: 'Team B', status: 'Accepted' },
        { id: 3, name: 'Team C', status: 'Rejected' },
    ]);
    const [teamRequests, setTeamRequests] = useState([
        { id: 1, teamName: 'Team D', requestDate: '2024-12-20' },
        { id: 2, teamName: 'Team E', requestDate: '2024-12-22' },
    ]);
    const [rankings, setRankings] = useState({
        current: {
            topTeams: ['Team A', 'Team B', 'Team C'],
            topBatsman: 'Player A',
            topBowler: 'Player B',
        },
        history: {
            2023: {
                topTeams: ['Team A', 'Team B', 'Team C'],
                topBatsman: 'Player C',
                topBowler: 'Player D',
            },
        },
    });
    const [deletedTeamsHistory, setDeletedTeamsHistory] = useState([
        { id: 1, teamName: 'Team F', deletedOn: '2024-12-18' },
        { id: 2, teamName: 'Team G', deletedOn: '2024-12-19' },
    ]);
    const [selectedYear, setSelectedYear] = useState(2024);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleAcceptRequest = (teamId) => {
        const teamRequest = teamRequests.find((request) => request.id === teamId);
        const updatedRequests = teamRequests.filter((request) => request.id !== teamId);
        setTeamRequests(updatedRequests);

        setTeams([
            ...teams,
            { id: teams.length + 1, name: teamRequest.teamName, status: 'Accepted' },
        ]);
    };

    const handleRejectRequest = (teamId) => {
        setTeamRequests(teamRequests.filter((request) => request.id !== teamId));
    };

    const handleDeleteTeam = (teamId) => {
        setTeams(teams.filter((team) => team.id !== teamId));
        const deletedTeam = teams.find((team) => team.id === teamId);
        setDeletedTeamsHistory([
            ...deletedTeamsHistory,
            { id: deletedTeamsHistory.length + 1, teamName: deletedTeam.name, deletedOn: new Date().toLocaleDateString() },
        ]);
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`w-64 bg-gray-800 text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'transform-none' : 'transform -translate-x-full'} md:transform-none md:block`}>
                <div className="p-6 text-center border-b border-gray-700">
                    <h1 className="font-bold text-xl">Master Admin</h1>
                </div>
                <nav className="flex-1 p-4">
                    <ul>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'profile' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('profile')}
                        >
                            Profile
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'teams' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('teams')}
                        >
                            Teams
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'teamRequests' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('teamRequests')}
                        >
                            Team Requests
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'rankings' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('rankings')}
                        >
                            Rankings
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'managePlayers' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('managePlayers')}
                        >
                            Manage Players
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer`}
                            onClick={() => setActiveSection('logout')}
                        >
                            Logout
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Hamburger Icon */}
            <button
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 bg-gray-800 text-white p-2 rounded"
            >
                ☰
            </button>

            {/* Main Content */}
            <div className="flex-1 p-6">
                {activeSection === 'profile' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Profile</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <p>Name: Master Admin</p>
                            <p>Email: admin@example.com</p>
                            <p>Phone: +123456789</p>
                        </div>
                    </div>
                )}

                {activeSection === 'teams' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Teams</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teams.map((team) => (
                                <div key={team.id} className="bg-white p-4 rounded-lg shadow">
                                    <h2 className="text-lg font-bold">{team.name}</h2>
                                    <p>Status: {team.status}</p>
                                    {team.status === 'Accepted' && (
                                        <button
                                            onClick={() => handleDeleteTeam(team.id)}
                                            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
                                        >
                                            Delete Team
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'teamRequests' && (
                    <TeamRequests
                        teamRequests={teamRequests}
                        onAccept={handleAcceptRequest}
                        onReject={handleRejectRequest}
                    />
                )}

                {activeSection === 'rankings' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Rankings</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div>
                                <label htmlFor="year" className="mr-2">
                                    Select Year:
                                </label>
                                <select
                                    id="year"
                                    className="p-2 border rounded"
                                    value={selectedYear}
                                    onChange={(e) => handleYearChange(Number(e.target.value))}
                                >
                                    <option value={2024}>2024</option>
                                    <option value={2023}>2023</option>
                                </select>
                            </div>
                            <div className="mt-6">
                                <h2 className="text-xl font-bold">Top Teams</h2>
                                <ul>
                                    {rankings[selectedYear].topTeams.map((team, index) => (
                                        <li key={index}>{team}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-6">
                                <h2 className="text-xl font-bold">Top Batsman</h2>
                                <p>{rankings[selectedYear].topBatsman}</p>
                            </div>
                            <div className="mt-6">
                                <h2 className="text-xl font-bold">Top Bowler</h2>
                                <p>{rankings[selectedYear].topBowler}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'managePlayers' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Manage Players</h1>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <p>Manage players feature is coming soon!</p>
                        </div>
                    </div>
                )}

                {activeSection === 'logout' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Logged Out</h1>
                        <p>You have been logged out successfully.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterAdminDashboard;
