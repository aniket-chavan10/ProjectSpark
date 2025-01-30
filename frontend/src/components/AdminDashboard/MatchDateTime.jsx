import React, { useState, useEffect } from "react";
import adminApi from "../../api/adminApi";
import ShowMatchSequence from "../AdminDashboard/ShowMatchSeuquence";

const MatchDateTime = ({ tournamentId, onSave }) => {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [showMatchSequence, setShowMatchSequence] = useState(false);
  const [tournamentStartDate, setTournamentStartDate] = useState(null);
  const [tournamentEndDate, setTournamentEndDate] = useState(null);

  useEffect(() => {
    const fetchScheduledMatches = async () => {
      try {
        const response = await adminApi.getScheduledMatches(tournamentId);

        if (response.matches.length > 0) {
          const startDate =
            response.matches[0].tournament_start_date.split("T")[0]; // Remove time from ISO string
          const endDate = response.matches[0].tournament_end_date.split("T")[0]; // Remove time from ISO string
          setTournamentStartDate(startDate);
          setTournamentEndDate(endDate);
        }

        const matchesMap = new Map();

        const data = response.matches.map((match) => {
          const updatedMatch = {
            id: match.match_no,
            round: match.round_number,
            group: match.group_name || "Unassigned",
            team1Name:
              match.team1_name ||
              `Winner of Match ${match.dependent_match1_id || "TBD"}`,
            team2Name:
              match.team2_name ||
              `Winner of Match ${match.dependent_match2_id || "TBD"}`,
            dependentMatch1Id: match.dependent_match1_id,
            dependentMatch2Id: match.dependent_match2_id,
            date: null, // Initially no date
            time: null, // Initially no time
          };
          matchesMap.set(match.match_no, updatedMatch);
          return updatedMatch;
        });

        setMatches(data);
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchScheduledMatches();
  }, [tournamentId]);

  const handleInputChange = (id, key, value, isBlur = false) => {
    // Update state immediately for user feedback
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.id === id ? { ...match, [key]: value } : match
      )
    );

    // Validate only after blur or when the input is complete
    if (key === "date" && isBlur) {
      const selectedDate = new Date(value);
      const startDate = new Date(tournamentStartDate);
      const endDate = new Date(tournamentEndDate);

      // Validate the date after user finishes input
      if (selectedDate < startDate || selectedDate > endDate) {
        alert(
          `Match date must be between ${tournamentStartDate} and ${tournamentEndDate}.`
        );

        // Revert invalid date
        setMatches((prevMatches) =>
          prevMatches.map((match) =>
            match.id === id ? { ...match, [key]: "" } : match
          )
        );
      }
    }
  };

  const handleSubmit = async () => {
    const scheduledMatches = matches.filter(
      (match) => match.date && match.time
    );

    if (scheduledMatches.length === 0) {
      alert("No matches have been scheduled yet.");
      return;
    }

    const incompleteMatches = matches.filter(
      (match) => !match.date || !match.time
    );

    if (incompleteMatches.length > 0) {
      alert(
        "Some matches have missing date or time. Please complete scheduling for all matches."
      );
      return;
    }

    try {
      const formattedMatches = scheduledMatches.map((match) => ({
        matchId: match.id,
        matchDate: match.date,
        matchTime: match.time,
      }));

      console.log("Submitting match schedule:", formattedMatches);

      await adminApi.updateMatchDateTime(formattedMatches);

      alert("Match schedule updated successfully!");

      if (onSave) {
        onSave();
      }
      setShowMatchSequence(true);
    } catch (error) {
      console.error("Error updating match schedule:", error);
      alert("Failed to update match schedule. Please try again.");
    }
  };
  const groupMatchesByRound = (groupMatches) => {
    const rounds = {};
    groupMatches.forEach((match) => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });
    return rounds;
  };

  const groups = {
    A: matches.filter((match) => match.id >= 1 && match.id <= 7),
    B: matches.filter((match) => match.id >= 8 && match.id <= 14),
    C: matches.filter((match) => match.id >= 15 && match.id <= 21),
    D: matches.filter((match) => match.id >= 22 && match.id <= 28),
    SemiFinal: matches.filter((match) => match.id === 29 || match.id === 30),
    Final: matches.filter((match) => match.id === 31),
  };

  const renderGroup = (groupName, groupMatches) => {
    const rounds = groupMatchesByRound(groupMatches);

    return (
      <div key={groupName} className="space-y-6">
        <h2 className="text-2xl font-semibold text-center mb-4">{`Group ${groupName}`}</h2>
        {Object.keys(rounds).map((round) => (
          <div key={round} className="mb-6">
            <h3 className="text-xl font-medium mb-4">{`Round ${round}`}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {rounds[round].map((match) => (
                <div
                  key={match.id}
                  className="bg-white shadow rounded-lg p-3 border border-gray-200 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team1Name}
                    </p>
                    <span className="text-sm font-bold mx-2">VS</span>
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team2Name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        value={match.date || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "date", e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            match.id,
                            "date",
                            e.target.value,
                            true
                          )
                        }
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Time
                      </label>
                      <input
                        type="time"
                        value={match.time || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "time", e.target.value)
                        }
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (showMatchSequence) {
    return <ShowMatchSequence />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold text-center">Schedule Matches</h1>
      {loadingMatches ? (
        <p className="text-center">Loading matches...</p>
      ) : (
        <>
          {Object.keys(groups)
            .filter((key) => key !== "SemiFinal" && key !== "Final")
            .map((groupName) => renderGroup(groupName, groups[groupName]))}

          {/* Render SemiFinal matches */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Semi Finals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {groups.SemiFinal.map((match) => (
                <div
                  key={match.id}
                  className="bg-white shadow rounded-lg p-3 border border-gray-200 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team1Name}
                    </p>
                    <span className="text-sm font-bold mx-2">VS</span>
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team2Name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        value={match.date || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "date", e.target.value)
                        }
                        onBlur={(e) => handleInputChange(match.id, "date", e.target.value, true)}
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Time
                      </label>
                      <input
                        type="time"
                        value={match.time || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "time", e.target.value)
                        }
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Render Final match */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Final</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {groups.Final.map((match) => (
                <div
                  key={match.id}
                  className="bg-white shadow rounded-lg p-3 border border-gray-200 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team1Name}
                    </p>
                    <span className="text-sm font-bold mx-2">VS</span>
                    <p className="text-sm font-semibold text-center flex-1">
                      {match.team2Name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        value={match.date || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "date", e.target.value)
                        }
                        onBlur={(e) => handleInputChange(match.id, "date", e.target.value, true)}
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Time
                      </label>
                      <input
                        type="time"
                        value={match.time || ""}
                        onChange={(e) =>
                          handleInputChange(match.id, "time", e.target.value)
                        }
                        className="mt-1 p-1 border border-gray-300 rounded w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Schedule Button */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Submit Schedule
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MatchDateTime;
