import React, { useState } from "react";
import FixMatchDay from "./FixMatchDay";

const ScheduleFirstRound = ({ groupedTeams }) => {
  const groups = ["A", "B", "C", "D"];
  const initialGroupTeams = groups.map((group) =>
    groupedTeams.filter((team) => team.group === group)
  );

  const [groupTeams, setGroupTeams] = useState(initialGroupTeams);
  const [groupMatches, setGroupMatches] = useState(
    initialGroupTeams.map(() =>
      Array.from({ length: 4 }, (_, i) => ({
        name: `Match ${i + 1}`,
        slots: [null, null],
      }))
    )
  );
  const [selectedMatch, setSelectedMatch] = useState({
    group: null,
    matchIndex: null,
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isArrangeModalOpen, setIsArrangeModalOpen] = useState(false); // For arrange all matches modal
  const [successMessage, setSuccessMessage] = useState(""); // For the success message
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false); // For confirmation modal

  // Function to check if all match slots are filled
  const checkIfAllMatchesFilled = () => {
    return groupMatches.every((matches) =>
      matches.every((match) => match.slots.every((slot) => slot !== null))
    );
  };

  const handleSave = () => {
    if (checkIfAllMatchesFilled()) {
      // Show confirmation modal before saving
      setIsConfirmationModalOpen(true);
    } else {
      // If not all matches are filled, show arrange modal
      setIsArrangeModalOpen(true);
    }
  };

  const closeArrangeModal = () => {
    setIsArrangeModalOpen(false);
  };

  const closeSuccessMessage = () => {
    setSuccessMessage(""); // Close success message when the cross is clicked
  };

  const generateRandomMatches = (groupIndex) => {
    const updatedMatches = [...groupMatches];
    const teams = groupTeams[groupIndex];

    // Randomly shuffle teams
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    // Assign shuffled teams to the available match slots
    let teamIndex = 0;
    updatedMatches[groupIndex].forEach((match) => {
      match.slots.forEach((slot, slotIndex) => {
        if (teamIndex < shuffledTeams.length) {
          match.slots[slotIndex] = shuffledTeams[teamIndex++];
        }
      });
    });

    setGroupMatches(updatedMatches);
  };

  const assignTeamToMatch = (groupIndex, team) => {
    const { group, matchIndex } = selectedMatch;
    if (group !== groupIndex || matchIndex === null) return;

    const updatedMatches = [...groupMatches];
    const emptySlotIndex = updatedMatches[groupIndex][matchIndex].slots.findIndex(
      (slot) => slot === null
    );
    if (emptySlotIndex === -1) return;

    updatedMatches[groupIndex][matchIndex].slots[emptySlotIndex] = team;
    setGroupMatches(updatedMatches);
  };

  const removeTeamFromMatch = (groupIndex, matchIndex, slotIndex) => {
    const { group, matchIndex: selectedMatchIndex } = selectedMatch;
    if (group !== groupIndex || selectedMatchIndex !== matchIndex) return;

    const updatedMatches = [...groupMatches];
    const removedTeam = updatedMatches[groupIndex][matchIndex].slots[slotIndex];

    if (!removedTeam) return;

    // Clear the team from the match slot
    updatedMatches[groupIndex][matchIndex].slots[slotIndex] = null;

    const updatedGroupTeams = [...groupTeams];
    // Add the team back to the group only if it's not already present in the group
    if (!updatedGroupTeams[groupIndex].some((t) => t.name === removedTeam.name)) {
      updatedGroupTeams[groupIndex].push(removedTeam);
    }

    setGroupMatches(updatedMatches);
    setGroupTeams(updatedGroupTeams);
  };

  const confirmSaveMatches = () => {
    // Proceed with saving
    console.log("Matches saved to database:", groupMatches);

    // Show success message after saving
    setSuccessMessage("Matches saved successfully!");
    setIsSaveModalOpen(false);
    setIsConfirmationModalOpen(false); // Close the confirmation modal
  };

  const closeConfirmationModal = () => {
    setIsConfirmationModalOpen(false); // Close the confirmation modal
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        Schedule Group Matches
      </h1>
      <div className="grid grid-cols-2 gap-12 flex-1">
        {groups.map((group, groupIndex) => (
          <div key={group} className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Group {group}</h2>

            {/* Team List (Two Cards Per Line) */}
            <div className="grid grid-cols-2 gap-4">
              {groupTeams[groupIndex].map((team) => (
                <div
                  key={team.name}
                  className="p-3 bg-blue-100 rounded-lg shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <img
                      src={team.profilePicture}
                      alt={team.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      {team.name}
                    </span>
                  </div>
                  <button
                    onClick={() => assignTeamToMatch(groupIndex, team)}
                    className={`text-xs py-1 px-2 rounded ${
                      selectedMatch.group === null || selectedMatch.matchIndex === null ||
                      groupMatches[groupIndex].some((match) =>
                        match.slots.includes(team)
                      )
                        ? "bg-green-500 text-white cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    disabled={selectedMatch.group === null || selectedMatch.matchIndex === null ||
                      groupMatches[groupIndex].some((match) => match.slots.includes(team))}
                  >
                    {groupMatches[groupIndex].some((match) =>
                      match.slots.includes(team)
                    )
                      ? "Assigned"
                      : "Assign"}
                  </button>
                </div>
              ))}
            </div>

            {/* Match Slots */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-600 mb-2">Matches</h3>

              <div className="mt-4">
                <button
                  onClick={() => generateRandomMatches(groupIndex)}
                  className="w-full py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Random Matches
                </button>
              </div>

              <div className="space-y-4 mt-4">
                {groupMatches[groupIndex].map((match, matchIndex) => (
                  <div
                    key={matchIndex}
                    className={`flex items-center justify-between space-x-2 bg-gray-200 p-4 rounded-lg ${
                      selectedMatch.group === groupIndex && selectedMatch.matchIndex === matchIndex
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex-1 text-center cursor-pointer ${
                        selectedMatch.group === groupIndex && selectedMatch.matchIndex === matchIndex
                          ? "bg-blue-300"
                          : "bg-gray-100"
                      } py-2 px-4 rounded-md`}
                      onClick={() => setSelectedMatch({ group: groupIndex, matchIndex })}
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        {`Group ${group} Match ${matchIndex + 1}`}
                      </span>
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
                              {slot.name}
                            </span>
                            <button
                              onClick={() =>
                                removeTeamFromMatch(groupIndex, matchIndex, slotIndex)
                              }
                              className="text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Empty Slot</span>
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

      <div className="mt-8">
        <button
          onClick={handleSave}
          className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save Round 1 Matches
        </button>
      </div>

      {/* Arrange Matches Modal */}
      {isArrangeModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-1/3">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Arrange all matches to continue.
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={closeArrangeModal}
                className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Modal */}
      {successMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-1/3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {successMessage}
              </h3>
              <button
                onClick={closeSuccessMessage}
                className="text-xl font-semibold text-gray-600 hover:text-gray-800"
              >
                &times; {/* Cross Icon */}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-1/3">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Are you sure to save matches? This action cannot be undone.
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={confirmSaveMatches}
                className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Yes, Save
              </button>
              <button
                onClick={closeConfirmationModal}
                className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default ScheduleFirstRound;
