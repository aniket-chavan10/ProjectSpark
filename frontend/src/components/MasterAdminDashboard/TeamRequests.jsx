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
    <div>
      <h1 className="text-2xl font-bold mb-6">Team Requests</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-4">
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Requests
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Loading state */}
      {loading ? (
        <p className="text-gray-600">Loading requests...</p>
      ) : (
        // Table
        <div className="bg-white p-4 rounded-lg shadow">
          {filteredRequests.length > 0 ? (
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">#</th>
                  <th className="border border-gray-300 px-4 py-2">Village</th>
                  <th className="border border-gray-300 px-4 py-2">Team Name</th>
                  <th className="border border-gray-300 px-4 py-2">Admin Name</th>
                  <th className="border border-gray-300 px-4 py-2">Email</th>
                  <th className="border border-gray-300 px-4 py-2">Phone</th>
                  <th className="border border-gray-300 px-4 py-2">Request Date</th>
                  {activeTab === "pending" && (
                    <th className="border border-gray-300 px-4 py-2">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {request.village_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {request.team_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {request.admin_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {request.email_address}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {request.phone_number}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    {activeTab === "pending" && (
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "approved")
                          }
                          className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "rejected")
                          }
                          className="bg-red-500 text-white px-3 py-1 rounded"
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
