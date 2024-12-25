import React, { useState } from 'react';

const TeamManagerDashboard = () => {
    const [players, setPlayers] = useState([]);
    const [playingXI, setPlayingXI] = useState([]);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [newPlayer, setNewPlayer] = useState({ name: '', age: '', battingStyle: '', bowlingStyle: '', password: '', profilePicture: null });
    const [profilePhoto, setProfilePhoto] = useState('https://via.placeholder.com/150');
    const [paymentStatus, setPaymentStatus] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);  // For responsive sidebar toggle
    const [alerts, setAlerts] = useState([
        { id: 1, message: 'Player John Doe added to Playing XI!' },
        { id: 2, message: 'Player Jane Doe added to Playing XI!' },
    ]);
    const [youtubeLinks, setYoutubeLinks] = useState([
        'https://www.youtube.com/embed/dQw4w9WgXcQ',  // Replace with actual YouTube video URLs
        'https://www.youtube.com/embed/3JZ_D3ELwOQ',
    ]);

    const handleAddPlayer = (e) => {
        e.preventDefault();
        if (newPlayer.name && newPlayer.age && newPlayer.battingStyle && newPlayer.bowlingStyle && paymentStatus) {
            const playerData = {
                ...newPlayer,
                id: players.length + 1,
                age: parseInt(newPlayer.age, 10),
                password: `player${players.length + 1}@123`, // Default password
            };
            setPlayers([...players, playerData]);
            setNewPlayer({ name: '', age: '', battingStyle: '', bowlingStyle: '', password: '', profilePicture: null });
            setPaymentStatus(false); // Reset payment status
            alert(`Player added successfully! Default Password: ${playerData.password}`);
        } else {
            alert('Please complete all fields and make payment before adding the player.');
        }
    };

    const handlePhotoUpload = (e, isPlayer = false) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (isPlayer) {
                    setNewPlayer({ ...newPlayer, profilePicture: reader.result });
                } else {
                    setProfilePhoto(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMakePayment = () => {
        // Simulate payment process
        setPaymentStatus(true);
        alert('Payment successful!');
    };

    const handleAddToPlayingXI = (player) => {
        if (playingXI.length < 11) {
            setPlayingXI([...playingXI, player]);
            setPlayers(players.filter(p => p.id !== player.id)); // Remove player from dashboard
            alert(`${player.name} added to the Playing XI.`);
        } else {
            alert('Playing XI is already full.');
        }
    };

    const handleRemoveFromPlayingXI = (player) => {
        setPlayingXI(playingXI.filter(p => p.id !== player.id));
        setPlayers([...players, player]); // Add back to dashboard
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`w-64 bg-gray-800 text-white flex flex-col ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
                <div className="p-6 text-center border-b border-gray-700">
                    {profilePhoto && (
                        <img src={profilePhoto} alt="Admin Profile" className="w-24 h-24 rounded-full mx-auto mb-2" />
                    )}
                    <h1 className="font-bold text-xl">Team Manager</h1>
                </div>
                <nav className="flex-1 p-4">
                    <ul>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'dashboard' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('dashboard')}
                        >
                            Dashboard
                        </li>
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
                                activeSection === 'playingXI' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('playingXI')}
                        >
                            Manage Playing XI
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'addPlayer' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('addPlayer')}
                        >
                            Add New Player
                        </li>
                        <li
                            className={`py-2 px-4 rounded-lg mb-2 cursor-pointer ${
                                activeSection === 'alerts' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveSection('alerts')}
                        >
                            <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2h-5v2zM17 16h5v-2h-5v2zM3 12h6v-2H3v2zm2-4h6V6H5v2zm2 8h6v-2H7v2z" />
                                </svg>
                                Alerts
                            </span>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Hamburger Button for Mobile */}
            <button
                className="md:hidden text-white bg-gray-800 p-4 rounded-lg absolute top-4 left-4 z-10"
                onClick={toggleSidebar}
            >
                ☰
            </button>

            {/* Main Content */}
            <div className="flex-1 p-6">
                {/* Homepage Sections */}
                <div className="mb-6">
                    {/* Show Recent Match Highlights only on Dashboard */}
                    {activeSection === 'dashboard' && (
                        <>
                            <h2 className="text-xl font-bold">Recent Match Highlights</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                {youtubeLinks.map((link, index) => (
                                    <div key={index} className="aspect-w-16 aspect-h-9">
                                        <iframe
                                            src={link}
                                            title={`Match ${index + 1}`}
                                            className="w-full h-full rounded-lg"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div>
                    {/* Player Section */}
                    {activeSection === 'dashboard' && (
                        <div>
                            <h1 className="text-2xl font-bold mb-4">Team Dashboard</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {players.map((player) => (
                                    <div key={player.id} className="bg-white p-4 rounded-lg shadow">
                                        {player.profilePicture && (
                                            <img
                                                src={player.profilePicture}
                                                alt="Player Profile"
                                                className="w-16 h-16 rounded-full mb-2"
                                            />
                                        )}
                                        <h2 className="text-lg font-bold">{player.name}</h2>
                                        <p>Age: {player.age}</p>
                                        <p>Batting Style: {player.battingStyle}</p>
                                        <p>Bowling Style: {player.bowlingStyle}</p>
                                        {playingXI.find(p => p.id === player.id) ? (
                                            <button className="bg-gray-500 text-white px-4 py-2 rounded mt-4" disabled>
                                                Added
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAddToPlayingXI(player)}
                                                className="bg-green-500 text-white px-4 py-2 rounded mt-4"
                                            >
                                                Add to Playing XI
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === 'profile' && (
                        <div>
                            <h1 className="text-2xl font-bold mb-4">Profile</h1>
                            <div className="bg-white p-4 rounded-lg shadow">
                                {profilePhoto && (
                                    <img src={profilePhoto} alt="Profile" className="w-24 h-24 rounded-full mb-4" />
                                )}
                                <input type="file" onChange={(e) => handlePhotoUpload(e)} className="mb-4" />
                                <p>Name: Team Manager</p>
                                <p>Email: manager@example.com</p>
                                <p>Phone: +123456789</p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'addPlayer' && (
                        <div>
                            <h1 className="text-2xl font-bold mb-4">Add New Player</h1>
                            <form onSubmit={handleAddPlayer} className="bg-white p-4 rounded-lg shadow">
                                <div className="mb-4">
                                    <label className="block text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newPlayer.name}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700">Age</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newPlayer.age}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, age: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700">Batting Style</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newPlayer.battingStyle}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, battingStyle: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700">Bowling Style</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newPlayer.bowlingStyle}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, bowlingStyle: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700">Profile Picture</label>
                                    <input type="file" onChange={(e) => handlePhotoUpload(e, true)} className="w-full" />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleMakePayment}
                                    className={`bg-green-500 text-white px-4 py-2 rounded mb-4 ${
                                        paymentStatus ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    disabled={paymentStatus}
                                >
                                    {paymentStatus ? 'Payment Done' : 'Make Payment'}
                                </button>
                                <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">
                                    Add Player
                                </button>
                            </form>
                        </div>
                    )}

                    {activeSection === 'playingXI' && (
                        <div>
                            <h1 className="text-2xl font-bold mb-4">Manage Playing XI</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {playingXI.map((player) => (
                                    <div key={player.id} className="bg-white p-4 rounded-lg shadow">
                                        {player.profilePicture && (
                                            <img
                                                src={player.profilePicture}
                                                alt="Player Profile"
                                                className="w-16 h-16 rounded-full mb-2"
                                            />
                                        )}
                                        <h2 className="text-lg font-bold">{player.name}</h2>
                                        <p>Age: {player.age}</p>
                                        <p>Batting Style: {player.battingStyle}</p>
                                        <p>Bowling Style: {player.bowlingStyle}</p>
                                        <button
                                            onClick={() => handleRemoveFromPlayingXI(player)}
                                            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
                                        >
                                            Remove from Playing XI
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alerts Section */}
                    {activeSection === 'alerts' && (
                        <div>
                            <h2 className="text-xl font-bold">Alerts</h2>
                            <div className="bg-white p-4 rounded-lg shadow mt-4">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="text-gray-700 mb-2">
                                        {alert.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamManagerDashboard;
