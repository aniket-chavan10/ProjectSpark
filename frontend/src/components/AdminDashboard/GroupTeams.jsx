import React, { useState, useEffect, useContext } from "react";
import ManualGrouping from "./ManualGrouping";
import BulkGrouping from "./BulkGrouping";
import RandomGrouping from "./RandomGrouping";
import ScheduleFirstRound from "./ScheduleFirstRound";
import adminApi from "../../api/adminApi";
import { TournamentContext } from "../../contexts/TournamentContext";

const GroupTeams = ({ updateTournamentStep }) => {
  const { tournamentId } = useContext(TournamentContext);
  const [groupingMode, setGroupingMode] = useState("manual");
  const [groupedTeams, setGroupedTeams] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedTeams, setSavedTeams] = useState([]);

  useEffect(() => {
    if (tournamentId) {
      setLoading(true);
      adminApi
        .getAppliedTeams(tournamentId)
        .then((teams) => {
          setSavedTeams(Array.isArray(teams) ? teams : []);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching applied teams:", error);
          setLoading(false);
        });
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!showSchedule) {
      setGroupingMode("manual"); // Ensure manual grouping is the default mode
    }
  }, [showSchedule]);

  const handleGroupingChange = (mode) => {
    setGroupingMode(mode);
    setShowSchedule(false);
  };

  const saveGroupAssignments = (assignments) => {
    setGroupedTeams(Array.isArray(assignments) ? assignments : []);
    setGroupingMode(null);
    setShowSchedule(true);
    updateTournamentStep(tournamentId, 4);
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

      {showSchedule && !loading && groupedTeams.length > 0 && (
        <ScheduleFirstRound groupedTeams={groupedTeams} />
      )}

      {loading && (
        <div className="text-center text-white text-xl">Loading...</div>
      )}

      {!loading && savedTeams.length === 0 && (
        <div className="text-center text-white text-xl">
          No teams available for grouping.
        </div>
      )}
    </div>
  );
};

export default GroupTeams;
