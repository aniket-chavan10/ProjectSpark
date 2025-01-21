import React, { useState } from "react";

const MatchDay = () => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedDayColor, setSelectedDayColor] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");  // Track selected day

  // Matches for each day
  const dayMatches = {
    "Day 1": ["A11", "A12", "A13", "A14"],
    "Day 2": ["A21", "A22"],
    "Day 3": ["A31"],
  };

  const handleClick = (match) => {
    setSelectedMatch(match);
    // Change the match circle color to the selected day color
    if (selectedDayColor) {
      document.getElementById(match).style.fill = selectedDayColor;
    }

    // Update selected day based on the match clicked
    for (let day in dayMatches) {
      if (dayMatches[day].includes(match)) {
        setSelectedDay(day);
        break;
      }
    }
  };

  const handleDayClick = (day, color) => {
    console.log(`Selected ${day}`);
    setSelectedDayColor(color);
    setSelectedDay(day); // Update the selected day when a button is clicked
  };

  return (
    <div style={outerContainer}>
      <h2 style={{ color: "#fff", marginBottom: "20px" }}>Tournament Group A</h2>

      {/* Day Buttons Section */}
      <div style={buttonContainer}>
        <button
          style={{ ...buttonStyle, backgroundColor: "#FFFF00" }}
          onClick={() => handleDayClick("Day 1", "#FFFF00")} // Yellow for Day 1
        >
          Day 1
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: "#33CFFF" }}
          onClick={() => handleDayClick("Day 2", "#33CFFF")} // Blue for Day 2
        >
          Day 2
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: "#66FF33" }}
          onClick={() => handleDayClick("Day 3", "#66FF33")} // Green for Day 3
        >
          Day 3
        </button>
      </div>

      {/* SVG with Static Content */}
      <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
        <style>
          {`
            .background {
              fill: #1e0033;
            }
            .border {
              stroke: #ffcc00;
              stroke-width: 4;
            }
            .text {
              fill: white;
              font-family: Arial, sans-serif;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
            }
            .team {
              fill: #006400;
              stroke: white;
              stroke-width: 2;
              rx: 5;
              ry: 5;
            }
            .team-text {
              fill: white;
              font-size: 14px;
              font-family: Arial, sans-serif;
              text-anchor: middle;
              alignment-baseline: middle;
            }
            .top4 {
              fill: white;
              font-size: 16px;
              font-family: Arial, sans-serif;
              font-weight: bold;
            }
            .circle {
              fill: #ff0000;
              stroke: #ffcc00;
              stroke-width: 2;
            }
            .circle-text {
              fill: white;
              font-size: 12px;
              font-family: Arial, sans-serif;
              text-anchor: middle;
              alignment-baseline: middle;
            }
            .button {
              cursor: pointer;
            }
          `}
        </style>

        <rect x="0" y="0" width="800" height="500" className="background border" />
        <text x="400" y="40" className="text title" textAnchor="middle">
          Group A
        </text>

        {/* First Column */}
        <rect x="50" y="80" width="100" height="30" className="team" />
        <text x="100" y="95" className="team-text">TEAM 1</text>
        <rect x="50" y="120" width="100" height="30" className="team" />
        <text x="100" y="135" className="team-text">TEAM 2</text>
        <rect x="50" y="180" width="100" height="30" className="team" />
        <text x="100" y="195" className="team-text">TEAM 3</text>
        <rect x="50" y="220" width="100" height="30" className="team" />
        <text x="100" y="235" className="team-text">TEAM 4</text>
        <rect x="50" y="280" width="100" height="30" className="team" />
        <text x="100" y="295" className="team-text">TEAM 5</text>
        <rect x="50" y="320" width="100" height="30" className="team" />
        <text x="100" y="335" className="team-text">TEAM 6</text>
        <rect x="50" y="380" width="100" height="30" className="team" />
        <text x="100" y="395" className="team-text">TEAM 7</text>
        <rect x="50" y="420" width="100" height="30" className="team" />
        <text x="100" y="435" className="team-text">TEAM 8</text>

        {/* Second Column */}
        <rect x="200" y="100" width="100" height="30" className="team" />
        <text x="250" y="115" className="team-text">TEAM 1</text>
        <rect x="200" y="200" width="100" height="30" className="team" />
        <text x="250" y="215" className="team-text">TEAM 3</text>
        <rect x="200" y="300" width="100" height="30" className="team" />
        <text x="250" y="315" className="team-text">TEAM 5</text>
        <rect x="200" y="400" width="100" height="30" className="team" />
        <text x="250" y="415" className="team-text">TEAM 7</text>

        {/* Third Column */}
        <rect x="350" y="150" width="100" height="30" className="team" />
        <text x="400" y="165" className="team-text">TEAM 3</text>
        <rect x="350" y="350" width="100" height="30" className="team" />
        <text x="400" y="365" className="team-text">TEAM 8</text>

        {/* Fourth Column */}
        <rect x="500" y="250" width="100" height="30" className="team" />
        <text x="550" y="265" className="team-text">TEAM 8</text>

        {/* Circles with Labels and Clickable Buttons */}
        <circle
          id="A11"
          cx="170" cy="115" r="15" className="circle button"
          onClick={() => handleClick("A11")}
        />
        <text x="170" y="120" className="circle-text">A11</text>

        <circle
          id="A12"
          cx="170" cy="215" r="15" className="circle button"
          onClick={() => handleClick("A12")}
        />
        <text x="170" y="220" className="circle-text">A12</text>

        <circle
          id="A13"
          cx="170" cy="315" r="15" className="circle button"
          onClick={() => handleClick("A13")}
        />
        <text x="170" y="320" className="circle-text">A13</text>

        <circle
          id="A14"
          cx="170" cy="415" r="15" className="circle button"
          onClick={() => handleClick("A14")}
        />
        <text x="170" y="420" className="circle-text">A14</text>

        <circle
          id="A21"
          cx="320" cy="165" r="15" className="circle button"
          onClick={() => handleClick("A21")}
        />
        <text x="320" y="170" className="circle-text">A21</text>

        <circle
          id="A22"
          cx="320" cy="365" r="15" className="circle button"
          onClick={() => handleClick("A22")}
        />
        <text x="320" y="370" className="circle-text">A22</text>

        <circle
          id="A31"
          cx="470" cy="265" r="15" className="circle button"
          onClick={() => handleClick("A31")}
        />
        <text x="470" y="270" className="circle-text">A31</text>

        {/* Top 4 */}
        <text x="620" y="265" className="top4">Top 4</text>

        {/* Lines */}
        <line x1="150" y1="95" x2="200" y2="95" stroke="white" strokeWidth="2" />
        <line x1="150" y1="135" x2="200" y2="135" stroke="white" strokeWidth="2" />
        <line x1="200" y1="95" x2="200" y2="135" stroke="white" strokeWidth="2" />
        <line x1="150" y1="195" x2="200" y2="195" stroke="white" strokeWidth="2" />
        <line x1="150" y1="235" x2="200" y2="235" stroke="white" strokeWidth="2" />
        <line x1="200" y1="195" x2="200" y2="235" stroke="white" strokeWidth="2" />
        <line x1="150" y1="295" x2="200" y2="295" stroke="white" strokeWidth="2" />
        <line x1="150" y1="335" x2="200" y2="335" stroke="white" strokeWidth="2" />
        <line x1="200" y1="295" x2="200" y2="335" stroke="white" strokeWidth="2" />
        <line x1="150" y1="395" x2="200" y2="395" stroke="white" strokeWidth="2" />
        <line x1="150" y1="435" x2="200" y2="435" stroke="white" strokeWidth="2" />
        <line x1="200" y1="395" x2="200" y2="435" stroke="white" strokeWidth="2" />
        <line x1="300" y1="115" x2="350" y2="115" stroke="white" strokeWidth="2" />
        <line x1="300" y1="215" x2="350" y2="215" stroke="white" strokeWidth="2" />
        <line x1="350" y1="115" x2="350" y2="215" stroke="white" strokeWidth="2" />
        <line x1="300" y1="315" x2="350" y2="315" stroke="white" strokeWidth="2" />
        <line x1="300" y1="415" x2="350" y2="415" stroke="white" strokeWidth="2" />
        <line x1="350" y1="315" x2="350" y2="415" stroke="white" strokeWidth="2" />
        <line x1="450" y1="165" x2="500" y2="165" stroke="white" strokeWidth="2" />
        <line x1="450" y1="365" x2="500" y2="365" stroke="white" strokeWidth="2" />
        <line x1="500" y1="165" x2="500" y2="365" stroke="white" strokeWidth="2" />
      </svg>

      {/* Display the selected match */}
      {selectedMatch && (
        <div style={{ marginTop: "20px", color: "#fff" }}>
          <h3>Selected Match: {selectedMatch} on {selectedDay}</h3>
        </div>
      )}
    </div>
  );
};

const outerContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  backgroundColor: "#333",
  minHeight: "100vh",
  color: "#fff",
};

const buttonContainer = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "20px",
};

const buttonStyle = {
  padding: "10px 20px",
  fontSize: "16px",
  margin: "0 10px",
  border: "none",
  color: "#fff",
  borderRadius: "5px",
  cursor: "pointer",
};

export default MatchDay;
