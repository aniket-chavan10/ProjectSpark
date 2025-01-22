import React from "react";
import "./TournamentBracket.css";

const TournamentBracket = ({ data }) => {
  // If no data is passed, show a loading message (fallback)
  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="tournament-container">
      <svg viewBox="0 0 800 500" className="tournament-svg" xmlns="http://www.w3.org/2000/svg">
        <style>
          {`
            .background {
              fill: #1b0b33;
            }
            .border {
              fill: none;
              stroke: #ffb400;
              stroke-width: 2;
            }
            .text {
              fill: white;
              font-family: Arial, sans-serif;
              font-size: 24px;
              font-weight: bold;
            }
            .date-text {
              fill: white;
              font-family: Arial, sans-serif;
              font-size: 16px;
              font-weight: bold;
            }
            .team-box {
              fill: #1b5e20;
              stroke: #ffffff;
              stroke-width: 2;
              rx: 5;
              ry: 5;
            }
            .team-text {
              fill: white;
              font-family: Arial, sans-serif;
              font-size: 16px;
              font-weight: bold;
            }
            .champion-text {
              fill: white;
              font-family: Arial, sans-serif;
              font-size: 24px;
              font-weight: bold;
            }
            .line {
              stroke: white;
              stroke-width: 2;
            }
            .time-text {
              fill: white;
              font-family: Arial, sans-serif;
              font-size: 14px;
              font-weight: bold;
            }
          `}
        </style>
        
        <rect className="background" width="100%" height="100%" />
        <rect x="10" y="10" width="780" height="480" className="border" />
        <text x="250" y="50" className="text">
          Group Stage Matches [{data.groupName}]
        </text>
        <text x="650" y="50" className="date-text">
          {data.date}
        </text>

        {/* First Round */}
        {Array.from({ length: 8 }).map((_, i) => (
          <React.Fragment key={i}>
            <rect x="50" y={100 + i * 50} width="100" height="30" className="team-box" />
            <text x="70" y={120 + i * 50} className="team-text">
              {data.teams[i] || `TEAM ${i + 1}`} {/* Placeholder for missing team name */}
            </text>
          </React.Fragment>
        ))}

        {/* Second Round */}
        {Array.from({ length: 4 }).map((_, i) => (
          <React.Fragment key={i}>
            <rect x="200" y={125 + i * 100} width="100" height="30" className="team-box" />
            <text x="220" y={145 + i * 100} className="team-text">
              {data.secondRoundTeams[i] || `TEAM ${i + 1}`} {/* Placeholder for second round */}
            </text>
          </React.Fragment>
        ))}

        {/* Third Round */}
        {Array.from({ length: 2 }).map((_, i) => (
          <React.Fragment key={i}>
            <rect x="350" y={175 + i * 200} width="100" height="30" className="team-box" />
            <text x="370" y={195 + i * 200} className="team-text">
              {data.thirdRoundTeams[i] || `TEAM ${i + 1}`} {/* Placeholder for third round */}
            </text>
          </React.Fragment>
        ))}

        {/* Final Round */}
        <rect x="500" y="275" width="100" height="30" className="team-box" />
        <text x="520" y="295" className="team-text">
          {data.finalTeam || "TEAM 8"} {/* Placeholder for final round */}
        </text>

        {/* Winner */}
        <text x="650" y="300" className="champion-text">
          Top 4
        </text>

        {/* Lines */}
        {/* First to Second Round */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1="150"
            y1={115 + i * 50}
            x2="200"
            y2={115 + i * 50}
            className="line"
          />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={i}
            x1="200"
            y1={115 + i * 100}
            x2="200"
            y2={165 + i * 100}
            className="line"
          />
        ))}

        {/* Second to Third Round */}
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={i}
            x1="300"
            y1={140 + i * 100}
            x2="350"
            y2={140 + i * 100}
            className="line"
          />
        ))}
        {Array.from({ length: 2 }).map((_, i) => (
          <line
            key={i}
            x1="350"
            y1={140 + i * 200}
            x2="350"
            y2={240 + i * 200}
            className="line"
          />
        ))}

        {/* Third to Final Round */}
        {Array.from({ length: 2 }).map((_, i) => (
          <line
            key={i}
            x1="450"
            y1={190 + i * 200}
            x2="500"
            y2={190 + i * 200}
            className="line"
          />
        ))}
        <line x1="500" y1="190" x2="500" y2="390" className="line" />

        {/* Final to Winner */}
        <line x1="600" y1="290" x2="650" y2="290" className="line" />

        {/* Match Times */}
        {data.matchTimes.map((time, i) => (
          <text key={i} x="165" y={140 + i * 100} className="time-text">
            {time}
          </text>
        ))}
        {["14:00", "15:00"].map((time, i) => (
          <text key={i} x="315" y={190 + i * 200} className="time-text">
            {time}
          </text>
        ))}
        <text x="465" y="290" className="time-text">
          16:00
        </text>
      </svg>
    </div>
  );
};

export default TournamentBracket;
