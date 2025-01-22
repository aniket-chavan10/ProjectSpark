import React, { useState, useEffect } from "react";
import adminApi from "../../api/adminApi";

const ScheduleFirstRound = () => {
  const tournamentId = 7; // Hardcoded Tournament ID
  const groups = ["A", "B", "C", "D"];
  const [groupTeams, setGroupTeams] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({
    group: null,
    matchIndex: null,
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isArrangeModalOpen, setIsArrangeModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  useEffect(() => {
    const fetchGroupedTeams = async () => {
      try {
        const { groupsAssignedTeams } = await adminApi.getGroupsAssignedTeams(tournamentId);
        console.log("Fetched teams:", groupsAssignedTeams);

        const initialGroupTeams = groups.map(group =>
          groupsAssignedTeams[group] ? groupsAssignedTeams[group] : []
        );

        setGroupTeams(initialGroupTeams);

        setGroupMatches(
          initialGroupTeams.map(() =>
            Array.from({ length: 4 }, (_, i) => ({
              name: `Match ${i + 1}`,
              slots: [null, null],
            }))
          )
        );
      } catch (error) {
        console.error("Error fetching grouped teams:", error.message);
      }
    };

    fetchGroupedTeams();
  }, []);

  const assignTeamToMatch = (groupIndex, team) => {
    const { group, matchIndex } = selectedMatch;
    if (group !== groupIndex || matchIndex === null) return;

    const updatedMatches = [...groupMatches];
    const emptySlotIndex = updatedMatches[groupIndex][matchIndex].slots.findIndex(
      (slot) => slot === null
    );
    if (emptySlotIndex !== -1) {
      updatedMatches[groupIndex][matchIndex].slots[emptySlotIndex] = {
        team_name: team.team_name,
        team_id: team.id,
      };
      setGroupMatches(updatedMatches);

      const updatedGroupTeams = [...groupTeams];
      updatedGroupTeams[groupIndex] = updatedGroupTeams[groupIndex].filter(
        (t) => t.id !== team.id
      );
      setGroupTeams(updatedGroupTeams);
    }
  };

  const removeTeamFromMatch = (groupIndex, matchIndex, slotIndex) => {
    const updatedMatches = [...groupMatches];
    const removedTeam = updatedMatches[groupIndex][matchIndex].slots[slotIndex];
    updatedMatches[groupIndex][matchIndex].slots[slotIndex] = null;
    setGroupMatches(updatedMatches);

    if (removedTeam) {
      const updatedGroupTeams = [...groupTeams];
      updatedGroupTeams[groupIndex].push(removedTeam);
      setGroupTeams(updatedGroupTeams);
    }
  };

  const prepareMatchData = () => {
    return groupMatches.flatMap((group, groupIndex) =>
      group.map((match, matchIndex) => ({
        group: groups[groupIndex],
        match_no: matchIndex + 1, // Match number starts from 1
        team1Id: match.slots[0]?.team_id || null,
        team2Id: match.slots[1]?.team_id || null,
        venue: "TBD", // You can change it as needed
        // You can further enhance the data with match round, etc.
      }))
    );
  };

  const handleSave = async () => {
    if (
      groupMatches.every((matches) =>
        matches.every((match) => match.slots.every((slot) => slot !== null))
      )
    ) {
      setIsConfirmationModalOpen(true);
      try {
        const matches = prepareMatchData();

        // Format matches into the expected structure
        const formattedMatches = matches.map(match => ({
          match_no: match.match_no,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          venue: match.venue || "TBD", // Default venue if not provided
        }));

        console.log("Formatted matches data:", formattedMatches);

        const response = await adminApi.scheduleTournamentMatches(tournamentId, formattedMatches);
        setSuccessMessage("Tournament matches scheduled successfully!");
        console.log("Matches scheduled:", response);
      } catch (error) {
        console.error("Error scheduling tournament matches:", error);
        setSuccessMessage("Error scheduling matches.");
      }
    } else {
      setIsArrangeModalOpen(true);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        Schedule Group Matches
      </h1>
      <div className="grid grid-cols-2 gap-12 flex-1">
        {groups.map((group, groupIndex) => (
          <div key={group} className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Group {group}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {groupTeams[groupIndex] && groupTeams[groupIndex].length > 0 ? (
                groupTeams[groupIndex].map((team) => (
                  <div
                    key={team.id}
                    className="p-3 bg-blue-100 rounded-lg shadow-md flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {team.team_name}
                    </span>
                    <button
                      onClick={() => assignTeamToMatch(groupIndex, team)}
                      className="text-xs py-1 px-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Assign
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-sm text-gray-500">No teams available</span>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-600 mb-2">Matches</h3>
              <div className="space-y-4">
                {groupMatches[groupIndex] &&
                  groupMatches[groupIndex].map((match, matchIndex) => (
                    <div
                      key={matchIndex}
                      className={`flex items-center justify-between space-x-2 bg-gray-200 p-4 rounded-lg ${
                        selectedMatch.group === groupIndex &&
                        selectedMatch.matchIndex === matchIndex
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex-1 text-center cursor-pointer ${
                          selectedMatch.group === groupIndex &&
                          selectedMatch.matchIndex === matchIndex
                            ? "bg-blue-300"
                            : "bg-gray-100"
                        } py-2 px-4 rounded-md`}
                        onClick={() =>
                          setSelectedMatch({ group: groupIndex, matchIndex })
                        }
                      >
                        Match {matchIndex + 1}
                      </div>
                      {match.slots.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className={`flex-1 h-12 flex items-center justify-center ${
                            slot
                              ? "bg-blue-300"
                              : "bg-gray-100 border border-dashed border-gray-400"
                          } rounded-md`}
                        >
                          {slot ? (
                            <div className="flex items-center justify-between w-full px-2">
                              <span className="text-sm font-semibold text-gray-700">
                                {slot.team_name}
                              </span>
                              <button
                                onClick={() =>
                                  removeTeamFromMatch(
                                    groupIndex,
                                    matchIndex,
                                    slotIndex
                                  )
                                }
                                className="text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Empty Slot
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
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

      {/* Modals */}
      {isArrangeModalOpen && (
        <div className="modal">Please arrange all teams in the matches</div>
      )}

      {isConfirmationModalOpen && (
        <div className="modal">Confirm to save the match schedule</div>
      )}
    </div>
  );
};

export default ScheduleFirstRound;
