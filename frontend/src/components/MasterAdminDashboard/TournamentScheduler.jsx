import React, { useState, useEffect } from "react";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth
} from "date-fns";
import teamApi from "../../api/teamApi";
import tournamentApi from "../../api/tournamentApi1"; // updated to correct file

export default function TournamentScheduler() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [organizerAdminId, setOrganizerAdminId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [tournamentsError, setTournamentsError] = useState("");

  // Fetch organizer teams
  useEffect(() => {
    async function fetchTeams() {
      setLoadingTeams(true);
      setTeamsError("");
      try {
        const data = await teamApi.getAllTeams();
        setTeams(data.teams || data);
      } catch (e) {
        setTeamsError("Could not fetch teams. Try again later.");
      } finally {
        setLoadingTeams(false);
      }
    }
    fetchTeams();
  }, []);

  // Fetch schedules
  useEffect(() => {
    async function fetchTournaments() {
      setLoadingTournaments(true);
      setTournamentsError("");
      try {
        const data = await tournamentApi.getAllTentativeSchedules();
        const parsed = (data || []).map((t) => {
          const start = new Date(t.start_date);
          const endDate = addDays(start, 2);
          // Strip time for reliable comparisons
          start.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          return {
            ...t,
            organizer: t.organizer_team_name || t.organizer || "Organizer",
            start,
            end: endDate,
          };
        });
        setTournaments(parsed);
      } catch (e) {
        setTournamentsError("Could not load tournaments.");
      } finally {
        setLoadingTournaments(false);
      }
    }
    fetchTournaments();
  }, []);

  // Assign
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!organizerAdminId || !startDate) {
      return alert("Please select organizer & date.");
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const payload = {
      organizer_admin_id: organizerAdminId,
      start_date: format(start, "yyyy-MM-dd"),
    };

    try {
      const saved = await tournamentApi.createTentativeSchedule(payload);
      const savedStart = new Date(saved.start_date);
      savedStart.setHours(0, 0, 0, 0);
      const savedEnd = addDays(savedStart, 2);
      savedEnd.setHours(0, 0, 0, 0);

      setTournaments([
        ...tournaments,
        {
          id: saved.id,
          tournament_status: saved.tournament_status || "pending",
          organizer:
            saved.organizer_name ||
            teams.find((t) => Number(t.id) === Number(organizerAdminId))
              ?.team_name,
          start: savedStart,
          end: savedEnd,
        },
      ]);
      setOrganizerAdminId("");
      setStartDate("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign tournament.");
    }
  };

  // Calendar header
  const renderHeader = () => (
    <div className="flex justify-between items-center py-2">
      <button
        type="button"
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
      >
        ←
      </button>
      <h2 className="text-lg font-semibold">
        {format(currentMonth, "MMMM yyyy")}
      </h2>
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
      >
        →
      </button>
    </div>
  );

  // Weekday row
  const renderDays = () => {
    const days = [];
    const dateFormat = "EEE";
    let day = startOfWeek(currentMonth, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-medium">
          {format(addDays(day, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7">{days}</div>;
  };

  // Calendar cells
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDateGrid = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDateGrid;

    const statusBgMap = {
      pending:   "bg-yellow-100 border-yellow-300 text-yellow-800",
      open:      "bg-blue-100 border-blue-300 text-blue-800",
      ongoing:   "bg-green-100 border-green-300 text-green-800",
      completed: "bg-gray-200 border-gray-400 text-gray-700"
    };

    const statusLabelBgMap = {
      pending:   "bg-yellow-300 text-yellow-900",
      open:      "bg-blue-300 text-blue-900",
      ongoing:   "bg-green-300 text-green-900",
      completed: "bg-gray-400 text-gray-900"
    };

    while (day <= endDateGrid) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        cloneDay.setHours(0, 0, 0, 0);

        const match = tournaments.find(
          t => cloneDay >= t.start && cloneDay <= t.end
        );

        const isReserved = !!match;
        const isFirstDay =
          match &&
          format(cloneDay, "yyyy-MM-dd") === format(match.start, "yyyy-MM-dd");

        let bgClass = "bg-white hover:bg-gray-50";
        let borderClass = "";
        let textColor = "";

        if (isReserved) {
          const status = match.tournament_status || "pending";
          const style = statusBgMap[status] || statusBgMap.pending;
          const labelStyle = statusLabelBgMap[status] || statusLabelBgMap.pending;

          const [bg, border, text] = style.split(" ");
          bgClass = bg;
          borderClass = border;
          textColor = text;

          const [labelBg, labelText] = labelStyle.split(" ");
          match.labelBg = labelBg;
          match.labelText = labelText;
        } else if (!isSameMonth(day, monthStart)) {
          bgClass = "bg-gray-100 text-gray-400";
        }

        days.push(
          <div
            key={cloneDay}
            className={`flex flex-col h-24 border p-1 transition-all duration-200 ${bgClass} ${borderClass}`}
          >
            <div
              className={`text-right font-semibold ${
                isReserved ? textColor : ""
              }`}
            >
              {format(day, "d")}
            </div>

            {isReserved && isFirstDay && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div
                  className={`text-xs font-semibold mb-1 px-2 py-0.5 rounded ${match.labelBg} ${match.labelText}`}
                >
                  {match.organizer}
                </div>
                <span className="text-[10px] italic opacity-75">
                  {match.tournament_status}
                </span>
              </div>
            )}
          </div>
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Assign form */}
      <form
        onSubmit={handleAssign}
        className="bg-white shadow rounded p-4 mb-6"
      >
        <h2 className="text-lg font-semibold mb-4">Assign Tournament Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={organizerAdminId}
            onChange={(e) => setOrganizerAdminId(e.target.value)}
            className="border p-2 rounded w-full text-black bg-white"
            disabled={loadingTeams || teams.length === 0}
          >
            <option value="">Select Organizer Team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.team_name || team.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
            disabled={loadingTeams || teams.length === 0}
          >
            Assign
          </button>
        </div>
        {loadingTeams && <div className="text-sm text-gray-600 mt-1">Loading teams...</div>}
        {teamsError && <div className="text-sm text-red-500 mt-1">{teamsError}</div>}
        {loadingTournaments && <div className="text-sm text-gray-600 mt-1">Loading tournaments...</div>}
        {tournamentsError && <div className="text-sm text-red-500 mt-1">{tournamentsError}</div>}
        {startDate && (
          <p className="text-sm text-gray-600 mt-2">
            End Date will be:{" "}
            <strong>
              {format(addDays(new Date(startDate), 2), "dd MMM yyyy")}
            </strong>
          </p>
        )}
      </form>

      {/* Calendar */}
      <div className="bg-white shadow rounded p-4">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
