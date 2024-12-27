import axiosInstance from "./axiosConfig";

const adminApi = {
  // Admin login

  loginAdmin: async (loginData) => {
    try {
      const response = await axiosInstance.post("/admin/login", loginData);
      console.log("API Response:", response); // Log the response from the backend
      return response;
    } catch (error) {
      console.error("Error during login request:", error);
      throw error; // Rethrow the error so it can be handled in the component
    }
  },

  // Get all admins and their teams
  getAllAdminsAndTeams: () => axiosInstance.get("/admin/profile"),

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
};

export default adminApi;
