import React, { useState, useMemo } from "react";

// ✅ Static knockout structure with no IDs for placeholders
const initialMatches = [
  { match_no: 1, group: "A", round: 1 },
  { match_no: 2, group: "A", round: 1 },
  { match_no: 3, group: "A", round: 2, team1Id: "winner of match 1", team2Id: "winner of match 2" },
  { match_no: 4, group: "A", round: 1 },
  { match_no: 5, group: "A", round: 1 },
  { match_no: 6, group: "A", round: 2, team1Id: "winner of match 4", team2Id: "winner of match 5" },
  { match_no: 7, group: "A", round: 3, team1Id: "winner of match 3", team2Id: "winner of match 6" },
  { match_no: 8, group: "B", round: 1 },
  { match_no: 9, group: "B", round: 1 },
  { match_no: 10, group: "B", round: 2, team1Id: "winner of match 8", team2Id: "winner of match 9" },
  { match_no: 11, group: "B", round: 1 },
  { match_no: 12, group: "B", round: 1 },
  { match_no: 13, group: "B", round: 2, team1Id: "winner of match 11", team2Id: "winner of match 12" },
  { match_no: 14, group: "B", round: 3, team1Id: "winner of match 10", team2Id: "winner of match 13" },
  { match_no: 15, group: "C", round: 1 },
  { match_no: 16, group: "C", round: 1 },
  { match_no: 17, group: "C", round: 2, team1Id: "winner of match 15", team2Id: "winner of match 16" },
  { match_no: 18, group: "C", round: 1 },
  { match_no: 19, group: "C", round: 1 },
  { match_no: 20, group: "C", round: 2, team1Id: "winner of match 18", team2Id: "winner of match 19" },
  { match_no: 21, group: "C", round: 3, team1Id: "winner of match 17", team2Id: "winner of match 20" },
  { match_no: 22, group: "D", round: 1 },
  { match_no: 23, group: "D", round: 1 },
  { match_no: 24, group: "D", round: 2, team1Id: "winner of match 22", team2Id: "winner of match 23" },
  { match_no: 25, group: "D", round: 1 },
  { match_no: 26, group: "D", round: 1 },
  { match_no: 27, group: "D", round: 2, team1Id: "winner of match 25", team2Id: "winner of match 26" },
  { match_no: 28, group: "D", round: 3, team1Id: "winner of match 24", team2Id: "winner of match 27" },
  { match_no: 29, round: 4, team1Id: "winner of match 7", team2Id: "winner of match 21" },
  { match_no: 30, round: 4, team1Id: "winner of match 14", team2Id: "winner of match 28" },
  { match_no: 31, round: 5, team1Id: "winner of match 29", team2Id: "winner of match 30" },
];

// Helper to add days (n) to a date string 'YYYY-MM-DD'
const addDays = (dateStr, n) => {
  if (!dateStr) return "";
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + n);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Convert ISO date string to 'YYYY-MM-DD'
const isoToDateString = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// 🔹 Helper: get available teams list by ID, filtering out selected opponent and other used teams
const getAvailableTeams = (matches, groups, groupName, matchNo, currentSelection, opponentSelection) => {
  const groupObj = groups.find((g) => g.group_name === groupName);
  if (!groupObj) return [];

  // Convert team IDs to strings for safety
  const allTeams = groupObj.teams.map((t) => ({ ...t, id: String(t.id) }));

  // Collect all used team IDs in this group, round 1, except the current match
  const usedInGroup = matches
    .filter((m) => m.group === groupName && m.round === 1 && m.match_no !== matchNo)
    .flatMap((m) => [m.team1Id, m.team2Id])
    .filter(Boolean)
    .map(String);

  // Exclude opponent's selected team and used teams, except current selection to allow edit
  const toExclude = new Set([...usedInGroup, String(opponentSelection)].filter(Boolean));

  return allTeams.filter((t) => !toExclude.has(String(t.id)) || String(t.id) === String(currentSelection));
};

// 🔹 Subcomponent for a Single Match Card
const MatchCard = ({ match, matches, groups, updateMatch }) => {
  const isRound1 = match.round === 1;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-lg transition">
      {/* Header */}
      <h3 className="font-bold mb-3 flex justify-between">
        <span>
          Match {match.match_no}
          {match.group && <span className="ml-2 text-gray-500">Group {match.group}</span>}
        </span>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Round {match.round}</span>
      </h3>

      {/* Teams */}
      {isRound1 ? (
        <div className="flex space-x-2 mb-3">
          {/* Team 1 */}
          <select
            className="flex-1 border rounded p-2"
            value={match.team1Id || ""}
            onChange={(e) => updateMatch(match.match_no, { team1Id: e.target.value })}
          >
            <option value="">Select Team 1</option>
            {getAvailableTeams(matches, groups, match.group, match.match_no, match.team1Id, match.team2Id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Team 2 */}
          <select
            className="flex-1 border rounded p-2"
            value={match.team2Id || ""}
            onChange={(e) => updateMatch(match.match_no, { team2Id: e.target.value })}
          >
            <option value="">Select Team 2</option>
            {getAvailableTeams(matches, groups, match.group, match.match_no, match.team2Id, match.team1Id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center mb-3 space-x-2">
          <span className="px-2 py-1 bg-gray-200 rounded text-sm">{match.team1Id}</span>
          <span>vs</span>
          <span className="px-2 py-1 bg-gray-200 rounded text-sm">{match.team2Id}</span>
        </div>
      )}

      {/* Date & Time */}
      <div className="flex space-x-2 mb-2">
        <input
          type="date"
          className="flex-1 border rounded p-2"
          value={match.match_date || ""}
          onChange={(e) => updateMatch(match.match_no, { match_date: e.target.value })}
        />
        <input
          type="time"
          className="flex-1 border rounded p-2"
          value={match.match_time || ""}
          onChange={(e) => updateMatch(match.match_no, { match_time: e.target.value })}
        />
      </div>

      {/* Venue removed as requested */}
    </div>
  );
};

// 🔹 Main component
export default function KnockoutScheduler({ groups, schedule, onCreateSchedule, tournamentStartDate, tournamentEndDate }) {
  // Prepare and convert tournament dates to proper yyyy-MM-dd format
  const startDate = isoToDateString(tournamentStartDate);
  const endDate = isoToDateString(tournamentEndDate);

  // Generate default dates assignment:
  // - First 10 matches → startDate
  // - Next 10 matches → startDate + 1 day
  // - Last 11 matches → endDate
  const generateDefaultDates = () => {
    const day1 = startDate;
    const day2 = addDays(day1, 1);
    const day3 = endDate;

    return initialMatches.map((m, idx) => ({
      ...m,
      match_date:
        schedule?.[idx]?.match_date ||
        (idx < 10 ? day1 : idx < 20 ? day2 : day3),
      match_time: schedule?.[idx]?.match_time || "",
      venue: schedule?.[idx]?.venue || "",
      team1Id: m.round === 1 ? (schedule?.[idx]?.team1Id || "") : String(m.team1Id || ""),
      team2Id: m.round === 1 ? (schedule?.[idx]?.team2Id || "") : String(m.team2Id || ""),
    }));
  };

  // Memoize initial state considering schedule and tournament dates
  const initialState = useMemo(() => {
    if (schedule && schedule.length) {
      return schedule.map((m, idx) => ({
        ...m,
        match_date: m.match_date || "",
        match_time: m.match_time || "",
        venue: m.venue || "",
        team1Id: m.round === 1 ? (m.team1Id || "") : String(m.team1Id || ""),
        team2Id: m.round === 1 ? (m.team2Id || "") : String(m.team2Id || ""),
      }));
    } else {
      return generateDefaultDates();
    }
  }, [schedule, tournamentStartDate, tournamentEndDate]);

  const [matches, setMatches] = useState(initialState);

  // Update match detail function
  const updateMatch = (match_no, updates) => {
    setMatches((prev) => prev.map((m) => (m.match_no === match_no ? { ...m, ...updates } : m)));
  };

  // Handler for saving schedule
  const handleSubmit = () => {
    const incomplete = matches.some((m) => m.round === 1 && (!m.team1Id || !m.team2Id));
    if (incomplete) {
      alert("Please select all teams for round 1 matches before saving.");
      return;
    }
    onCreateSchedule(matches);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🏆 Knockout Tournament Scheduler</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {matches
          .slice()
          .sort((a, b) => a.match_no - b.match_no)
          .map((match) => (
            <MatchCard key={match.match_no} match={match} matches={matches} groups={groups} updateMatch={updateMatch} />
          ))}
      </div>
      <button onClick={handleSubmit} className="px-6 py-3 mt-6 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow">
        💾 Save Schedule
      </button>
    </div>
  );
}
