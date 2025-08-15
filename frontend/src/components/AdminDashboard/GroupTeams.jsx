import React, { useState, useEffect } from "react";
import ManualGrouping from "./ManualGrouping";
import BulkGrouping from "./BulkGrouping";
import RandomGrouping from "./RandomGrouping";
import ScheduleFirstRound from "./ScheduleFirstRound";

export default function GroupTeams({ teams = [], onCreateGroups, onContinue }) {
  const [groupingMode, setGroupingMode] = useState("manual");
  const [groupedTeams, setGroupedTeams] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);

  const [savedTeams, setSavedTeams] = useState([]);

  useEffect(() => {
    setSavedTeams(teams);
  }, [teams]);

  const handleGroupingChange = (mode) => {
    setGroupingMode(mode);
    setShowSchedule(false);
  };

  const saveGroupAssignments = (assignments) => {
    setGroupedTeams(assignments || []);
    onCreateGroups(assignments); // save via parent call
    setShowSchedule(true);
  };

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 min-h-screen">
      <h2 className="text-4xl font-extrabold text-white mb-8 text-center">
        Let's Group Teams
      </h2>

      {!showSchedule && (
        <div className="mb-12 flex justify-center space-x-6">
          {["manual", "bulk", "random"].map((mode) => (
            <button
              key={mode}
              onClick={() => handleGroupingChange(mode)}
              className={`px-10 py-4 text-lg font-semibold rounded-full transition-all ${
                groupingMode === mode
                  ? "bg-white text-indigo-600 shadow-lg scale-105"
                  : "bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:scale-105 hover:shadow-md"
              }`}
            >
              {mode === "manual" && "Group Manually"}
              {mode === "bulk" && "Bulk Grouping"}
              {mode === "random" && "Random Grouping"}
            </button>
          ))}
        </div>
      )}

      {groupingMode === "manual" && (
        <ManualGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}
      {groupingMode === "bulk" && (
        <BulkGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}
      {groupingMode === "random" && (
        <RandomGrouping savedTeams={savedTeams} onSaveGroups={saveGroupAssignments} />
      )}

      {showSchedule && groupedTeams.length > 0 && (
        <ScheduleFirstRound groupedTeams={groupedTeams} onContinue={onContinue} />
      )}

      {!savedTeams.length && (
        <div className="text-center text-white text-xl">
          No teams available for grouping.
        </div>
      )}
    </div>
  );
}
