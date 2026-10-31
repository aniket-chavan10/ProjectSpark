// src/api/tournamentApi.js
import axiosInstance from "./axiosConfig";

const tournamentApi = {
  async getAllTentativeSchedules() {
    const res = await axiosInstance.get("/master/tournament/tentative-schedule");
    return res.data;
  },

  async createTentativeSchedule(payload) {
    const res = await axiosInstance.post("/master/tournament/tentative-schedule", payload);
    return res.data;
  },

   async getTournamentsByOrganizer() {
    try {
      const res = await axiosInstance.get("/tournament"); // GET /api/tournament
      return res.data;
    } catch (error) {
      console.error("Error fetching tournaments by organizer:", error);
      throw error;
    }
  },

   async createTournamentFromSchedule(payload) {
    try {
      const res = await axiosInstance.post("/tournament", payload, {
        headers: { "Content-Type": "multipart/form-data" }, 
      });
      return res.data;
    } catch (error) {
      console.error("Error creating tournament:", error);
      throw error;
    }
  },

   // Change the name or venue of a tournament you host
   async updateTournament(tournamentId, { name, venue }) {
    const res = await axiosInstance.put(`/tournament/${tournamentId}`, { name, venue });
    return res.data;
  },

   async getOpenTournaments() {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axiosInstance.get(`/admin/tournament/apply`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Open Tournaments API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching open tournaments:", error.response || error.message);
      return [];
    }
  },

   async applyForTournament({ tournament_id, team_id }) {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axiosInstance.post(
        "/admin/tournament/apply",
        { tournament_id, team_id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      // Propagate API or validation errors for UI display
      throw error.response?.data || { error: error.message };
    }
  },

async getAppliedTeams(tournamentId) {
  try {
    const token = localStorage.getItem("authToken");
    const res = await axiosInstance.get(
      `/tournament/tournaments/${tournamentId}/applied-teams`, // ✅ Dynamic ID
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Error fetching applied teams:", error);
    throw error.response?.data || { error: error.message };
  }
},
async assignTournamentGroups(tournamentId, assignments) {
  try {
    const res = await axiosInstance.post(
      `/tournament/tournaments/${tournamentId}/group`,
      { assignments }, // sending JSON payload
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data; // contains message + result
  } catch (error) {
    console.error("Error assigning tournament groups:", error);
    throw error;
  }
},
async getGroupsWithTeams(tournamentId) {
  try {
    const token = localStorage.getItem("authToken"); // get auth token from localStorage
    const res = await axiosInstance.get(
      `/tournament/${tournamentId}/groups-with-teams`, // ✅ new backend route
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data; // already in {group_name, teams[]} format
  } catch (error) {
    console.error("Error fetching groups with teams:", error);
    throw error.response?.data || { error: error.message };
  }
},
// ---- match scheduling (host) ----
  // Everything the schedule screen needs: days, groups, saved schedule, defaults
  async getSchedulePlan(tournamentId) {
    try {
      const res = await axiosInstance.get(`/tournament/tournaments/${tournamentId}/schedule-plan`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Auto-fill: lay all matches out on the days
  async previewSchedule(tournamentId, body) {
    try {
      const res = await axiosInstance.post(`/tournament/tournaments/${tournamentId}/schedule/preview`, body);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Check a hand-edited schedule without saving it
  async checkSchedule(tournamentId, body, signal) {
    try {
      const res = await axiosInstance.post(`/tournament/tournaments/${tournamentId}/schedule/check`, body, { signal });
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  async saveSchedule(tournamentId, body) {
    try {
      const res = await axiosInstance.post(`/tournament/tournaments/${tournamentId}/schedule`, body);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // 1st-4th place from the matches played so far
  async getStandings(tournamentId) {
    const res = await axiosInstance.get(`/tournament/tournaments/${tournamentId}/standings`);
    return res.data;
  },

  async getTournamentProgress(tournamentId) {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axiosInstance.get(
        `/tournament/tournaments/${tournamentId}/progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.progress;
    } catch (error) {
      console.error("Error fetching progress:", error);
      throw error.response?.data || { error: error.message };
    }
  },

  async updateTournamentProgress(tournamentId, updates) {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axiosInstance.post(
        `/tournament/tournaments/${tournamentId}/progress`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.progress;
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error.response?.data || { error: error.message };
    }
  },
   async getScheduledMatches(tournamentId) {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axiosInstance.get(
        `/tournament/tournaments/${tournamentId}/scheduled-matches`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data.matches; // array of matches
    } catch (error) {
      console.error("Error fetching scheduled matches:", error);
      throw error.response?.data || { error: error.message };
    }
  },




};

export default tournamentApi;
