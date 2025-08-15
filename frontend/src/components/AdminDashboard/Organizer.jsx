import React, { useState } from "react";
import tournamentApi from "../../api/tournamentApi1";

export default function OrganizerDashboard({ tournaments, onViewTeams, onRefresh }) {
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    banner: null,
    venue: "",
    mode: "create",
  });
  const [showForm, setShowForm] = useState(false);

  // Setup / Edit handlers
  const handleSetup = (t) => {
    setFormData({
      id: t.schedule_id,
      name: "",
      banner: null,
      venue: "",
      mode: "create",
    });
    setShowForm(true);
  };

  const handleEdit = (t) => {
    setFormData({
      id: t.tournament_id,
      name: t.name || "",
      banner: null,
      venue: t.venue || "",
      mode: "edit",
    });
    setShowForm(true);
  };

  // Create / update tournament
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("tournament_id", formData.id);
    payload.append("name", formData.name);
    payload.append("venue", formData.venue);
    if (formData.banner) payload.append("banner_image", formData.banner);

    try {
      if (formData.mode === "create") {
        await tournamentApi.createTournamentFromSchedule(payload);
        alert("Tournament created successfully!");
      } else {
        await tournamentApi.updateTournament(payload);
        alert("Tournament updated successfully!");
      }
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save tournament");
    }
  };

  // Empty state
  if (!tournaments || tournaments.length === 0) {
    return <p className="text-center text-gray-500">No tournaments assigned.</p>;
  }

  // Render list of tournaments
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">Your Tournaments</h2>
      <div className="space-y-6">
        {tournaments.map((t) => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          return (
            <div key={t.schedule_id} className="bg-white p-6 rounded-lg shadow flex justify-between">
              <div>
                <h3 className="text-lg font-bold">{t.name || "(Not Set Yet)"}</h3>
                <p>{start.toLocaleDateString()} → {end.toLocaleDateString()}</p>
                <span
                  className={`px-2 py-1 rounded text-white ${
                    t.schedule_status === "pending" ? "bg-yellow-500" : "bg-green-600"
                  }`}
                >
                  {t.schedule_status}
                </span>
              </div>
              <div className="flex gap-3">
                {t.schedule_status === "pending" ? (
                  <button onClick={() => handleSetup(t)} className="bg-green-600 px-4 py-2 text-white rounded">
                    Setup
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleEdit(t)} className="bg-blue-600 px-4 py-2 text-white rounded">
                      Edit
                    </button>
                    <button onClick={() => onViewTeams(t.tournament_id)} className="bg-purple-600 px-4 py-2 text-white rounded">
                      View Teams
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tournament form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white p-6 rounded max-w-lg w-full space-y-4"
          >
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Name"
              required
              className="border p-2 w-full"
            />
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="Venue"
              required
              className="border p-2 w-full"
            />
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, banner: e.target.files[0] })}
              className="w-full"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                {formData.mode === "create" ? "Save & Open" : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
