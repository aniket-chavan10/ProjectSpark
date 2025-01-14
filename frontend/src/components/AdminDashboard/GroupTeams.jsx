import React, { useState } from "react";
import ManualGrouping from "./ManualGrouping";
import BulkGrouping from "./BulkGrouping";
import RandomGrouping from "./RandomGrouping";
import SavedGroups from "./SavedGroups";
import ScheduleFirstRound from "./ScheduleFirstRound"; // Import the component

const GroupTeams = ({ savedTeams }) => {
  const [groupingMode, setGroupingMode] = useState(null); // Track grouping mode
  const [groupedTeams, setGroupedTeams] = useState(null); // Track grouped teams
  const [showSchedule, setShowSchedule] = useState(false); // Control schedule view

  // Handle grouping mode selection
  const handleGroupingChange = (mode) => {
    setGroupingMode(mode);
    setShowSchedule(false); // Ensure schedule view is hidden when grouping
  };

  // Save group assignments from child component
  const saveGroupAssignments = (assignments) => {
    setGroupedTeams(assignments); // Save the grouped teams
    setGroupingMode(null); // Reset grouping mode
    setShowSchedule(true); // Show the schedule component
  };

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 min-h-screen">
      <h2 className="text-4xl font-extrabold text-white mb-8 text-center">
        Let's Group Teams
      </h2>

      {/* Buttons for Grouping Methods */}
      {!showSchedule && (
        <div className="mb-12 flex justify-center space-x-6">
          <button
            onClick={() => handleGroupingChange("manual")}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-teal-500 to-teal-700 text-white text-xl font-semibold hover:from-teal-400 hover:to-teal-600 transition-all"
          >
            Group Manually
          </button>
          <button
            onClick={() => handleGroupingChange("bulk")}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-700 text-white text-xl font-semibold hover:from-orange-400 hover:to-orange-600 transition-all"
          >
            Bulk Grouping
          </button>
          <button
            onClick={() => handleGroupingChange("random")}
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-purple-700 text-white text-xl font-semibold hover:from-purple-400 hover:to-purple-600 transition-all"
          >
            Group Randomly
          </button>
        </div>
      )}

      {/* Render the Selected Grouping Method */}
      {groupingMode === "manual" && (
        <ManualGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}
      {groupingMode === "bulk" && (
        <BulkGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}
      {groupingMode === "random" && (
        <RandomGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}

      {/* Display Schedule Group Matches if Saved */}
      {showSchedule && groupedTeams && (
        <ScheduleFirstRound groupedTeams={groupedTeams} />
      )}

      {/* Display Saved Groups */}
      {!groupingMode && !showSchedule && groupedTeams && (
        <SavedGroups groupedTeams={groupedTeams} />
      )}

      {/* Display All Saved Teams if No Grouping Mode and No Saved Groups */}
      {!groupingMode && !groupedTeams && !showSchedule && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {savedTeams.map((team, index) => (
            <div
              key={index}
              className="p-6 bg-gradient-to-b from-white via-gray-100 to-gray-200 rounded-lg shadow-md flex justify-between items-center hover:shadow-lg transition-all"
            >
              <div className="flex items-center space-x-4">
                {/* Profile Picture */}
                <img
                  src={team.profilePicture}
                  alt={team.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {/* Team Name */}
                <span className="text-lg font-semibold text-gray-800">
                  {team.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupTeams;
