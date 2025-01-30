import React from "react";
const Alerts = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold">Upcoming Matches</h2>
        {/* Display alerts, messages, or notifications */}
        <ul className="mt-2 space-y-2">
          <li className="flex justify-between items-center">
            <span>Match 1: Team A vs Team B</span>
            <span className="text-gray-500">Date: 2024-12-28</span>
          </li>
          <li className="flex justify-between items-center">
            <span>Match 2: Team C vs Team D</span>
            <span className="text-gray-500">Date: 2024-12-30</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Alerts;
