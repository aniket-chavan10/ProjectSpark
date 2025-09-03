import React, { useState, useEffect } from "react";

const BatsmanOneDetails = () => {
  const [batsmanData, setBatsmanData] = useState({
    name: "Najmul Hossain Shar",
    runs: 12,
    balls: 4,
    fours: 2,
    sixes: 0,
    sr: 300.0,
    isPlaying: false,
  });

  useEffect(() => {
    const socket = new WebSocket("wss://your-websocket-url-here");

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setBatsmanData({
          name: data.name || "Najmul Hossain Shar",
          runs: data.runs || 12,
          balls: data.balls || 4,
          fours: data.fours || 2,
          sixes: data.sixes || 0,
          sr: data.sr || 300.0,
          isPlaying: data.isPlaying !== false,
        });
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div className="w-full bg-red-800 border border-white p-4 text-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Batsman 1 Details</h2>

      <div className="flex items-center justify-between">
        {/* Playing Status & Batsman Number */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-full border border-white text-xl font-bold">
            {batsmanData.isPlaying ? "✅" : ""}
          </div>
          <div className="text-2xl font-bold text-white">1</div>
        </div>

        {/* Batsman Name */}
        <div className="bg-white text-black px-4 py-2 rounded-lg font-semibold text-center flex-1 mx-4">
          {batsmanData.name}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-5 gap-2 w-1/2">
          {["R", "B", "4s", "6s", "SR"].map((label, index) => (
            <div
              key={index}
              className="w-full bg-white text-red-800 p-2 flex flex-col items-center justify-center rounded-lg shadow-md"
            >
              <div className="text-sm font-bold">{label}</div>
              <div className="text-lg font-semibold">
                {index === 4
                  ? batsmanData.sr.toFixed(1)
                  : index === 3
                  ? batsmanData.sixes
                  : index === 2
                  ? batsmanData.fours
                  : index === 1
                  ? batsmanData.balls
                  : batsmanData.runs}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatsmanOneDetails;
