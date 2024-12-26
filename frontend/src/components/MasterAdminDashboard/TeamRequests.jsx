import React, { useState, useEffect } from "react";
import masterAdminApi from "../../api/masterAdminApi"; // Import the frontend API service

const TeamRequests = () => {
  const [teamRequests, setTeamRequests] = useState([]); // Store team requests
  const [activeTab, setActiveTab] = useState("pending"); // Active tab: pending, approved, rejected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch team requests on component mount
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const response = await masterAdminApi.getAllVillages();
        setTeamRequests(response.data); // Set fetched data to state
      } catch (err) {
        setError("Failed to fetch team requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Handle status update
  const handleStatusChange = async (id, status) => {
    try {
      await masterAdminApi.updateVillageStatus(id, { status }); // Call API to update status
      // Update the local state to reflect the change
      setTeamRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === id ? { ...request, status } : request
        )
      );
    } catch (err) {
      setError("Failed to update the status");
    }
  };

  // Filter requests based on the active tab
  const filteredRequests = teamRequests.filter(
    (request) => request.status === activeTab
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Team Requests</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-4">
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              activeTab === tab
                ? "border-b-4 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Requests
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <p className="text-gray-600">Loading requests...</p>
      ) : (
        // Table
        <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
          {filteredRequests.length > 0 ? (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-200 text-sm">
                  <th className="px-4 py-2 text-gray-800">#</th>
                  <th className="px-4 py-2 text-gray-800">Village</th>
                  <th className="px-4 py-2 text-gray-800">Team Name</th>
                  <th className="px-4 py-2 text-gray-800">Admin Name</th>
                  <th className="px-4 py-2 text-gray-800">Email</th>
                  <th className="px-4 py-2 text-gray-800">Phone</th>
                  <th className="px-4 py-2 text-gray-800">Request Date</th>
                  {activeTab === "pending" && (
                    <th className="px-4 py-2 text-gray-800">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, index) => (
                  <tr
                    key={request.id}
                    className={`border-b ${
                      index % 2 === 0 ? "bg-gray-100" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-2 text-center">{index + 1}</td>
                    <td className="px-4 py-2">{request.village_name}</td>
                    <td className="px-4 py-2">{request.team_name}</td>
                    <td className="px-4 py-2">{request.admin_name}</td>
                    <td className="px-4 py-2">{request.email_address}</td>
                    <td className="px-4 py-2">{request.phone_number}</td>
                    <td className="px-4 py-2">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "approved")
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "rejected")
                          }
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">
              No {activeTab} requests at the moment.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamRequests;
