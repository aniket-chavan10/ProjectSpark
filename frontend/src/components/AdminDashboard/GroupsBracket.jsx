import React, { useState, useEffect } from 'react';
import TournamentBracket from './TournamentBracket'; // Ensure the path is correct

// Fetch the tournament data for all 4 groups
const fetchAllGroupsData = async () => {
  // Sample data for 4 different groups
  return {
    groupA: {
      groupName: "A",
      date: "12/02/2002",
      teams: ["TEAM 1", "TEAM 2", "TEAM 3", "TEAM 4", "TEAM 5", "TEAM 6", "TEAM 7", "TEAM 8"],
      matchTimes: ["10:00", "11:00", "12:00", "13:00"],
      secondRoundTeams: ["TEAM 1", "TEAM 3", "TEAM 5", "TEAM 7"],
      thirdRoundTeams: ["TEAM 3", "TEAM 8"],
      finalTeam: "TEAM 8",
    },
    groupB: {
      groupName: "B",
      date: "13/02/2002",
      teams: ["TEAM 9", "TEAM 10", "TEAM 11", "TEAM 12", "TEAM 13", "TEAM 14", "TEAM 15", "TEAM 16"],
      matchTimes: ["10:30", "11:30", "12:30", "13:30"],
      secondRoundTeams: ["TEAM 9", "TEAM 11", "TEAM 13", "TEAM 15"],
      thirdRoundTeams: ["TEAM 11", "TEAM 16"],
      finalTeam: "TEAM 16",
    },
    groupC: {
      groupName: "C",
      date: "14/02/2002",
      teams: ["TEAM 17", "TEAM 18", "TEAM 19", "TEAM 20", "TEAM 21", "TEAM 22", "TEAM 23", "TEAM 24"],
      matchTimes: ["14:00", "15:00", "16:00", "17:00"],
      secondRoundTeams: ["TEAM 17", "TEAM 19", "TEAM 21", "TEAM 23"],
      thirdRoundTeams: ["TEAM 19", "TEAM 24"],
      finalTeam: "TEAM 24",
    },
    groupD: {
      groupName: "D",
      date: "15/02/2002",
      teams: ["TEAM 25", "TEAM 26", "TEAM 27", "TEAM 28", "TEAM 29", "TEAM 30", "TEAM 31", "TEAM 32"],
      matchTimes: ["09:00", "10:00", "11:00", "12:00"],
      secondRoundTeams: ["TEAM 25", "TEAM 27", "TEAM 29", "TEAM 31"],
      thirdRoundTeams: ["TEAM 27", "TEAM 32"],
      finalTeam: "TEAM 32",
    },
  };
};

const GroupsBracket = () => {
  const [groupsData, setGroupsData] = useState(null);

  useEffect(() => {
    const loadGroupData = async () => {
      const fetchedData = await fetchAllGroupsData();
      setGroupsData(fetchedData);
    };

    loadGroupData();
  }, []);

  // Loading state while data is fetching
  if (!groupsData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="groups-bracket-container" style={{ padding: '20px', backgroundColor: '#333' }}>
      {/* Upper Two Brackets */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px' }}>
        <div className="bracket" style={{ flex: 1, margin: '0 10px' }}>
          <TournamentBracket data={groupsData.groupA} />
        </div>
        <div className="bracket" style={{ flex: 1, margin: '0 10px' }}>
          <TournamentBracket data={groupsData.groupB} />
        </div>
      </div>

      {/* Lower Two Brackets */}
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div className="bracket" style={{ flex: 1, margin: '0 10px' }}>
          <TournamentBracket data={groupsData.groupC} />
        </div>
        <div className="bracket" style={{ flex: 1, margin: '0 10px' }}>
          <TournamentBracket data={groupsData.groupD} />
        </div>
      </div>
    </div>
  );
};

export default GroupsBracket;
