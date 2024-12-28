import React, { useState } from "react";

const CricketScoreManager = () => {
    // Toss setup state
    const [teams, setTeams] = useState({ team1: "", team2: "" });
    const [tossWinner, setTossWinner] = useState("");
    const [decision, setDecision] = useState("");
    const [tossCompleted, setTossCompleted] = useState(false);

    // Match state
    const [score, setScore] = useState(0);
    const [wickets, setWickets] = useState(0);
    const [overs, setOvers] = useState(0);
    const [balls, setBalls] = useState(0);
    const [batsmen, setBatsmen] = useState([
        { id: 1, name: "Batsman 1", runs: 0, balls: 0 },
        { id: 2, name: "Batsman 2", runs: 0, balls: 0 },
    ]);
    const [strikeIndex, setStrikeIndex] = useState(0);
    const [currentBowler, setCurrentBowler] = useState({ name: "Bowler 1", overs: 0, wickets: 0 });
    const [matchRunning, setMatchRunning] = useState(false);
    const [manualRuns, setManualRuns] = useState("");

    // Handle toss completion
    const handleTossCompletion = () => {
        if (!teams.team1 || !teams.team2 || !tossWinner || !decision) {
            alert("Please complete the toss details before starting the match.");
            return;
        }
        setTossCompleted(true);
    };

    const addRuns = (runs) => {
        if (!matchRunning) return alert("Start the match to update the score.");
        setScore(score + runs);

        const newBatsmen = [...batsmen];
        newBatsmen[strikeIndex].runs += runs;
        newBatsmen[strikeIndex].balls += 1;
        setBatsmen(newBatsmen);

        incrementBalls(runs % 2 !== 0); // Switch strike if runs are odd
    };

    const incrementBalls = (switchStrike) => {
        const newBalls = balls + 1;
        if (newBalls >= 6) {
            setBalls(0);
            setOvers(overs + 1);
            setCurrentBowler({ ...currentBowler, overs: currentBowler.overs + 1 });
            if (!switchStrike) setStrikeIndex((strikeIndex + 1) % 2); // Switch strike at end of over
        } else {
            setBalls(newBalls);
            if (switchStrike) setStrikeIndex((strikeIndex + 1) % 2);
        }
    };

    const addWicket = () => {
        if (!matchRunning) return alert("Start the match to update the score.");
        if (wickets >= 10) return alert("All wickets are already down.");

        const newBatsmen = [...batsmen];
        const outBatsman = newBatsmen[strikeIndex];

        alert(`${outBatsman.name} is out! Runs: ${outBatsman.runs}, Balls: ${outBatsman.balls}`);
        setWickets(wickets + 1);

        // Replace out batsman with a new one
        newBatsmen[strikeIndex] = {
            id: wickets + 3, // Assuming new batsman has an incremented ID
            name: `Batsman ${wickets + 3}`,
            runs: 0,
            balls: 0,
        };

        setBatsmen(newBatsmen);
    };

    const toggleMatch = () => setMatchRunning(!matchRunning);

    const resetMatch = () => {
        if (!window.confirm("Are you sure you want to reset the match?")) return;
        setScore(0);
        setWickets(0);
        setOvers(0);
        setBalls(0);
        setBatsmen([
            { id: 1, name: "Batsman 1", runs: 0, balls: 0 },
            { id: 2, name: "Batsman 2", runs: 0, balls: 0 },
        ]);
        setStrikeIndex(0);
        setCurrentBowler({ name: "Bowler 1", overs: 0, wickets: 0 });
        setMatchRunning(false);
        setTossCompleted(false);
        setTeams({ team1: "", team2: "" });
        setTossWinner("");
        setDecision("");
    };

    const handleManualRuns = () => {
        const runs = parseInt(manualRuns, 10);
        if (isNaN(runs)) {
            alert("Please enter a valid number for runs.");
            return;
        }
        addRuns(runs);
        setManualRuns("");
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Cricket Score Manager</h1>

            {!tossCompleted ? (
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Toss Phase</h2>
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2">Team 1:</label>
                        <input
                            type="text"
                            value={teams.team1}
                            onChange={(e) => setTeams({ ...teams, team1: e.target.value })}
                            className="border rounded px-3 py-2 w-full text-gray-800"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2">Team 2:</label>
                        <input
                            type="text"
                            value={teams.team2}
                            onChange={(e) => setTeams({ ...teams, team2: e.target.value })}
                            className="border rounded px-3 py-2 w-full text-gray-800"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2">Who won the toss?</label>
                        <select
                            value={tossWinner}
                            onChange={(e) => setTossWinner(e.target.value)}
                            className="border rounded px-3 py-2 w-full text-gray-800"
                        >
                            <option value="">Select team</option>
                            <option value={teams.team1}>{teams.team1}</option>
                            <option value={teams.team2}>{teams.team2}</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2">Decision:</label>
                        <select
                            value={decision}
                            onChange={(e) => setDecision(e.target.value)}
                            className="border rounded px-3 py-2 w-full text-gray-800"
                        >
                            <option value="">Select decision</option>
                            <option value="bat">Bat</option>
                            <option value="bowl">Bowl</option>
                        </select>
                    </div>
                    <button
                        onClick={handleTossCompletion}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Start Match
                    </button>
                </div>
            ) : (
                <div>
                    {/* Match Status */}
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Match Status</h2>
                        <p>
                            <strong>{tossWinner}</strong> won the toss and chose to{" "}
                            <strong>{decision === "bat" ? "bat first" : "bowl first"}.</strong>
                        </p>
                    </div>

                    {/* Match Details */}
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Score</h2>
                        <p>
                            Score: {score}/{wickets} ({overs}.{balls} overs)
                        </p>
                        <p>
                            Current Batsmen:{" "}
                            {batsmen.map((batsman, index) => (
                                <span key={batsman.id}>
                                    {batsman.name} - {batsman.runs} ({batsman.balls} balls){" "}
                                    {index === strikeIndex ? "(strike)" : ""}
                                </span>
                            ))}
                        </p>
                        <p>
                            Current Bowler: {currentBowler.name} ({currentBowler.overs} overs,{" "}
                            {currentBowler.wickets} wickets)
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex space-x-4">
                        <button
                            onClick={() => addRuns(1)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            +1
                        </button>
                        <button
                            onClick={() => addRuns(2)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            +2
                        </button>
                        <button
                            onClick={() => addRuns(3)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            +3
                        </button>
                        <button
                            onClick={() => addRuns(4)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            +4 (Boundary)
                        </button>
                        <button
                            onClick={() => addRuns(6)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            +6
                        </button>
                        <button
                            onClick={() => addWicket()}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Wicket
                        </button>
                        <button
                            onClick={toggleMatch}
                            className={`${
                                matchRunning
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : "bg-blue-500 hover:bg-blue-600"
                            } text-white px-4 py-2 rounded`}
                        >
                            {matchRunning ? "Pause Match" : "Start Match"}
                        </button>
                        <button
                            onClick={resetMatch}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                            Reset Match
                        </button>
                    </div>

                    <div className="mt-4">
                        <label className="block text-gray-600 mb-2">Add Manual Runs:</label>
                        <input
                            type="number"
                            value={manualRuns}
                            onChange={(e) => setManualRuns(e.target.value)}
                            className="border rounded px-3 py-2 w-full text-gray-800 mb-2"
                        />
                        <button
                            onClick={handleManualRuns}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Add Runs
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CricketScoreManager;
 