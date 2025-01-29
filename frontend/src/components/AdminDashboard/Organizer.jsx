import React, { useContext, useEffect, useState } from "react";
import { TournamentContext } from "../../contexts/TournamentContext";
import tournamentApi from "../../api/tournamentApi";
import adminApi from "../../api/adminApi";
import ShowAppliedTeams from "../AdminDashboard/ShowAppliedTeams";
import GroupTeams from "../AdminDashboard/GroupTeams";
import ScheduleFirstRound from "../AdminDashboard/ScheduleFirstRound";
import MatchDateTime from "../AdminDashboard/MatchDateTime";
import ShowMatchSequence from "../AdminDashboard/ShowMatchSeuquence";

const Organizer = () => {
  const { tournamentId, setTournamentId } = useContext(TournamentContext);
  console.log("Tournament ID from context:", tournamentId); // Log the tournament ID from context

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", banner: null });
  const [error, setError] = useState("");
  const [viewTeamsTournamentId, setViewTeamsTournamentId] = useState(null);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const fetchedTournaments = await tournamentApi.getAssignedTournaments();
        setTournaments(fetchedTournaments.tournaments || []);

        if (!selectedTournament && fetchedTournaments.tournaments.length > 0) {
          setSelectedTournament(fetchedTournaments.tournaments[0]);
          setTournamentId(fetchedTournaments.tournaments[0].tournamentId);
          setActiveStep(fetchedTournaments.tournaments[0].current_step || 1);
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setError("Failed to fetch tournaments. Please try again later.");
      }
    };

    fetchTournaments();
  }, []);

  const openForm = (tournament) => {
    if (!tournament) {
      console.error("No tournament selected");
      return;
    }

    handleTournamentSelection(tournament);
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "banner") {
      setFormData({ ...formData, banner: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTournament) return;

    if (!formData.name || !formData.banner) {
      setError("Both tournament name and banner are required.");
      return;
    }

    const updatedData = new FormData();
    updatedData.append("name", formData.name);
    updatedData.append("banner", formData.banner);

    try {
      const response = await tournamentApi.tournamentOrganizer(updatedData);

      setTournaments((prevTournaments) =>
        prevTournaments.map((tournament) =>
          tournament.tournamentId === selectedTournament.tournamentId
            ? {
                ...tournament,
                ...response.updatedFields,
                invitationsSent: true, // Ensure invitationsSent is updated
                current_step: 1, // Ensure step is updated
              }
            : tournament
        )
      );

      // Update selectedTournament and tournamentId state
      setSelectedTournament((prev) => ({
        ...prev,
        invitationsSent: true,
        current_step: 1,
      }));

      setTournamentId(selectedTournament.tournamentId);
      setIsFormOpen(false);
      setError("");
    } catch (error) {
      console.error("Error updating tournament:", error);
      setError("Failed to update tournament details. Please try again.");
    }
  };

  const handleSendInvitations = async (tournament) => {
    if (!tournament.name || !tournament.banner) {
      setError(
        "Please update the tournament details before sending invitations."
      );
      return;
    }

    try {
      const updatedData = new FormData();
      updatedData.append("name", tournament.name);
      updatedData.append("banner", tournament.banner);

      const response = await tournamentApi.tournamentOrganizer(updatedData);

      setTournaments((prevTournaments) =>
        prevTournaments.map((t) =>
          t.tournamentId === tournament.tournamentId
            ? { ...t, ...response.updatedFields, invitationsSent: true }
            : t
        )
      );

      alert(`Invitations sent for ${tournament.name}`);
    } catch (error) {
      console.error("Error sending invitations:", error);
      setError("Failed to send invitations. Please try again later.");
    }
  };

  const handleTournamentSelection = (tournament) => {
    if (!tournament) return;
    setSelectedTournament(tournament);
    setTournamentId(tournament.tournamentId);
    setActiveStep(tournament.current_step || 1);
  };

  const viewAppliedTeams = () => {
    if (!selectedTournament) {
      setError("No tournament selected. Please select a tournament.");
      return;
    }
    setViewTeamsTournamentId(selectedTournament.tournamentId);
    setActiveStep(2);
    updateTournamentStep(selectedTournament.tournamentId, 2);
  };

  const goToGroupTeams = () => {
    setActiveStep(3);
    updateTournamentStep(selectedTournament.tournamentId, 3);
  };

  const goToScheduleFirstRound = () => {
    setActiveStep(4);
    updateTournamentStep(selectedTournament.tournamentId, 4);
  };

  const goToMatchDateTime = () => {
    console.log("Going to Match DateTime step");
    setActiveStep(5);
    updateTournamentStep(selectedTournament.tournamentId, 5);
  };

  const goToShowMatchSequence = () => {
    setActiveStep(6);
    updateTournamentStep(selectedTournament.tournamentId, 6);
  };

  const updateTournamentStep = async (tournamentId, currentStep) => {
    try {
      await adminApi.updateTournamentStep(tournamentId, currentStep);
    } catch (error) {
      console.error("Error updating tournament step:", error);
      setError("Failed to update tournament step. Please try again later.");
    }
  };

  useEffect(() => {
    console.log("Updated Tournament ID from context:", tournamentId); // This should log each time tournamentId is updated
  }, [tournamentId]); // Dependency array ensures this runs when tournamentId changes

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Assigned Tournaments</h2>
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {activeStep === 1 && ( // Ensure "Continue" is shown only at step 1
          <>
            {selectedTournament?.current_step === 1 &&
            !selectedTournament?.invitationsSent ? (
              <>
                {selectedTournament && (
                  <div className="mb-4 p-4 bg-white shadow-md rounded-lg">
                    <p>
                      <strong>Start Date:</strong>{" "}
                      {new Date(
                        selectedTournament.startDate
                      ).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>End Date:</strong>{" "}
                      {new Date(
                        selectedTournament.endDate
                      ).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Organizing Team:</strong>{" "}
                      {selectedTournament.organizingTeam}
                    </p>
                    <p>
                      <strong>Status:</strong> {selectedTournament.status}
                    </p>
                  </div>
                )}
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => openForm(selectedTournament)}
                >
                  Update Details
                </button>
                <button
                  className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                  onClick={() => handleSendInvitations(selectedTournament)}
                  disabled={
                    !selectedTournament.name || !selectedTournament.banner
                  }
                >
                  Send Invitations
                </button>
              </>
            ) : (
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                onClick={viewAppliedTeams}
              >
                Continue
              </button>
            )}
          </>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Update Tournament</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Tournament Name
                </label>
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
                <label className="block text-sm font-medium">
                  Banner Image
                </label>
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

      {activeStep === 2 && (
        <ShowAppliedTeams
          onSave={goToGroupTeams}
          updateTournamentStep={updateTournamentStep}
        />
      )}
      {activeStep === 3 && selectedTournament && (
        <GroupTeams
          tournamentId={selectedTournament.tournamentId}
          onSave={goToScheduleFirstRound}
          updateTournamentStep={updateTournamentStep}
        />
      )}
      {activeStep === 4 && selectedTournament && (
        <ScheduleFirstRound
          tournamentId={selectedTournament.tournamentId}
          onSave={goToMatchDateTime}
          updateTournamentStep={updateTournamentStep}
        />
      )}

      {activeStep === 5 && selectedTournament && (
        <MatchDateTime
          tournamentId={selectedTournament.tournamentId}
          updateTournamentStep={updateTournamentStep}
        />
      )}

      {activeStep === 6 && selectedTournament && (
        <>
          {console.log(
            "Rendering ShowMatchSequence with ID:",
            selectedTournament.tournamentId
          )}
          <ShowMatchSequence tournamentId={selectedTournament.tournamentId} />
        </>
      )}
    </div>
  );
};

export default Organizer;
