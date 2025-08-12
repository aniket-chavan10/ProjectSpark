import React, { useState, useEffect } from "react";

const WicketDetails = () => {
  const [outPlayer, setOutPlayer] = useState("");
  const [fielderName, setFielderName] = useState("");
  const [wicketTaker, setWicketTaker] = useState("");
  const [run, setRun] = useState("");
  const [bowl, setBowl] = useState("");
  const [fielderOptions, setFielderOptions] = useState(["Fielder 1", "Fielder 2"]);

  useEffect(() => {
    const socket = new WebSocket("wss://your-websocket-url-here");

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setOutPlayer(data.outPlayer || "");
        setFielderName(data.fielderName || "");
        setWicketTaker(data.wicketTaker || "");
        setRun(data.run || "");
        setBowl(data.bowl || "");
        setFielderOptions(data.fielderOptions || fielderOptions);
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div className="w-full p-4 border border-gray-700 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center bg-gray-800 p-2 rounded-lg">
        Wicket Details
      </h2>

      <div className="grid grid-cols-6 gap-2">
        <input
          type="text"
          className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none"
          placeholder="Out Player"
          value={outPlayer}
          onChange={(e) => setOutPlayer(e.target.value)}
        />
        <select
          className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none"
          value={fielderName}
          onChange={(e) => setFielderName(e.target.value)}
        >
          <option value="">Select Fielder</option>
          {fielderOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none"
          placeholder="Wicket Taker"
          value={wicketTaker}
          onChange={(e) => setWicketTaker(e.target.value)}
        />
        <input
          type="number"
          className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none"
          placeholder="Run"
          value={run}
          onChange={(e) => setRun(e.target.value)}
        />
        <input
          type="number"
          className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none"
          placeholder="Bowl"
          value={bowl}
          onChange={(e) => setBowl(e.target.value)}
        />
        <button
          className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition"
          onClick={() => console.log("Set button clicked")}
        >
          Set
        </button>
      </div>
    </div>
  );
};

export default WicketDetails;
