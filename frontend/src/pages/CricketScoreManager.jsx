import React, { useState } from "react";

const CricketScoreManager = () => {
  const [matchSetup, setMatchSetup] = useState({
    team1: "",
    team2: "",
    tossWinner: "",
    tossDecision: "",
  });

  const [players, setPlayers] = useState({
    team1: Array.from({ length: 12 }, (_, i) => `Player ${i + 1} (Team 1)`),
    team2: Array.from({ length: 12 }, (_, i) => `Player ${i + 1} (Team 2)`),
  });

  const [currentBatsmen, setCurrentBatsmen] = useState([
    { name: "", runs: 0, balls: 0 },
    { name: "", runs: 0, balls: 0 },
  ]);

  const [currentBowler, setCurrentBowler] = useState({
    name: "",
    overs: 0,
    balls: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0,
  });

  const [fielders, setFielders] = useState({});
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [matchRunning, setMatchRunning] = useState(false);

  const handleSetupChange = (key, value) => {
    setMatchSetup({ ...matchSetup, [key]: value });
  };

  const handlePlayerSelection = (team, index, playerName) => {
    if (team === "batsmen") {
      const updatedBatsmen = [...currentBatsmen];
      updatedBatsmen[index].name = playerName;
      setCurrentBatsmen(updatedBatsmen);
    } else if (team === "bowler") {
      setCurrentBowler({ ...currentBowler, name: playerName });
    }
  };

  const addRuns = (runs) => {
    if (!matchRunning) return alert("Start the match to update the score.");
    setScore(score + runs);

    // Update the strike batsman's stats
    const striker = currentBatsmen[0];
    const nonStriker = currentBatsmen[1];
    striker.runs += runs;
    striker.balls += 1;

    // Handle strike rotation
    if (runs % 2 !== 0) {
      setCurrentBatsmen([nonStriker, striker]);
    } else {
      setCurrentBatsmen([striker, nonStriker]);
    }

    incrementBalls();
  };

  const addWideBall = () => {
    if (!matchRunning) return alert("Start the match to update the score.");
    setScore(score + 1);
    setCurrentBowler({ ...currentBowler, wides: currentBowler.wides + 1 });
  };

  const addNoBall = () => {
    if (!matchRunning) return alert("Start the match to update the score.");
    setScore(score + 1);
    setCurrentBowler({ ...currentBowler, noBalls: currentBowler.noBalls + 1 });
  };

  const addWicket = () => {
    if (!matchRunning) return alert("Start the match to update the score.");
    if (wickets >= 10) return alert("All wickets are already down.");
    setWickets(wickets + 1);
    setCurrentBowler({ ...currentBowler, wickets: currentBowler.wickets + 1 });

    // Rotate the strike to the new batsman
    const newBatsman = { name: "", runs: 0, balls: 0 }; // Add logic to choose the next batsman
    setCurrentBatsmen([currentBatsmen[1], newBatsman]);
  };

  const incrementBalls = () => {
    const newBalls = balls + 1;
    if (newBalls >= 6) {
      setBalls(0);
      setOvers(overs + 1);
      setCurrentBowler({ ...currentBowler, overs: currentBowler.overs + 1 });
    } else {
      setBalls(newBalls);
      setCurrentBowler({ ...currentBowler, balls: newBalls });
    }
  };

  const toggleMatch = () => setMatchRunning(!matchRunning);

  const resetMatch = () => {
    if (!window.confirm("Are you sure you want to reset the match?")) return;
    setScore(0);
    setWickets(0);
    setOvers(0);
    setBalls(0);
    setCurrentBatsmen([
      { name: "", runs: 0, balls: 0 },
      { name: "", runs: 0, balls: 0 },
    ]);
    setCurrentBowler({ name: "", overs: 0, balls: 0, wickets: 0, wides: 0, noBalls: 0 });
    setMatchRunning(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cricket Score Manager</h1>

      {!matchRunning && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Setup Match</h2>
          {/* Team and Toss Details */}
          {/* Add dropdowns and inputs for match setup */}
        </div>
      )}

      {/* Match Status */}
      {/* Add UI for match status */}

      {/* Controls */}
      {/* Add controls for adding runs, no-ball, wide-ball, and wickets */}

      {/* Match Actions */}
      {/* Start, Pause, and Reset Match buttons */}
    </div>
  );
};

export default CricketScoreManager;
