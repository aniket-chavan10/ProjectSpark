import axiosInstance from "./axiosConfig";

const playersApi = {
  // Create a new player
  createPlayer: (formData) => {
    // Log the FormData (Note: you cannot log FormData directly, so you may have to inspect its contents differently)
    formData.forEach((value, key) => {
      console.log(key, value); // This will log the key-value pairs inside FormData
    });

    return axiosInstance.post("/admin/player", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Player login
  playerLogin: (loginData) => axiosInstance.post("/player/login", loginData),

  // Get all players
  getAllPlayers: () => axiosInstance.get("/admin/player"),

  // Get a player by ID
  getPlayerById: (id) => axiosInstance.get(`/admin/player/${id}`),

  // Update player details
  updatePlayer: (id, updatedData) =>
    axiosInstance.put(`/player/${id}`, updatedData),

  // Delete a player
  deletePlayer: (id) => axiosInstance.delete(`/admin/player/${id}`),
};

export default playersApi;
