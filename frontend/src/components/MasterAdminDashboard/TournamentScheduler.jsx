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
import tournamentApi from "../../api/tournamentApi1";

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

  // Handle date click
  const handleDateClick = (selectedDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate >= today) {
      setStartDate(format(selectedDate, "yyyy-MM-dd"));
    }
  };

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
    <div className="flex justify-between items-center py-4 px-4">
      <button
        type="button"
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        className="group p-2 bg-white border border-gray-300 hover:border-blue-400 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
      </div>
      
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="group p-2 bg-white border border-gray-300 hover:border-blue-400 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
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
        <div key={i} className="text-center font-semibold text-gray-700 py-2 bg-gray-50 text-sm">
          {format(addDays(day, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-gray-200">{days}</div>;
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
      pending: "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200",
      open: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
      ongoing: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
      completed: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
    };

    const statusLabelMap = {
      pending: "bg-amber-500 text-white",
      open: "bg-blue-500 text-white",
      ongoing: "bg-emerald-500 text-white",
      completed: "bg-gray-500 text-white"
    };

    const statusIconMap = {
      pending: "⏳",
      open: "🎯",
      ongoing: "🚀",
      completed: "✅"
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

        const isSelected = startDate && format(cloneDay, "yyyy-MM-dd") === startDate;
        const isToday = format(cloneDay, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
        const isPastDate = cloneDay < today;
        const isClickable = cloneDay >= today && !isReserved;

        let bgClass = "bg-white hover:bg-blue-50";
        let borderClass = "border-gray-200";
        let textColor = "text-gray-900";
        let cursorClass = "cursor-pointer";

        if (isPastDate) {
          bgClass = "bg-gray-50 text-gray-400";
          textColor = "text-gray-400";
          cursorClass = "cursor-not-allowed";
        } else if (isSelected) {
          bgClass = "bg-blue-500 text-white";
          borderClass = "border-blue-500";
          textColor = "text-white";
        } else if (isReserved) {
          const status = match.tournament_status || "pending";
          bgClass = statusBgMap[status] || statusBgMap.pending;
          borderClass = "border-2";
          cursorClass = "cursor-not-allowed";
          match.labelStyle = statusLabelMap[status] || statusLabelMap.pending;
          match.icon = statusIconMap[status] || statusIconMap.pending;
        } else if (!isSameMonth(day, monthStart)) {
          bgClass = "bg-gray-50 text-gray-400";
          textColor = "text-gray-400";
          cursorClass = "cursor-not-allowed";
        }

        days.push(
          <div
            key={cloneDay}
            onClick={() => isClickable && handleDateClick(cloneDay)}
            className={`flex flex-col h-16 border transition-all duration-200 hover:shadow-sm ${bgClass} ${borderClass} ${cursorClass} ${
              isToday ? "ring-2 ring-blue-400 ring-opacity-50" : ""
            }`}
          >
            <div className={`text-center p-1 font-bold text-sm ${isSelected ? "text-white" : textColor}`}>
              {format(day, "d")}
              {isToday && !isSelected && (
                <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div>
              )}
            </div>

            {isReserved && isFirstDay && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-1 pb-1">
                <div className={`text-[10px] font-bold px-1 py-0.5 rounded shadow-sm ${match.labelStyle} flex items-center space-x-1`}>
                  <span className="text-[8px]">{match.icon}</span>
                  <span className="truncate max-w-12">{match.organizer.substring(0, 6)}...</span>
                </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏆 Tournament Scheduler
          </h1>
          <p className="text-gray-600">
            Plan and organize tournament dates with an intuitive calendar interface
          </p>
        </div>

        {/* Assignment Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign Tournament Dates</h2>
              <p className="text-gray-600 text-sm">Select organizer team and click a date on the calendar</p>
            </div>
          </div>

          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Organizer Selection */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Organizer Team
                </label>
                <div className="relative">
                  <select
                    value={organizerAdminId}
                    onChange={(e) => setOrganizerAdminId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 appearance-none cursor-pointer transition-all duration-200"
                    disabled={loadingTeams || teams.length === 0}
                  >
                    <option value="">Choose organizer team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.team_name || team.name}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* Assign Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={loadingTeams || teams.length === 0 || !organizerAdminId || !startDate}
                >
                  {loadingTeams ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span>Assign</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {(teamsError || tournamentsError || startDate) && (
              <div className="space-y-2 text-sm">
                {teamsError && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{teamsError}</span>
                  </div>
                )}
                {startDate && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Tournament will end on: <strong>{format(addDays(new Date(startDate), 2), "dd MMM yyyy")}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Compact Calendar */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {renderHeader()}
          <div className="border-t border-gray-200">
            {renderDays()}
            {renderCells()}
          </div>
          
          {/* Compact Legend */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span>⏳ Pending</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>🎯 Open</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span>🚀 Ongoing</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span>✅ Completed</span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              💡 Click on available dates to select them
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
