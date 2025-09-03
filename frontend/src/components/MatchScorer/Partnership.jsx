import React, { useState, useEffect } from "react";

const Partnership = () => {
  const [partnership, setPartnership] = useState({
    numbers: [10, 20, 15, 5, 18, 25, 30, 12, 7, 14], // Sample data
    total: 123,
    currentIndex: 9, // Assume last pair is the current partnership
  });

  useEffect(() => {
    const socket = new WebSocket("wss://your-websocket-url-here");

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPartnership({
          numbers: data.numbers || [10, 20, 15, 5, 18, 25, 30, 12, 7, 14],
          total: data.total || 123,
          currentIndex: data.currentIndex || data.numbers.length - 1, // Highlight last pair
        });
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div className="w-full p-4 border border-gray-700 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center bg-gray-800 p-2 rounded-lg">
        Partnership
      </h2>

      {/* Scrollable Partnership Numbers (Slim & Compact Scrollbar) */}
      <div className="flex items-center justify-between">
        <div className="flex overflow-x-auto gap-2 py-2 px-1 w-full custom-scrollbar">
          {partnership.numbers.map((num, index) => (
            <div
              key={index}
              className={`px-4 py-3 rounded-lg text-lg font-semibold shadow-md min-w-[60px] text-center ${
                index === partnership.currentIndex
                  ? "bg-yellow-500 text-black" // Highlight current partnership
                  : "bg-gray-800 text-white"
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        {/* Total Runs - Fixed Position */}
        <div className="ml-4 bg-blue-600 text-white px-6 py-3 rounded-lg text-2xl font-bold shadow-md whitespace-nowrap">
          {partnership.total}
        </div>
      </div>
    </div>
  );
};

export default Partnership;
