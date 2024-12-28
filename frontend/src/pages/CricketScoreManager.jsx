import React, { useState } from "react";

const CricketScoreManager = () => {
    const [score, setScore] = useState(0);
    const [wickets, setWickets] = useState(0);
    const [overs, setOvers] = useState(0);
    const [balls, setBalls] = useState(0);
    const [currentBatsman, setCurrentBatsman] = useState({ name: "Batsman 1", runs: 0, balls: 0 });
    const [currentBowler, setCurrentBowler] = useState({ name: "Bowler 1", overs: 0, wickets: 0 });
    const [matchRunning, setMatchRunning] = useState(false);

    const addRuns = (runs) => {
        if (!matchRunning) return alert("Start the match to update the score.");
        setScore(score + runs);
        setCurrentBatsman({ ...currentBatsman, runs: currentBatsman.runs + runs, balls: currentBatsman.balls + 1 });
        incrementBalls();
    };

    const addWicket = () => {
        if (!matchRunning) return alert("Start the match to update the score.");
        if (wickets >= 10) return alert("All wickets are already down.");
        setWickets(wickets + 1);
        setCurrentBowler({ ...currentBowler, wickets: currentBowler.wickets + 1 });
    };

    const incrementBalls = () => {
        const newBalls = balls + 1;
        if (newBalls >= 6) {
            setBalls(0);
            setOvers(overs + 1);
            setCurrentBowler({ ...currentBowler, overs: currentBowler.overs + 1 });
        } else {
            setBalls(newBalls);
        }
    };

    const toggleMatch = () => setMatchRunning(!matchRunning);

    const resetMatch = () => {
        if (!window.confirm("Are you sure you want to reset the match?")) return;
        setScore(0);
        setWickets(0);
        setOvers(0);
        setBalls(0);
        setCurrentBatsman({ name: "Batsman 1", runs: 0, balls: 0 });
        setCurrentBowler({ name: "Bowler 1", overs: 0, wickets: 0 });
        setMatchRunning(false);
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Cricket Score Manager</h1>

            {/* Match Status */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Score</h2>
                        <p className="text-2xl font-bold text-blue-600">{`${score} / ${wickets}`}</p>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Overs</h2>
                        <p className="text-2xl font-bold text-blue-600">{`${overs}.${balls}`}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-gray-600">
                        <strong>Current Batsman:</strong> {currentBatsman.name} - {currentBatsman.runs} ({currentBatsman.balls})
                    </p>
                    <p className="text-gray-600">
                        <strong>Current Bowler:</strong> {currentBowler.name} - {currentBowler.overs} overs, {currentBowler.wickets} wickets
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Match Controls</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => addRuns(1)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                        +1 Run
                    </button>
                    <button
                        onClick={() => addRuns(2)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                        +2 Runs
                    </button>
                    <button
                        onClick={() => addRuns(4)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                    >
                        Boundary (4)
                    </button>
                    <button
                        onClick={() => addRuns(6)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                    >
                        Six (6)
                    </button>
                    <button
                        onClick={addWicket}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                    >
                        Add Wicket
                    </button>
                </div>
            </div>

            {/* Match Actions */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Game Actions</h2>
                <div className="flex gap-4">
                    <button
                        onClick={toggleMatch}
                        className={`px-6 py-2 rounded text-white font-semibold ${
                            matchRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                        }`}
                    >
                        {matchRunning ? "Pause Match" : "Start Match"}
                    </button>
                    <button
                        onClick={resetMatch}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
                    >
                        Reset Match
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CricketScoreManager;
