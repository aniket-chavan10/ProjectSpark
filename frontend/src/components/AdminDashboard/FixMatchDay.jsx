import React, { useState, useEffect } from "react";

const FixMatchDay = () => {
  const firstRoundMatches = Array.from({ length: 16 }, (_, index) => ({
    id: index + 1,
    name: `Team ${index + 1} vs Team ${index + 2}`,
    group: `Group ${String.fromCharCode(65 + (index % 4))}`, // Groups A-D
  }));

  const semiFinals = [
    { id: 17, name: "Winner Group A vs Runner-Up Group B", group: "Semi-Finals" },
    { id: 18, name: "Winner Group C vs Runner-Up Group D", group: "Semi-Finals" },
  ];

  const final = { id: 19, name: "Semi-Final 1 Winner vs Semi-Final 2 Winner", group: "Finals" };

  const allMatches = [...firstRoundMatches, ...semiFinals, final];

  const [dayAssignments, setDayAssignments] = useState({
    day1: [],
    day2: [],
    day3: [],
  });

  const [dates, setDates] = useState({
    day1: "",
    day2: "",
    day3: "",
  });

  const [times, setTimes] = useState({}); // Track match times

  useEffect(() => {
    // Pre-fill matches across days
    const day1Matches = firstRoundMatches.slice(0, 6);
    const day2Matches = firstRoundMatches.slice(6, 12);
    const day3Matches = [...firstRoundMatches.slice(12), ...semiFinals, final];
    setDayAssignments({
      day1: day1Matches,
      day2: day2Matches,
      day3: day3Matches,
    });
  }, []);

  const handleDateChange = (day, value) => {
    setDates((prev) => ({
      ...prev,
      [day]: value,
    }));
  };

  const handleTimeChange = (matchId, time) => {
    setTimes((prev) => ({
      ...prev,
      [matchId]: time,
    }));
  };

  const handleSave = () => {
    console.log("Day Assignments Saved:", dayAssignments, dates, times);
    alert("Matches successfully scheduled across days!");
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        Schedule Matches Across Days
      </h1>

      {/* Date Input for Days */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {["day1", "day2", "day3"].map((day, index) => (
          <div key={day} className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{`Day ${index + 1}`}</h2>
            <label className="block text-sm font-medium text-gray-700">Date:</label>
            <input
              type="date"
              value={dates[day]}
              onChange={(e) => handleDateChange(day, e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
        ))}
      </div>

      {/* Assigned Matches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {["day1", "day2", "day3"].map((day, index) => (
          <div key={day} className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{`Day ${index + 1} Matches`}</h2>
            <div className="space-y-4">
              {dayAssignments[day].map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-md"
                >
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white text-sm rounded-full">
                      {match.id}
                    </span>
                    <div>
                      <h3 className="text-gray-700 font-semibold">{match.name}</h3>
                      <p className="text-xs text-gray-500">{match.group}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Set Time:</label>
                    <input
                      type="time"
                      value={times[match.id] || ""}
                      onChange={(e) => handleTimeChange(match.id, e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-8">
        <button
          onClick={handleSave}
          className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save Day Assignments
        </button>
      </div>
    </div>
  );
};

export default FixMatchDay;
