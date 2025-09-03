import React, { useState } from "react";
import { FaSync, FaExchangeAlt, FaFlagCheckered, FaQuestionCircle } from "react-icons/fa";

const ControlButtons = () => {
  const [isOnTop, setIsOnTop] = useState(false);

  return (
    <div className="w-full p-4 bg-white shadow-lg rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Match Controls</h3>

      {/* Buttons */}
      <button className="flex items-center justify-center w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition">
        <FaSync className="mr-2" /> Update
      </button>

      <button className="flex items-center justify-center w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition mt-2">
        <FaExchangeAlt className="mr-2" /> Switch Innings
      </button>

      <button className="flex items-center justify-center w-full bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition mt-2">
        <FaFlagCheckered className="mr-2" /> End Innings
      </button>

      <button className="flex items-center justify-center w-full bg-yellow-500 text-white font-semibold py-2 rounded-lg hover:bg-yellow-600 transition mt-2">
        <FaQuestionCircle className="mr-2" /> Tutorial
      </button>

      {/* Toggle Switch */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-gray-700 font-medium">On Top</span>
        <div
          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
            isOnTop ? "bg-blue-500" : "bg-gray-300"
          }`}
          onClick={() => setIsOnTop(!isOnTop)}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition ${
              isOnTop ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default ControlButtons;
