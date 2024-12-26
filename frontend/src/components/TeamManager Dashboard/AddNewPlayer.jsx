import React, { useState } from "react";

const AddNewPlayer = () => {
    const [playerDetails, setPlayerDetails] = useState({
        name: "",
        mobile: "",
        email: "",
        profilePic: null,
    });
    const [isPaymentDone, setIsPaymentDone] = useState(false);
    const [players, setPlayers] = useState([]);
    const [activeTab, setActiveTab] = useState("pending");

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPlayerDetails({
            ...playerDetails,
            [name]: value,
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setPlayerDetails({
            ...playerDetails,
            profilePic: file,
        });
    };

    const handlePayment = () => {
        // Simulate payment process
        setIsPaymentDone(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isPaymentDone) {
            alert("Please complete the payment to add the player.");
            return;
        }

        // Add player to the pending list
        setPlayers([
            ...players,
            {
                id: players.length + 1,
                ...playerDetails,
                status: "pending",
            },
        ]);

        // Reset form
        setPlayerDetails({
            name: "",
            mobile: "",
            email: "",
            profilePic: null,
        });
        setIsPaymentDone(false);
    };

    const handleStatusChange = (id, status) => {
        setPlayers((prevPlayers) =>
            prevPlayers.map((player) =>
                player.id === id ? { ...player, status } : player
            )
        );
    };

    const filteredPlayers = players.filter(
        (player) => player.status === activeTab
    );

    const isFormValid =
        playerDetails.name && playerDetails.mobile && playerDetails.email;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Players</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-300 mb-4">
                {["pending", "added"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                            activeTab === tab
                                ? "border-b-4 border-blue-500 text-blue-600"
                                : "text-gray-600 hover:text-blue-500"
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Players
                    </button>
                ))}
            </div>

            {activeTab === "pending" ? (
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add New Player</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Player Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Player Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={playerDetails.name}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Enter player's name"
                                required
                            />
                        </div>

                        {/* Player Mobile */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Player Mobile <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="mobile"
                                value={playerDetails.mobile}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Enter mobile number"
                                required
                            />
                        </div>

                        {/* Player Email */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Player Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={playerDetails.email}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Enter email address"
                                required
                            />
                        </div>

                        {/* Profile Picture */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Profile Picture
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-gray-700 border border-gray-300 rounded-lg shadow-sm file:bg-blue-50 file:border-0 file:text-blue-600 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer hover:file:bg-blue-100"
                            />
                        </div>

                        {/* Payment */}
                        {!isPaymentDone ? (
                            <button
                                type="button"
                                onClick={handlePayment}
                                className={`w-full py-3 rounded-lg text-white font-semibold transition ${
                                    isFormValid
                                        ? "bg-blue-600 hover:bg-blue-700"
                                        : "bg-gray-300 cursor-not-allowed"
                                }`}
                                disabled={!isFormValid}
                            >
                                Make Payment
                            </button>
                        ) : (
                            <p className="text-green-600 font-medium text-center mb-4">
                                Payment Successful!
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            disabled={!isPaymentDone}
                        >
                            Add Player
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Added Players</h2>
                    {filteredPlayers.length > 0 ? (
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-200 text-sm">
                                    <th className="px-4 py-2 text-gray-800">#</th>
                                    <th className="px-4 py-2 text-gray-800">Name</th>
                                    <th className="px-4 py-2 text-gray-800">Mobile</th>
                                    <th className="px-4 py-2 text-gray-800">Email</th>
                                    <th className="px-4 py-2 text-gray-800">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPlayers.map((player, index) => (
                                    <tr
                                        key={player.id}
                                        className={`border-b ${
                                            index % 2 === 0 ? "bg-gray-100" : "bg-white"
                                        }`}
                                    >
                                        <td className="px-4 py-2 text-center">{index + 1}</td>
                                        <td className="px-4 py-2">{player.name}</td>
                                        <td className="px-4 py-2">{player.mobile}</td>
                                        <td className="px-4 py-2">{player.email}</td>
                                        <td className="px-4 py-2 text-center">{player.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-600">No players found in this category.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AddNewPlayer;
