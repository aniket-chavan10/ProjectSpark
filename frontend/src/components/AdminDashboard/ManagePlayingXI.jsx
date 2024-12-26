import React, { useState } from "react";

const ManagePlayingXI = () => {
    const [allPlayers, setAllPlayers] = useState([
        { id: 1, name: "Player 1" },
        { id: 2, name: "Player 2" },
        { id: 3, name: "Player 3" },
        { id: 4, name: "Player 4" },
        { id: 5, name: "Player 5" },
    ]); // Initial list of players
    const [playingXI, setPlayingXI] = useState([]);
    const [activeTab, setActiveTab] = useState("all");

    const addToPlayingXI = (player) => {
        if (playingXI.length >= 15) {
            alert("Playing XI cannot exceed 15 players.");
            return;
        }
        if (!playingXI.find((p) => p.id === player.id)) {
            setPlayingXI([...playingXI, player]);
        }
    };

    const removeFromPlayingXI = (playerId) => {
        setPlayingXI(playingXI.filter((player) => player.id !== playerId));
    };

    const handleSubmitPlayingXI = () => {
        if (playingXI.length === 0) {
            alert("Please add at least one player to the Playing XI.");
            return;
        }
        alert("Playing XI submitted successfully!");
        console.log("Submitted Playing XI:", playingXI);
    };

    const filteredPlayers =
        activeTab === "all"
            ? allPlayers
            : playingXI;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Playing XI</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-300 mb-4">
                {["all", "playingXI"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                            activeTab === tab
                                ? "border-b-4 border-blue-500 text-blue-600"
                                : "text-gray-600 hover:text-blue-500"
                        }`}
                    >
                        {tab === "all" ? "All Players" : "Playing XI"}
                    </button>
                ))}
            </div>

            {/* Player List */}
            <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    {activeTab === "all" ? "All Players" : "Playing XI"}
                </h2>
                {filteredPlayers.length > 0 ? (
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-200 text-sm">
                                <th className="px-4 py-2 text-gray-800">#</th>
                                <th className="px-4 py-2 text-gray-800">Name</th>
                                <th className="px-4 py-2 text-gray-800">Action</th>
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
                                    <td className="px-4 py-2 text-center">
                                        {activeTab === "all" ? (
                                            playingXI.find((p) => p.id === player.id) ? (
                                                <span className="text-green-600 font-medium">
                                                    Added
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => addToPlayingXI(player)}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Add to Playing XI
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                onClick={() => removeFromPlayingXI(player.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-gray-600">
                        {activeTab === "all"
                            ? "No players available."
                            : "No players in the Playing XI."}
                    </p>
                )}
            </div>

            {/* Submit Playing XI */}
            {activeTab === "playingXI" && (
                <button
                    onClick={handleSubmitPlayingXI}
                    className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                    Submit Playing XI
                </button>
            )}
        </div>
    );
};

export default ManagePlayingXI;
