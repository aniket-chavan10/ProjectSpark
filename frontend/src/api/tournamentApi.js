import axiosInstance from './axiosConfig'; // Assuming you have an axios instance configured

// Helper function to get Admin ID from the token
const getAdminIdFromToken = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
      console.log('Decoded Token:', decoded); // Debugging
      return decoded.id || null; // Return `id` for admin ID
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }
  return null;
};


// Define the tournamentApi object
const tournamentApi = {
  // Add a new tournament
  addTournament: (tournamentData) => axiosInstance.post('master-admin/tournament/add', tournamentData),

  // Get all tournaments
  getAllTournaments: () => axiosInstance.get('/tournaments'),

  // Get a tournament by ID
  getTournamentById: (id) => axiosInstance.get(`/tournaments/${id}`),

  // Update tournament details
  tournamentOrganizer: async (updatedData) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Making API call to /tournaments/update-details");
      console.log("Token:", token);
  
      const response = await axiosInstance.put(`/admin/tournaments/update-details`, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`, // Pass token explicitly
        },
      });
  
      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error updating tournament:", error.response || error.message);
      throw error;
    }
  },
  

  // Delete a tournament
  deleteTournament: (id) => axiosInstance.delete(`/tournaments/${id}`),

  // Get assigned tournaments for a specific admin
  getAssignedTournaments: async () => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Making API call to /admin/tournaments/assigned");
      console.log("Token:", token);
  
      const response = await axiosInstance.get(`/admin/tournaments/assigned`, {
        headers: {
          Authorization: `Bearer ${token}`, // Pass token explicitly
        },
      });
      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching assigned tournaments:", error.response || error.message);
      return [];
    }
  },
  
  
  
};

export default tournamentApi;
