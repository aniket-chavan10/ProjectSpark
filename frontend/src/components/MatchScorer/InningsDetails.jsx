import React, { useState, useEffect } from "react";

const InningsDetails = () => {
  const [inningsData, setInningsData] = useState({
    totalRuns: 20,
    wickets: 0,
    overs: 1.3,
    crr: 13.33,
    fours: 2,
    sixes: 0,
    co: 1,
    extras: 0,
  });

  useEffect(() => {
    const socket = new WebSocket("ws://your-websocket-url"); // Replace with actual WebSocket URL

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setInningsData((prev) => ({ ...prev, ...data }));
    };

    return () => socket.close();
  }, []);

  return (
    <div className="w-full p-4 border border-gray-700 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center bg-gray-800 p-2 rounded-lg">
        Innings Details
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Section - Bigger Boxes */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Runs", value: inningsData.totalRuns },
            { label: "Wickets", value: inningsData.wickets },
            { label: "Overs", value: inningsData.overs },
          ].map((item, index) => (
            <div
              key={index}
              className="w-full bg-gray-800 text-white p-6 rounded-lg font-bold text-3xl text-center shadow-md"
            >
              {item.value}
            </div>
          ))}
        </div>

        {/* Right Section - Smaller Boxes */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "CRR", value: inningsData.crr },
            { label: "4s", value: inningsData.fours },
            { label: "6s", value: inningsData.sixes },
            { label: "CO", value: inningsData.co },
            { label: "Extras", value: inningsData.extras },
          ].map((item, index) => (
            <div
              key={index}
              className="w-full bg-gray-800 p-3 rounded-lg text-center shadow-md"
            >
              <div className="text-sm text-gray-400">{item.label}</div>
              <div className="text-lg font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InningsDetails;
