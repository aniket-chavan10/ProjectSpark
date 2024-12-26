import axiosInstance from './axiosConfig';

const playersApi = {
  // Create a new player
  createPlayer: (playerData) => axiosInstance.post('/player', playerData),

  // Player login
  playerLogin: (loginData) => axiosInstance.post('/player/login', loginData),

  // Get all players
  getAllPlayers: () => axiosInstance.get('/player'),

  // Get a player by ID
  getPlayerById: (id) => axiosInstance.get(`/player/${id}`),

  // Update player details
  updatePlayer: (id, updatedData) => axiosInstance.put(`/player/${id}`, updatedData),

  // Delete a player
  deletePlayer: (id) => axiosInstance.delete(`/player/${id}`),
};

export default playersApi;
