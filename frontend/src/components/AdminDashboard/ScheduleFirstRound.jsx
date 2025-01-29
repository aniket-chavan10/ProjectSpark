import React, { useState, useEffect, useContext } from "react";
import { FaTrash } from "react-icons/fa";
import adminApi from "../../api/adminApi";
import { TournamentContext } from "../../contexts/TournamentContext";
import MatchDateTime from "./MatchDateTime";

const ScheduleFirstRound = ({ updateTournamentStep}) => {
  const { tournamentId } = useContext(TournamentContext);
  const groups = ["A", "B", "C", "D"];

  // Match numbers assigned for each group
  const matchNumbersByGroup = {
    A: [1, 2, 4, 5],
    B: [8, 9, 11, 12],
    C: [15, 16, 18, 19],
    D: [22, 23, 25, 26],
  };

  const [groupTeams, setGroupTeams] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({
    groupIndex: null,
    matchIndex: null,
  });
  const [isScheduleVisible, setIsScheduleVisible] = useState(true);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isMatchDateTimeVisible, setIsMatchDateTimeVisible] = useState(false);

  useEffect(() => {
    const fetchGroupedTeams = async () => {
      try {
        const { groupsAssignedTeams } = await adminApi.getGroupsAssignedTeams(
          tournamentId
        );
        const initialGroupTeams = groups.map(
          (group) => groupsAssignedTeams[group] || []
        );
        setGroupTeams(initialGroupTeams);

        // Initialize matches with specific match numbers for each group
        const initializedMatches = groups.map((group) =>
          matchNumbersByGroup[group].map((matchNo) => ({
            match_no: matchNo,
            name: `Match ${matchNo}`,
            slots: [null, null],
          }))
        );

        setGroupMatches(initializedMatches);
      } catch (error) {
        console.error("Error fetching grouped teams:", error.message);
      }
    };

    fetchGroupedTeams();
  }, [tournamentId]);

  const handleAssignTeam = (groupIndex, teamIndex) => {
    const { matchIndex } = selectedMatch;

    if (matchIndex === null || groupIndex !== selectedMatch.groupIndex) {
      alert("Please select a match in the current group first.");
      return;
    }

    const match = groupMatches[groupIndex][matchIndex];
    if (match.slots[0] && match.slots[1]) {
      alert("This match already has two teams assigned.");
      return;
    }

    const team = groupTeams[groupIndex][teamIndex];
    const updatedMatches = [...groupMatches];
    const updatedTeams = [...groupTeams];

    // Assign the team to the first empty slot
    if (!match.slots[0]) {
      updatedMatches[groupIndex][matchIndex].slots[0] = {
        team_name: team.team_name,
        team_id: team.id,
      };
    } else {
      updatedMatches[groupIndex][matchIndex].slots[1] = {
        team_name: team.team_name,
        team_id: team.id,
      };
    }

    // Remove team from available teams
    updatedTeams[groupIndex].splice(teamIndex, 1);

    setGroupMatches(updatedMatches);
    setGroupTeams(updatedTeams);
  };
  const handleRandomAssign = (groupIndex) => {
    const shuffledTeams = [...groupTeams[groupIndex]].sort(() => Math.random() - 0.5);
    const updatedMatches = [...groupMatches];
    const updatedTeams = [...groupTeams];
  
    // Assign teams to the first available slot in the group's matches
    for (let match of updatedMatches[groupIndex]) {
      for (let i = 0; i < match.slots.length; i++) {
        if (!match.slots[i] && shuffledTeams.length > 0) {
          const team = shuffledTeams.shift();
          match.slots[i] = {
            team_name: team.team_name,
            team_id: team.id,
          };
        }
      }
    }
  
    // Update remaining teams
    updatedTeams[groupIndex] = shuffledTeams;
  
    setGroupMatches(updatedMatches);
    setGroupTeams(updatedTeams);
  };
  
  const handleRemoveTeam = (groupIndex, matchIndex, slotIndex) => {
    const updatedMatches = [...groupMatches];
    const updatedTeams = [...groupTeams];

    // Add the removed team back to available teams
    const removedTeam = updatedMatches[groupIndex][matchIndex].slots[slotIndex];
    if (removedTeam) {
      updatedTeams[groupIndex].push({
        team_name: removedTeam.team_name,
        id: removedTeam.team_id,
      });
    }

    // Clear the slot
    updatedMatches[groupIndex][matchIndex].slots[slotIndex] = null;

    setGroupMatches(updatedMatches);
    setGroupTeams(updatedTeams);
  };

  const handleSave = async () => {
    if (
      groupMatches.every((matches) =>
        matches.every((match) => match.slots.every((slot) => slot !== null))
      )
    ) {
      setIsConfirmationModalOpen(true);
      
    } else {
      alert("Please ensure all matches have both teams assigned.");
    }
  };

  const confirmSave = async () => {
    try {
      updateTournamentStep(tournamentId, 6);
      const matches = groupMatches.flatMap((group, groupIndex) =>
        group.map((match) => ({
          group: groups[groupIndex],
          match_no: match.match_no,
          team1Id: match.slots[0]?.team_id || null,
          team2Id: match.slots[1]?.team_id || null,
          venue: "TBD",
        }))
      );

      await adminApi.scheduleTournamentMatches(tournamentId, matches);
      setSuccessMessage("Tournament matches scheduled successfully!");
    
      setIsMatchDateTimeVisible(true);
      setIsScheduleVisible(false);
    } catch (error) {
      console.error("Error scheduling matches:", error);
      setSuccessMessage("Error scheduling matches. Please try again.");
    } finally {
      setIsConfirmationModalOpen(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col">
      {isScheduleVisible && (
        <>
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            Schedule Group Matches
          </h1>
          <div className="grid grid-cols-2 gap-8">
            {groups.map((group, groupIndex) => (
              <div key={group} className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Group {group}</h2>
            
              <button
                onClick={() => handleRandomAssign(groupIndex)}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Random Assign
              </button>
            
              <h3 className="text-lg font-medium text-gray-700 mb-2">Available Teams:</h3>
              <ul className="mb-4 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {groupTeams[groupIndex]?.map((team, teamIndex) => (
                  <li
                    key={team.id}
                    className="text-gray-600 flex items-center justify-between mb-2 p-1 bg-gray-50 rounded hover:bg-gray-100"
                  >
                    {team.team_name}
                    <button
                      onClick={() => handleAssignTeam(groupIndex, teamIndex)}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Assign
                    </button>
                  </li>
                ))}
              </ul>
            
              <h3 className="text-lg font-medium text-gray-700 mb-4">Matches:</h3>
              <div className="grid gap-4">
                {groupMatches[groupIndex]?.map((match, matchIndex) => (
                  <div
                    key={matchIndex}
                    className={`p-4 rounded-lg flex justify-between items-center cursor-pointer ${
                      selectedMatch.groupIndex === groupIndex &&
                      selectedMatch.matchIndex === matchIndex
                        ? "bg-yellow-100"
                        : match.slots.every((slot) => slot !== null)
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                    onClick={() => setSelectedMatch({ groupIndex, matchIndex })}
                  >
                    <div>
                      <strong>{match.name}</strong>
                    </div>
                    <div className="flex gap-2">
                      {match.slots.map((slot, slotIndex) => (
                        <span
                          key={slotIndex}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={`px-2 py-1 ${
                              slot ? "bg-green-200" : "bg-gray-300"
                            } text-sm rounded-lg`}
                          >
                            {slot?.team_name || `Slot ${slotIndex + 1}`}
                          </span>
                          {slot && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTeam(
                                  groupIndex,
                                  matchIndex,
                                  slotIndex
                                );
                              }}
                              className="text-red-500 hover:text-red-600"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            ))}
          </div>

          <button
            onClick={handleSave}
            className="mt-8 w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save Round 1 Matches
          </button>
        </>
      )}

      {isConfirmationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Confirm Save
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save the match schedule?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsConfirmationModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isMatchDateTimeVisible && <MatchDateTime tournamentId={tournamentId}/>}
    </div>
  );
};

export default ScheduleFirstRound;
