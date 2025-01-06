import React, { useEffect, useState } from "react";
import tournamentApi from "../../api/tournamentApi";

const Organizer = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    banner: null,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const fetchedTournaments = await tournamentApi.getAssignedTournaments();
        setTournaments(fetchedTournaments || []);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      }
    };

    fetchTournaments();
  }, []);

  // Open Form with Existing Data
  const openForm = (tournament) => {
    setSelectedTournament(tournament);
    setFormData({
      name: tournament.name || "",
      banner: null, // Banner is not pre-filled
    });
    setIsFormOpen(true);
  };

  // Handle Form Input Change
  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "banner") {
      setFormData({ ...formData, banner: files[0] }); // Handle file input
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Submit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    if (!selectedTournament) return;
  
    if (!formData.name || !formData.banner) {
      setError("Both name and banner are required.");
      return;
    }
  
    const updatedData = new FormData();
    updatedData.append("name", formData.name);
    
    // Log to check the banner
    console.log("Form Data:", formData);
  
    if (formData.banner) {
      updatedData.append("banner", formData.banner);
    }
  
    try {
      const response = await tournamentApi.tournamentOrganizer(updatedData);
  
      setTournaments((prevTournaments) =>
        prevTournaments.map((tournament) =>
          tournament.id === selectedTournament.id
            ? { ...tournament, ...response.data }
            : tournament
        )
      );
  
      setIsFormOpen(false);
      setError("");
    } catch (error) {
      console.error("Error updating tournament:", error);
      setError("Failed to update the tournament. Please try again.");
    }
  };
  
  // Send Invitations
  const handleSendInvitations = async (tournament) => {
    if (!tournament.name || !tournament.banner) {
      setError("Please update the tournament details before sending invitations.");
      return;
    }

    try {
      const response = await tournamentApi.sendTournamentInvitations(tournament.id);
      console.log("Invitation Response:", response.data);
      alert(`Invitations sent for ${tournament.name}`);
    } catch (error) {
      console.error("Error sending invitations:", error);
      setError("Failed to send invitations. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Assigned Tournaments</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {tournaments?.length > 0 ? (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white p-4 rounded-lg shadow-md border hover:shadow-lg transition"
            >
              <p className="text-gray-600">
                <strong>Organizing Team:</strong> {tournament.organizing_team}
              </p>
              <p className="text-gray-600">
                <strong>Start Date:</strong> {new Date(tournament.start_date).toLocaleString()}
              </p>
              <p className="text-gray-600">
                <strong>End Date:</strong> {new Date(tournament.end_date).toLocaleString()}
              </p>
              <p className="text-gray-600">
                <strong>Status:</strong> {tournament.status}
              </p>
              <div className="flex justify-between items-center mt-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => openForm(tournament)}
                >
                  Update Details
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  onClick={() => handleSendInvitations(tournament)}
                >
                  Send Invitations
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-3 text-gray-500">No tournaments assigned.</p>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Update Tournament</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Tournament Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="Enter tournament name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Banner Image</label>
                <input
                  type="file"
                  name="banner"
                  accept="image/*"
                  onChange={handleFormChange}
                  className="w-full mt-1"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizer;
