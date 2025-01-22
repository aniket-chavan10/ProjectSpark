import axiosInstance from "./axiosConfig";

const adminApi = {
  // Admin login
  loginAdmin: async (loginData) => {
    try {
      const response = await axiosInstance.post("/admin/login", loginData);
      console.log("API Response:", response); // Log the response from the backend

      // Check if the response contains a token (assuming it's in response.data.token)
      if (response.data && response.data.token) {
        // Save the token to local storage
        localStorage.setItem("authToken", response.data.token);
        console.log("Token saved to local storage.");
      }

      return response;
    } catch (error) {
      console.error("Error during login request:", error);
      throw error; // Rethrow the error so it can be handled in the component
    }
  },

  getAdminData: async () => {
    try {
      const token = localStorage.getItem("authToken"); // Retrieve the token from localStorage
      console.log("Making API call to /admin/profile");
      console.log("Token:", token);

      const response = await axiosInstance.get("/admin/profile", {
        headers: {
          Authorization: `Bearer ${token}`, // Pass the token explicitly
        },
      });

      console.log("API Response:", response.data);
      return response.data; // Return the admin data retrieved from the API
    } catch (error) {
      console.error(
        "Error fetching admin data:",
        error.response || error.message
      );
      throw error; // Rethrow the error for the calling function to handle
    }
  },

  // Update team logo
  updateTeamLogo: (logoFile, token) => {
    const formData = new FormData();
    formData.append("logo", logoFile);

    return axiosInstance.put("/admin/teams/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getPlayersByTeam: async () => {
    try {
      const token = localStorage.getItem("authToken"); // Retrieve the token
      console.log("Making API call to /admin/players-by-team");
      console.log("Token:", token);

      const response = await axiosInstance.get("/admin/players", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response.data);
      return response.data.players; // Return the players array from the API response
    } catch (error) {
      console.error(
        "Error fetching players by team:",
        error.response || error.message
      );
      throw error; // Rethrow the error
    }
  },

  getAppliedTeams: async (tournamentId) => {
    try {
      const token = localStorage.getItem("authToken"); // Retrieve the token
      console.log("Making API call to fetch applied teams.");
      console.log("Token:", token);

      // Make an API request to the backend
      const response = await axiosInstance.get(
        `/admin/tournaments/7/invitations/apply/teams`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Include the authorization token
          },
        }
      );

      console.log("API Response:", response.data);
      return response.data.teams; // Return the applied teams array from the API response
    } catch (error) {
      console.error(
        "Error fetching applied teams:",
        error.response || error.message
      );
      throw error; // Rethrow the error for further handling
    }
  },

  assignGroupsToTeams: async (payload) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Making API call to assign groups to teams.");
      console.log("Payload:", JSON.stringify(payload, null, 2));

      // Make an API request to the backend
      const response = await axiosInstance.put(
        `/admin/tournaments/organize/teams/group`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error assigning groups to teams:",
        error.response || error.message
      );
      throw error;
    }
  },

  getGroupsAssignedTeams: async (tournamentId) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Making API call to fetch assigned groups for teams.");
      console.log("Tournament ID:", tournamentId);

      // Make an API request to the backend
      const response = await axiosInstance.get(
        `/admin/tournaments/grouped/teams/7`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching assigned groups for teams:",
        error.response || error.message
      );
      throw error;
    }
  },

  scheduleTournamentMatches: async (tournamentId, matches) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Making API call to schedule tournament matches.");
      console.log("Tournament ID:", tournamentId);
      console.log("Matches:", matches);

      // Make an API request to the backend
      const response = await axiosInstance.post(
        `/admin/tournaments/schedule`,
        { tournamentId, matches }, // Pass the required parameters in the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error scheduling tournament matches:",
        error.response || error.message
      );
      throw error;
    }
  },
};

export default adminApi;
