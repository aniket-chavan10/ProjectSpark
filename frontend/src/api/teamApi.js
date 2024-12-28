import axiosInstance from "./axiosConfig";

const teamApi = {
  // Fetch all teams
  getAllTeams: async () => {
    try {
      const response = await axiosInstance.get("/team/all-teams");
      console.log("API Response (Get All Teams):", response.data);
      return response.data; // Return the teams data
    } catch (error) {
      console.error("Error fetching all teams:", error);
      throw error; // Rethrow the error to handle it in the component
    }
  },
};

export default teamApi;
