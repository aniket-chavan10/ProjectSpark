import axiosInstance from "./axiosConfig";

const tournamentApi = {
  // Add a new tournament (Master Admin only)
  addTournament: async (tournamentData) => {
    try {
      const response = await axiosInstance.post("/tournaments/add", tournamentData);
      console.log("API Response (Add Tournament):", response);
      return response;
    } catch (error) {
      console.error("Error during add tournament request:", error);
      throw error;
    }
  },

  // Get all tournaments
  getAllTournaments: async () => {
    try {
      const response = await axiosInstance.get("/tournaments/all");
      console.log("API Response (Get All Tournaments):", response);
      return response;
    } catch (error) {
      console.error("Error during get all tournaments request:", error);
      throw error;
    }
  },

  // Get a specific tournament by ID
  getTournamentById: async (id) => {
    try {
      const response = await axiosInstance.get(`/tournaments/${id}`);
      console.log("API Response (Get Tournament By ID):", response);
      return response;
    } catch (error) {
      console.error("Error during get tournament by ID request:", error);
      throw error;
    }
  },

  // Update a tournament (Organizer Admin)
  updateTournament: async (id, tournamentData) => {
    try {
      const response = await axiosInstance.put(`/tournaments/update/${id}`, tournamentData);
      console.log("API Response (Update Tournament):", response);
      return response;
    } catch (error) {
      console.error("Error during update tournament request:", error);
      throw error;
    }
  },

  // Delete a tournament
  deleteTournament: async (id) => {
    try {
      const response = await axiosInstance.delete(`/tournaments/delete/${id}`);
      console.log("API Response (Delete Tournament):", response);
      return response;
    } catch (error) {
      console.error("Error during delete tournament request:", error);
      throw error;
    }
  },
};

export default tournamentApi;
