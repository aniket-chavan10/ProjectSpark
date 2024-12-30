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
};

export default adminApi;
