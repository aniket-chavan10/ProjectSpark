import React, { useEffect, useState } from "react";
import tournamentApi from "../../api/tournamentApi1";

export default function ApplyTournament() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    fetchOpenTournaments();
  }, []);

  // Fetch open tournaments from backend
  const fetchOpenTournaments = async () => {
    setLoading(true);
    try {
      const data = await tournamentApi.getOpenTournaments();
      // Normalize property names so backend snake_case works in frontend camelCase
      const normalized = (data || []).map((t) => ({
        ...t,
        alreadyApplied:
          t.alreadyApplied ??
          (t.already_applied === 1 || t.already_applied === true),
      }));
      setTournaments(normalized);
    } catch (err) {
      console.error("Failed to load open tournaments", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Apply button click
  const handleApply = async (tournamentId) => {
    if (!window.confirm("Are you sure you want to apply to this tournament?"))
      return;
    setApplyingId(tournamentId);

    try {
      const admin_id = localStorage.getItem("userId");
      if (!admin_id) {
        alert("User ID missing. Please log in again.");
        return;
      }
      const res = await tournamentApi.applyForTournament({
        tournament_id: tournamentId,
        team_id: admin_id,
      });

      alert(res.message || "Applied successfully!");

      // ✅ Optimistically set applied + reduce available slots locally
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === tournamentId
            ? {
                ...t,
                alreadyApplied: true,
                available_slots: t.available_slots - 1,
              }
            : t
        )
      );
    } catch (err) {
      console.error("Apply failed", err);
      alert(err.error || err.message || "Failed to apply");
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <p className="text-center mt-10 text-lg font-medium">
        Loading open tournaments...
      </p>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Open Tournaments</h1>
      {tournaments.length === 0 ? (
        <div className="bg-white shadow-lg rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No open tournaments available at this time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl">
          <table className="min-w-full text-sm text-left text-gray-800">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Banner</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Organizer</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Available Slots</th>
                <th className="px-6 py-4">Application Deadline</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => {
                const start = new Date(tournament.start_date).toLocaleDateString("en-GB");
                const end = new Date(tournament.end_date).toLocaleDateString("en-GB");
                const deadlineDate = tournament.application_deadline
                  ? new Date(tournament.application_deadline)
                  : null;
                const deadline = deadlineDate
                  ? deadlineDate.toLocaleDateString("en-GB")
                  : "N/A";

                // ✅ Calculate if deadline has passed
                const deadlinePassed =
                  deadlineDate && deadlineDate < new Date();

                return (
                  <tr
                    key={tournament.id}
                    className={`border-b transition-colors ${
                      deadlinePassed ? "bg-red-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      {tournament.banner_image ? (
                        <img
                          src={tournament.banner_image}
                          alt={tournament.name}
                          className="w-20 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-14 bg-gray-200 flex items-center justify-center text-gray-500 text-xs rounded">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {tournament.name}
                    </td>
                    <td className="px-6 py-4">{tournament.organizing_team}</td>
                    <td className="px-6 py-4">{tournament.venue}</td>
                    <td className="px-6 py-4">{start} → {end}</td>
                    <td className="px-6 py-4">{tournament.available_slots}</td>
                    <td
                      className={`px-6 py-4 ${
                        deadlinePassed ? "text-red-600 font-bold" : ""
                      }`}
                    >
                      {deadline}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {deadlinePassed ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-gray-400 cursor-not-allowed"
                        >
                          Closed
                        </button>
                      ) : tournament.alreadyApplied ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-green-500 cursor-not-allowed"
                        >
                          Applied
                        </button>
                      ) : (
                        <button
                          disabled={
                            applyingId === tournament.id ||
                            tournament.available_slots <= 0
                          }
                          onClick={() => handleApply(tournament.id)}
                          className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition ${
                            tournament.available_slots <= 0
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {applyingId === tournament.id ? "Applying..." : "Apply"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
