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

  const moveMatchToDay = (match, targetDay) => {
    if (match.id === final.id || semiFinals.some((sf) => sf.id === match.id)) {
      alert("Semi-finals and Final cannot be moved from Day 3.");
      return;
    }

    setDayAssignments((prev) => {
      const updatedAssignments = {
        ...prev,
        day1: prev.day1.filter((m) => m.id !== match.id),
        day2: prev.day2.filter((m) => m.id !== match.id),
        day3: prev.day3.filter((m) => m.id !== match.id),
      };
      updatedAssignments[targetDay] = [...updatedAssignments[targetDay], match];
      return updatedAssignments;
    });
  };

  const moveMatchUpOrDown = (day, match, direction) => {
    setDayAssignments((prev) => {
      const dayMatches = [...prev[day]];
      const index = dayMatches.findIndex((m) => m.id === match.id);

      if ((direction === "up" && index > 0) || (direction === "down" && index < dayMatches.length - 1)) {
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        [dayMatches[index], dayMatches[swapIndex]] = [dayMatches[swapIndex], dayMatches[index]];
      }

      return {
        ...prev,
        [day]: dayMatches,
      };
    });
  };

  const handleSave = () => {
    console.log("Day Assignments Saved:", dayAssignments, dates);
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {`Day ${index + 1} Matches`}
            </h2>
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-1">Match No.</th>
                  <th className="border border-gray-300 px-2 py-1 w-1/2">Match Name</th>
                  <th className="border border-gray-300 px-2 py-1">Group</th>
                  <th className="border border-gray-300 px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dayAssignments[day].map((match) => (
                  <tr key={match.id}>
                    <td className="border border-gray-300 px-2 py-1">{match.id}</td>
                    <td className="border border-gray-300 px-2 py-1">{match.name}</td>
                    <td className="border border-gray-300 px-2 py-1">{match.group}</td>
                    <td className="border border-gray-300 px-2 py-1">
                      <select
                        defaultValue=""
                        onChange={(e) => moveMatchToDay(match, e.target.value)}
                        className="mr-2 border-gray-300 rounded-md shadow-sm"
                      >
                        <option value="" disabled>
                          Move to
                        </option>
                        <option value="day1">Day 1</option>
                        <option value="day2">Day 2</option>
                        <option value="day3">Day 3</option>
                      </select>
                      <button
                        onClick={() => moveMatchUpOrDown(day, match, "up")}
                        className="mr-2 py-1 px-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveMatchUpOrDown(day, match, "down")}
                        className="py-1 px-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
