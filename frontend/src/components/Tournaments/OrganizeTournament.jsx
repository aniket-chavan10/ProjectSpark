import React, { useState } from "react";
import Select from "react-select"; // Import react-select

const OrganizeTournament = ({ villages, onScheduleTournament }) => {
  const [selectedVillage, setSelectedVillage] = useState(null); // Changed to store selected village as an object
  const [newTournamentDate, setNewTournamentDate] = useState("");
  const [endTournamentDate, setEndTournamentDate] = useState(""); // Added end date field
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState("pending"); // Track request status
  const [buttonText, setButtonText] = useState("Request to Schedule"); // Button text state

  // Handle the scheduling request
  const handleScheduleTournament = () => {
    if (!selectedVillage || !newTournamentDate || !endTournamentDate) {
      setError("Please select a village and set both start and end tournament dates");
      return;
    }

    setError(""); // Clear error if inputs are valid
    setButtonText("Request Sent"); // Change button text after request

    // Simulate request status change (Here, you can simulate or replace with actual API call)
    setTimeout(() => {
      const randomStatus = ["accepted", "rejected", "pending"];
      const status = randomStatus[Math.floor(Math.random() * 3)];
      setRequestStatus(status); // Set the random status after 2 seconds
    }, 2000);

    // Call the onScheduleTournament prop to send the request (can be replaced with actual API call)
    onScheduleTournament(selectedVillage.name, newTournamentDate, endTournamentDate);
  };

  // Map the villages data to the format that react-select expects
  const villageOptions = villages.map((village) => ({
    value: village.name,
    label: village.name,
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-700 mb-4">Organize Tournament</h2>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="villageSelect" className="block text-gray-700 font-medium mb-2">
          Select Team
        </label>
        <Select
          id="villageSelect"
          value={selectedVillage ? { label: selectedVillage.name, value: selectedVillage.name } : null}
          onChange={(e) => setSelectedVillage({ name: e.value })}
          options={villageOptions}
          placeholder="Search for a Team"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="tournamentDate" className="block text-gray-700 font-medium mb-2">
          Select Tournament Start Date
        </label>
        <input
          type="date"
          id="tournamentDate"
          value={newTournamentDate}
          onChange={(e) => setNewTournamentDate(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="endTournamentDate" className="block text-gray-700 font-medium mb-2">
          Select Tournament End Date
        </label>
        <input
          type="date"
          id="endTournamentDate"
          value={endTournamentDate}
          onChange={(e) => setEndTournamentDate(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleScheduleTournament}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={buttonText === "Request Sent"}
      >
        {buttonText}
      </button>

      {/* Request Status */}
      {buttonText === "Request Sent" && (
        <div className="mt-4">
          <p className="font-semibold text-gray-700">Request Status:</p>
          <p
            className={`${
              requestStatus === "accepted"
                ? "text-green-500"
                : requestStatus === "rejected"
                ? "text-red-500"
                : "text-yellow-500"
            }`}
          >
            {requestStatus.charAt(0).toUpperCase() + requestStatus.slice(1)}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrganizeTournament;
